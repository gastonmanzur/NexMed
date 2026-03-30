import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors.js';
import { logger } from '../config/logger.js';

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestLogger = (_req as Request & { log?: { error: (payload: unknown, message?: string) => void } }).log;

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      requestLogger?.error(
        {
          code: error.code,
          statusCode: error.statusCode,
          path: _req.path,
          method: _req.method
        },
        'Application error'
      );
    }

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    requestLogger?.error(
      {
        path: _req.path,
        method: _req.method,
        issues: error.errors.map((issue) => ({ path: issue.path, message: issue.message }))
      },
      'Validation error'
    );

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors[0]?.message ?? 'Validation error'
      }
    });
    return;
  }

  requestLogger?.error(
    {
      err: error,
      path: _req.path,
      method: _req.method
    },
    'Unhandled error'
  );
  logger.error({ err: error }, 'Unhandled error outside request logger');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error'
    }
  });
};
