import { Response } from 'express';
import { ApiResponse, PaginatedResult } from '../types/index.js';

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'BAD_REQUEST',
  details?: unknown
): Response {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  return res.status(statusCode).json(payload);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  statusCode = 200
): Response {
  const pages = Math.ceil(total / limit) || 1;
  const result: PaginatedResult<T> = {
    items,
    pagination: {
      total,
      page,
      limit,
      pages,
    },
  };
  return res.status(statusCode).json({
    success: true,
    data: result,
  });
}
