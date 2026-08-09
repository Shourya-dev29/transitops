import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // ── Zod validation errors → 400 ──────────────────────────
  if (err instanceof ZodError) {
    const message = err.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    return res.status(400).json({ error: 'Validation failed', details: message });
  }

  // ── Prisma known request errors ──────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation → 409
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') ?? 'field';
      return res.status(409).json({
        error: `A record with that ${target} already exists`,
      });
    }
    // Record not found → 404
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
  }

  // ── Generic errors → 500 ─────────────────────────────────
  const message =
    err instanceof Error ? err.message : 'Internal server error';

  console.error('[ErrorHandler]', err);

  return res.status(500).json({ error: message });
}
