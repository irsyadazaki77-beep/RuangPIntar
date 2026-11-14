import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodType } from 'zod';

declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown;
    }
  }
}

/**
 * Generic Zod request body validation middleware.
 * Parses req.body against the provided Zod schema, stores the parsed data
 * in req.validatedBody (and updates req.body), or returns HTTP 400 Bad Request
 * with standardized field errors on failure.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        ok: false,
        error: 'Validation Error',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    req.validatedBody = result.data;
    req.body = result.data;
    next();
  };
}
