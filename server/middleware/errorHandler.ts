import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const reqId =
    incoming && incoming.trim().length > 0 && incoming.length <= 64
      ? incoming.trim()
      : crypto.randomBytes(6).toString('hex');
  req.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    success: false,
    requestId: req.requestId,
    error: `Endpoint API tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
}

export function centralErrorHandler(
  err: Error & { status?: number; statusCode?: number; code?: string },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = err.status || err.statusCode || 500;
  const reqId = req.requestId || 'unknown';

  // Safe structured console log without leaking request headers or sensitive pins
  const sanitizedPath = `${req.method} ${req.path}`;
  console.error(
    `[RuangPintar Error] [req:${reqId}] [${status}] ${sanitizedPath}:`,
    err.message || err
  );

  res.status(status).json({
    ok: false,
    success: false,
    requestId: reqId,
    code: err.code || (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
    error: err.message || 'Terjadi kesalahan internal pada server Simpul Guru.',
  });
}
