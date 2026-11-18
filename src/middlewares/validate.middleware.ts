import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          issue: issue.message,
        }));
        return sendError(res, 'Request validation failed', 400, 'VALIDATION_ERROR', issues);
      }
      return sendError(res, 'Malformed request body', 400, 'MALFORMED_INPUT');
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as any;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          issue: issue.message,
        }));
        return sendError(res, 'Invalid query parameters', 400, 'VALIDATION_ERROR', issues);
      }
      return sendError(res, 'Malformed query parameters', 400, 'MALFORMED_QUERY');
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      req.params = (await schema.parseAsync(req.params)) as any;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          issue: issue.message,
        }));
        return sendError(res, 'Invalid route parameters', 400, 'VALIDATION_ERROR', issues);
      }
      return sendError(res, 'Malformed route parameters', 400, 'MALFORMED_PARAMS');
    }
  };
}
