import express, { type Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import type http from 'http';
import { authRouter } from './routes/auth.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, centralErrorHandler } from './middleware/errorHandler.js';
import { SECURITY_CONSTANTS } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export async function createApp(
  httpServer?: http.Server,
  options: { skipVite?: boolean } = {}
): Promise<Express> {
  const app = express();

  // Basic security and parsing
  app.use(express.json({ limit: SECURITY_CONSTANTS.MAX_REQUEST_BODY_SIZE }));

  // Apply general rate limiter to /api routes
  app.use('/api', generalApiLimiter);

  // Mount modular route groups
  app.use('/api/auth', authRouter);
  app.use('/api/host', authRouter);
  app.use('/api/tutor', aiRouter);
  app.use('/api/cache', aiRouter);
  app.use('/api', syncRouter);

  // Catch-all for unmatched /api/* requests so they return standard JSON
  app.all('/api/*', notFoundHandler);

  const shouldMountVite =
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test' &&
    !options.skipVite &&
    Boolean(httpServer);

  // Dev vs Prod asset serving
  if (shouldMountVite && httpServer) {
    // Serve clean no-op for stale service workers in dev mode
    app.get(['/dev-sw.js', '/sw.js', '/registerSW.js', '/dev-dist/*'], (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(
        'if (typeof self !== "undefined" && self.registration) { self.registration.unregister(); }\n'
      );
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(projectRoot, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Central error handling middleware
  app.use(centralErrorHandler);

  return app;
}
