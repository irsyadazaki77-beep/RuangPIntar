import { useEffect, useRef, useCallback, useState } from 'react';
import {
  decodeBinaryChunkPayload,
} from '../utils/edgeEngine';
import {
  saveBinaryChunkRecord,
  loadClientDownloadedChunks,
} from '../utils/clientStorage';
import {
  useMeshNetwork,
  STUDENT_PEER_ID,
} from '../context/MeshNetworkContext';

async function safeParseJson(res: Response): Promise<Record<string, any>> {
  try {
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      return {};
    }
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function useMeshSocket() {
  const {
    studentProfile,
    isOfflineActive,
    gatewayTetheringOnline,
    applyServerState,
    setPeers,
    setActiveWebRtcChannelsCount,
    setLastBinaryPacketInfo,
  } = useMeshNetwork();

  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const rtcPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const backoffRef = useRef<number>(1000);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);

  /**
   * Processes an incoming raw binary frame received over WebSocket or RTCDataChannel
   */
  const handleIncomingBinaryChunk = useCallback(
    (buffer: ArrayBuffer | Uint8Array) => {
      const decoded = decodeBinaryChunkPayload(buffer);
      if (!decoded || !decoded.valid) return;

      void saveBinaryChunkRecord({
        key: `${decoded.moduleId}:${decoded.chunkIndex}`,
        moduleId: decoded.moduleId,
        chunkIndex: decoded.chunkIndex,
        chunkHash: decoded.chunkHash,
        fromPeerId: decoded.fromPeerId,
        byteLength: decoded.byteLength,
        payloadText: decoded.contentPayload,
        savedAt: Date.now(),
      });

      setLastBinaryPacketInfo(
        `Frame Biner RPE1 [${decoded.moduleCode} #${decoded.chunkIndex}] (${decoded.byteLength} B ArrayBuffer via RTCDataChannel)`
      );
    },
    [setLastBinaryPacketInfo]
  );

  /**
   * Transmits binary Uint8Array frame via RTCDataChannel (or loopback pair if single node)
   */
  const transmitBinaryViaWebRtcDataChannel = useCallback(
    async (frame: Uint8Array): Promise<void> => {
      let sentOverRemotePeer = false;
      for (const dc of dataChannelsRef.current.values()) {
        if (dc.readyState === 'open') {
          try {
            dc.binaryType = 'arraybuffer';
            dc.send(frame.buffer as ArrayBuffer);
            sentOverRemotePeer = true;
          } catch {
            // Fall through to loopback
          }
        }
      }

      if (sentOverRemotePeer) {
        handleIncomingBinaryChunk(frame);
        return;
      }

      if (typeof RTCPeerConnection === 'undefined') {
        handleIncomingBinaryChunk(frame);
        return;
      }

      await new Promise<void>((resolve) => {
        const pcSender = new RTCPeerConnection();
        const pcReceiver = new RTCPeerConnection();
        let settled = false;

        const finish = () => {
          if (settled) return;
          settled = true;
          try {
            pcSender.close();
            pcReceiver.close();
          } catch {
            // Ignore close errors
          }
          resolve();
        };

        const timeoutId = window.setTimeout(() => {
          handleIncomingBinaryChunk(frame);
          finish();
        }, 600);

        pcSender.onicecandidate = (e) => {
          if (e.candidate) void pcReceiver.addIceCandidate(e.candidate).catch(() => {});
        };
        pcReceiver.onicecandidate = (e) => {
          if (e.candidate) void pcSender.addIceCandidate(e.candidate).catch(() => {});
        };

        pcReceiver.ondatachannel = (ev) => {
          const rxChannel = ev.channel;
          rxChannel.binaryType = 'arraybuffer';
          rxChannel.onmessage = (msgEv) => {
            window.clearTimeout(timeoutId);
            if (msgEv.data instanceof ArrayBuffer || msgEv.data instanceof Uint8Array) {
              handleIncomingBinaryChunk(msgEv.data);
            }
            finish();
          };
        };

        const txChannel = pcSender.createDataChannel('ruangpintar-binary-chunk');
        txChannel.binaryType = 'arraybuffer';
        txChannel.onopen = () => {
          try {
            txChannel.send(frame.buffer as ArrayBuffer);
          } catch {
            handleIncomingBinaryChunk(frame);
            finish();
          }
        };

        pcSender
          .createOffer()
          .then((offer) => pcSender.setLocalDescription(offer))
          .then(() => {
            if (pcSender.localDescription) {
              return pcReceiver.setRemoteDescription(pcSender.localDescription);
            }
          })
          .then(() => pcReceiver.createAnswer())
          .then((answer) => pcReceiver.setLocalDescription(answer))
          .then(() => {
            if (pcReceiver.localDescription) {
              return pcSender.setRemoteDescription(pcReceiver.localDescription);
            }
          })
          .catch(() => {
            window.clearTimeout(timeoutId);
            handleIncomingBinaryChunk(frame);
            finish();
          });
      });
    },
    [handleIncomingBinaryChunk]
  );

  // Initialize IndexedDB cached chunks and WebSocket connection lifecycle
  useEffect(() => {
    let mounted = true;

    async function initClientStorage() {
      const savedChunks = await loadClientDownloadedChunks(STUDENT_PEER_ID);
      if (savedChunks && mounted) {
        setPeers((prev) =>
          prev.map((p) =>
            p.id === STUDENT_PEER_ID
              ? { ...p, moduleChunks: { ...p.moduleChunks, ...savedChunks } }
              : p
          )
        );
      }

      try {
        const r = await fetch('/api/state');
        if (r.ok) {
          const data = await safeParseJson(r);
          if (mounted && data && Object.keys(data).length > 0) {
            applyServerState(data);
          }
        }

        if (savedChunks && Object.keys(savedChunks).length > 0) {
          const syncRes = await fetch('/api/p2p/sync-client-chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              peerId: STUDENT_PEER_ID,
              moduleChunks: savedChunks,
            }),
          });
          if (syncRes.ok) {
            const syncData = await safeParseJson(syncRes);
            if (mounted && syncData?.state) {
              applyServerState(syncData.state);
            }
          }
        }
      } catch {
        // Offline mode: IndexedDB + seed data active
      }
    }

    void initClientStorage();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWebSocket = () => {
      if (!mounted) return;

      try {
        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;
          setSocketConnected(true);
          backoffRef.current = 1000; // Reset exponential backoff on successful connect

          ws.send(
            JSON.stringify({
              type: 'peer:identify',
              peerId: studentProfile.peerId,
              studentName: studentProfile.studentName,
              avatar: studentProfile.avatar,
              deviceType: 'Smartphone Siswa (Android)',
            })
          );
        };

        ws.onclose = () => {
          if (!mounted) return;
          setSocketConnected(false);
          // Exponential backoff with jitter up to 10s
          const jitter = Math.floor(Math.random() * 500);
          const nextWait = Math.min(10000, backoffRef.current * 1.5 + jitter);
          backoffRef.current = nextWait;

          reconnectTimeoutRef.current = window.setTimeout(connectWebSocket, nextWait);
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {
            // Ignore close error
          }
        };

        const setupDataChannel = (remoteClientId: string, dc: RTCDataChannel) => {
          dc.binaryType = 'arraybuffer';
          dataChannelsRef.current.set(remoteClientId, dc);

          dc.onopen = () => {
            if (mounted) {
              setActiveWebRtcChannelsCount(5 + rtcPeersRef.current.size);
            }
          };

          dc.onmessage = (ev) => {
            if (ev.data instanceof ArrayBuffer || ev.data instanceof Uint8Array) {
              handleIncomingBinaryChunk(ev.data);
            } else if (ev.data instanceof Blob) {
              void ev.data.arrayBuffer().then((ab) => handleIncomingBinaryChunk(ab));
            }
          };

          dc.onclose = () => {
            dataChannelsRef.current.delete(remoteClientId);
          };
        };

        const createPeerConnection = (remoteClientId: string, initiator: boolean) => {
          if (typeof RTCPeerConnection === 'undefined') return null;
          if (rtcPeersRef.current.has(remoteClientId)) {
            return rtcPeersRef.current.get(remoteClientId)!;
          }

          // In 3T environments without public internet, omit STUN to avoid 10s DNS lookup delays
          const useStun = !isOfflineActive && gatewayTetheringOnline;
          const pc = new RTCPeerConnection({
            iceServers: useStun ? [{ urls: 'stun:stun.l.google.com:19302' }] : [],
          });
          rtcPeersRef.current.set(remoteClientId, pc);

          pc.onicecandidate = (ev) => {
            if (ev.candidate && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: 'webrtc:ice',
                  targetClientId: remoteClientId,
                  candidate: ev.candidate,
                })
              );
            }
          };

          if (initiator) {
            const dc = pc.createDataChannel('ruangpintar-chunks');
            setupDataChannel(remoteClientId, dc);

            pc.createOffer()
              .then((offer) => pc.setLocalDescription(offer))
              .then(() => {
                if (ws.readyState === WebSocket.OPEN && pc.localDescription) {
                  ws.send(
                    JSON.stringify({
                      type: 'webrtc:offer',
                      targetClientId: remoteClientId,
                      sdp: pc.localDescription,
                    })
                  );
                }
              })
              .catch(() => {});
          } else {
            pc.ondatachannel = (ev) => {
              setupDataChannel(remoteClientId, ev.channel);
            };
          }

          return pc;
        };

        ws.onmessage = async (event) => {
          try {
            if (event.data instanceof ArrayBuffer) {
              handleIncomingBinaryChunk(event.data);
              return;
            }

            const msg = JSON.parse(String(event.data));
            if (msg.type === 'init' || msg.type === 'state:sync') {
              if (mounted && msg.data) applyServerState(msg.data);
            } else if (msg.type === 'webrtc:peer-joined') {
              createPeerConnection(msg.remoteClientId, true);
            } else if (msg.type === 'webrtc:offer' && msg.fromClientId) {
              const pc = createPeerConnection(msg.fromClientId, false);
              if (pc && msg.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if (ws.readyState === WebSocket.OPEN && pc.localDescription) {
                  ws.send(
                    JSON.stringify({
                      type: 'webrtc:answer',
                      targetClientId: msg.fromClientId,
                      sdp: pc.localDescription,
                    })
                  );
                }
              }
            } else if (msg.type === 'webrtc:answer' && msg.fromClientId) {
              const pc = rtcPeersRef.current.get(msg.fromClientId);
              if (pc && msg.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              }
            } else if (msg.type === 'webrtc:ice' && msg.fromClientId) {
              const pc = rtcPeersRef.current.get(msg.fromClientId);
              if (pc && msg.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
              }
            }
          } catch {
            // Ignore malformed WS messages
          }
        };
      } catch {
        // Fallback gracefully
      }
    };

    connectWebSocket();

    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
      for (const dc of dataChannelsRef.current.values()) {
        dc.close();
      }
      dataChannelsRef.current.clear();
      for (const pc of rtcPeersRef.current.values()) {
        pc.close();
      }
      rtcPeersRef.current.clear();
    };
  }, [
    applyServerState,
    gatewayTetheringOnline,
    handleIncomingBinaryChunk,
    isOfflineActive,
    setActiveWebRtcChannelsCount,
    setPeers,
    studentProfile,
  ]);

  return {
    socketConnected,
    transmitBinaryViaWebRtcDataChannel,
    handleIncomingBinaryChunk,
  };
}
