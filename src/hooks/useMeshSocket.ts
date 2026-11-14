import { useEffect, useRef, useCallback, useState } from 'react';
import {
  decodeBinaryChunkPayload,
} from '../utils/edgeEngine';
import {
  saveBinaryChunkRecord,
  loadClientDownloadedChunks,
  saveCustomHostUrl,
  loadCustomHostUrl,
} from '../utils/clientStorage';
import { apiFetch, safeParseJson } from '../utils/apiClient';
import {
  useMeshNetwork,
  STUDENT_PEER_ID,
} from '../context/MeshNetworkContext';

export function parseHostAddress(input: string): { httpBaseUrl: string; wsUrl: string; hostWithPort: string } {
  let clean = input.trim();
  clean = clean.replace(/^https?:\/\//i, '');
  clean = clean.replace(/\/.*$/, ''); // strip paths
  if (!clean.includes(':')) {
    const defaultPort = (typeof window !== 'undefined' && window.location.port) ? window.location.port : '3000';
    clean = `${clean}:${defaultPort}`;
  }
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const httpScheme = isHttps ? 'https:' : 'http:';
  const wsScheme = isHttps ? 'wss:' : 'ws:';
  return {
    httpBaseUrl: `${httpScheme}//${clean}`,
    wsUrl: `${wsScheme}//${clean}/ws`,
    hostWithPort: clean,
  };
}

export function useMeshSocket() {
  const {
    studentProfile,
    isOfflineActive,
    gatewayTetheringOnline,
    socketConnected,
    setSocketConnected,
    applyServerState,
    setPeers,
    setActiveWebRtcChannelsCount,
    setLastBinaryPacketInfo,
    setStatusBanner,
    setSimulatedOfflineMode,
    setCustomHostUrl,
  } = useMeshNetwork();

  const [activeHost, setActiveHost] = useState<string>(() => {
    const saved = loadCustomHostUrl();
    if (saved) {
      return parseHostAddress(saved).hostWithPort;
    }
    return typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  });
  const [reconnectNonce, setReconnectNonce] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const rtcPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const backoffRef = useRef<number>(1000);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);

  // Refs prevent WebSocket/WebRTC teardown when profile or tethering state changes
  const studentProfileRef = useRef(studentProfile);
  studentProfileRef.current = studentProfile;
  const isOfflineActiveRef = useRef(isOfflineActive);
  isOfflineActiveRef.current = isOfflineActive;
  const gatewayTetheringRef = useRef(gatewayTetheringOnline);
  gatewayTetheringRef.current = gatewayTetheringOnline;

  const forceReconnect = useCallback(() => {
    backoffRef.current = 1000;
    setReconnectNonce((n) => n + 1);
  }, []);

  const reconnectToHost = useCallback(
    async (newHostUrl: string): Promise<boolean> => {
      try {
        const parsed = parseHostAddress(newHostUrl);
        saveCustomHostUrl(parsed.httpBaseUrl);
        setCustomHostUrl(parsed.httpBaseUrl);
        setSimulatedOfflineMode(false);
        setActiveHost(parsed.hostWithPort);
        setReconnectNonce((n) => n + 1);

        if (wsRef.current) {
          try {
            wsRef.current.close();
          } catch {
            // Ignore close error
          }
        }

        try {
          const res = await apiFetch('/api/state', undefined, parsed.httpBaseUrl);
          if (res.ok) {
            const data = await safeParseJson(res);
            if (data && Object.keys(data).length > 0) {
              applyServerState(data);
            }
          }
        } catch {
          try {
            const res = await fetch('/api/state');
            if (res.ok) {
              const data = await safeParseJson(res);
              if (data) applyServerState(data);
            }
          } catch {
            // Suppress fallback error
          }
        }

        setStatusBanner(`Berhasil terhubung ke Laptop Guru! (${parsed.hostWithPort})`);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Format URL simpul guru tidak valid';
        setStatusBanner(`Gagal menghubungkan ke simpul guru: ${msg}`);
        return false;
      }
    },
    [applyServerState, setCustomHostUrl, setSimulatedOfflineMode, setStatusBanner]
  );

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

  // Send updated student identity over active WebSocket without reconnecting
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'peer:identify',
          peerId: studentProfile.peerId,
          studentName: studentProfile.studentName,
          avatar: studentProfile.avatar,
          deviceType: 'Smartphone Siswa (Android)',
        })
      );
    }
  }, [studentProfile]);

  // Initialize IndexedDB cached chunks and WebSocket connection lifecycle
  useEffect(() => {
    let mounted = true;
    const parsedHost = parseHostAddress(activeHost);
    const activePeerId = studentProfileRef.current.peerId || STUDENT_PEER_ID;

    async function initClientStorage() {
      const savedChunks = await loadClientDownloadedChunks(activePeerId);
      if (savedChunks && mounted) {
        setPeers((prev) =>
          prev.map((p) =>
            p.id === activePeerId
              ? { ...p, moduleChunks: { ...p.moduleChunks, ...savedChunks } }
              : p
          )
        );
      }

      try {
        const r = await apiFetch('/api/state', undefined, parsedHost.httpBaseUrl);
        if (r.ok) {
          const data = await safeParseJson(r);
          if (mounted && data && Object.keys(data).length > 0) {
            applyServerState(data);
          }
        }

        if (savedChunks && Object.keys(savedChunks).length > 0) {
          const syncRes = await apiFetch(
            '/api/p2p/sync-client-chunks',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                peerId: activePeerId,
                moduleChunks: savedChunks,
              }),
            },
            parsedHost.httpBaseUrl
          );
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

    const wsUrl = parsedHost.wsUrl;

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

          const profile = studentProfileRef.current;
          ws.send(
            JSON.stringify({
              type: 'peer:identify',
              peerId: profile.peerId,
              studentName: profile.studentName,
              avatar: profile.avatar,
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
          const useStun = !isOfflineActiveRef.current && gatewayTetheringRef.current;
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
    activeHost,
    reconnectNonce,
    applyServerState,
    handleIncomingBinaryChunk,
    setActiveWebRtcChannelsCount,
    setPeers,
    setSocketConnected,
  ]);

  return {
    socketConnected,
    transmitBinaryViaWebRtcDataChannel,
    handleIncomingBinaryChunk,
    reconnectToHost,
    forceReconnect,
    activeHost,
  };
}
