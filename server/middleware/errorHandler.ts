import type { Request, Response, NextFunction } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: `Endpoint API tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
}

export function centralErrorHandler(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = err.status || err.statusCode || 500;
  
  // Safe console log without leaking request headers or sensitive pins
  const sanitizedPath = `${req.method} ${req.path}`;
  console.error(`[RuangPintar Error] [${status}] ${sanitizedPath}:`, err.message || err);

  res.status(status).json({
    ok: false,
    error: err.message || 'Terjadi kesalahan internal pada server Simpul Guru.',
  });
}
