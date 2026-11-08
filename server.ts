import http from 'http';
import { config } from './server/config/env.js';
import { createApp } from './server/app.js';
import { WebSocketHandler } from './server/websocket/websocket.handler.js';
import { startMdnsDiscovery } from './server/discovery/mdns.js';
import { closeDatabase } from './server/db/index.js';

async function startServer(): Promise<void> {
  const server = http.createServer();
  
  // Initialize WebSocket signaling and state sync
  new WebSocketHandler(server);

  // Mount Express app with Vite / static middlewares
  const app = await createApp(server);
  server.on('request', app);

  const PORT = config.port;
  const HOST = config.host;

  server.listen(PORT, HOST, () => {
    console.log(`\n================================================================`);
    console.log(`  RUANGPINTAR EDGE — SIMPUL SERVER GURU (OFFLINE-FIRST 3T)     `);
    console.log(`================================================================`);
    console.log(`  * Local Port       : http://${HOST}:${PORT}`);
    console.log(`  * Zero-Config mDNS : http://${config.mdnsHost}:${PORT}`);
    console.log(`  * WebSockets & P2P : ws://${HOST}:${PORT}/ws`);
    console.log(`================================================================\n`);
  });

  // Start mDNS/Bonjour zero-config discovery
  const mdns = startMdnsDiscovery(PORT);

  // Graceful shutdown handling
  let isShuttingDown = false;
  const handleGracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[RuangPintar Edge] Sinyal ${signal} diterima. Menghentikan layanan secara aman...`);

    mdns.stop();
    closeDatabase();

    server.close(() => {
      console.log('[RuangPintar Edge] Server HTTP, mDNS, dan database SQLite berhasil ditutup bersih.');
      process.exit(0);
    });

    setTimeout(() => {
      console.warn('[RuangPintar Edge] Memaksa terminasi setelah timeout graceful shutdown.');
      process.exit(0);
    }, 2000).unref();
  };

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
}

void startServer();
