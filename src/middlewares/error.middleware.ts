import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/response.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  console.error('🔥 Global Error Handler caught an error:', err);

  // Prisma unique constraint violation (e.g. duplicate email, unitNumber)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      return sendError(
        res,
        `A record with this ${target} already exists.`,
        409,
        'RESOURCE_CONFLICT',
        err.meta
      );
    }

    // Record to update/delete does not exist
    if (err.code === 'P2025') {
      return sendError(
        res,
        'The requested record was not found or has already been deleted.',
        404,
        'RESOURCE_NOT_FOUND',
        err.meta
      );
    }

    // Foreign key constraint failed
    if (err.code === 'P2003') {
      return sendError(
        res,
        'Related record not found or foreign key constraint violation.',
        400,
        'FOREIGN_KEY_VIOLATION',
        err.meta
      );
    }
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = err.message || 'An unexpected internal server error occurred';
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const details = env.NODE_ENV === 'development' ? err.stack : undefined;

  return sendError(res, message, statusCode, code, details);
}
