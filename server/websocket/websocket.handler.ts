import type http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  decodeBinaryChunkPayload,
  type PeerNode,
} from '../../src/utils/edgeEngine.js';
import { classroomState } from '../state/classroomState.js';

interface ClientMeta {
  clientId: string;
  peerId: string;
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientMeta>();

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      try {
        const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
        if (url.pathname === '/ws') {
          this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
          });
        }
        // Do NOT destroy the socket for other paths (such as 'vite-hmr')
      } catch {
        // Ignore URL parse errors
      }
    });

    this.init();

    // Register broadcasters in classroomState
    classroomState.setBroadcaster(
      () => this.broadcastState(),
      (frame: Uint8Array) => this.broadcastBinary(frame)
    );
  }

  private init(): void {
    this.wss.on('connection', (ws) => {
      const clientId = `rtc-${Math.random().toString(36).slice(2, 9)}`;
      this.clients.set(ws, { clientId, peerId: 'peer-siswa-05' });

      // Send initial authoritative state
      ws.send(
        JSON.stringify({
          type: 'init',
          clientId,
          data: classroomState.getFullState(),
        })
      );

      // Notify other connected peer tabs to initiate WebRTC DataChannel handshake
      for (const [otherWs, meta] of this.clients.entries()) {
        if (otherWs !== ws && otherWs.readyState === WebSocket.OPEN) {
          otherWs.send(
            JSON.stringify({
              type: 'webrtc:peer-joined',
              remoteClientId: clientId,
            })
          );
        }
        if (otherWs !== ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'webrtc:existing-peer',
              remoteClientId: meta.clientId,
            })
          );
        }
      }

      ws.on('message', (raw, isBinary) => {
        try {
          // Handle binary ArrayBuffer / Buffer chunk frames
          if (isBinary) {
            const buf = Buffer.isBuffer(raw)
              ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
              : new Uint8Array(raw as ArrayBuffer);
            const decoded = decodeBinaryChunkPayload(buf);
            if (decoded && decoded.valid) {
              // Relay binary frame to other connected peer tabs
              for (const [targetWs] of this.clients.entries()) {
                if (targetWs !== ws && targetWs.readyState === WebSocket.OPEN) {
                  targetWs.send(buf, { binary: true });
                }
              }
            }
            return;
          }

          const msg = JSON.parse(String(raw));

          if (msg.type === 'peer:identify' && msg.peerId && msg.studentName) {
            const currentMeta = this.clients.get(ws);
            if (currentMeta) {
              currentMeta.peerId = String(msg.peerId);
            }
            const peers = classroomState.getPeers();
            const existingPeer = peers.find((p) => p.id === msg.peerId);
            if (existingPeer) {
              existingPeer.name = String(msg.studentName);
              if (
                msg.deviceType === 'Laptop Guru (Host Node)' ||
                msg.deviceType === 'Laptop Siswa' ||
                msg.deviceType === 'Ponsel Siswa' ||
                msg.deviceType === 'Smartphone Siswa (Android)'
              ) {
                existingPeer.deviceType = msg.deviceType;
              }
              existingPeer.rtcStatus = 'DataChannel Terhubung';
            } else {
              const newPeer: PeerNode = {
                id: String(msg.peerId),
                name: String(msg.studentName),
                deviceType:
                  msg.deviceType === 'Laptop Guru (Host Node)' || msg.deviceType === 'Laptop Siswa'
                    ? msg.deviceType
                    : 'Ponsel Siswa',
                role: 'PEER',
                localIp: '192.168.43.' + (100 + peers.length),
                rtcStatus: 'DataChannel Terhubung',
                latencyMs: 8,
                moduleChunks: {},
                uploadedMB: 0,
                downloadedMB: 0,
                activeConnections: 1,
              };
              peers.push(newPeer);
            }
            classroomState.savePeers();
            this.broadcastState();
          }

          // Relay WebRTC SDP offers, answers, ICE candidates, and chunk requests
          if (
            msg.type === 'webrtc:offer' ||
            msg.type === 'webrtc:answer' ||
            msg.type === 'webrtc:ice' ||
            msg.type === 'webrtc:chunk-request'
          ) {
            for (const [targetWs, meta] of this.clients.entries()) {
              if (meta.clientId === msg.targetClientId && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(
                  JSON.stringify({
                    ...msg,
                    fromClientId: this.clients.get(ws)?.clientId,
                  })
                );
              }
            }
          }
        } catch {
          // Ignore malformed WS frames
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }

  public broadcastState(): void {
    const payload = JSON.stringify({
      type: 'state:sync',
      data: classroomState.getFullState(),
    });
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public broadcastBinary(frame: Uint8Array): void {
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(frame, { binary: true });
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}
