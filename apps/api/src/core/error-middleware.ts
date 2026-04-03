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

  const statusCode =
    typeof error === 'object' && error !== null && 'statusCode' in error && typeof (error as { statusCode: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : typeof error === 'object' && error !== null && 'status' in error && typeof (error as { status: unknown }).status === 'number'
        ? (error as { status: number }).status
        : null;

  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code: unknown }).code === 'string'
      ? (error as { code: string }).code
      : null;

  if (statusCode === 404 || errorCode === 'ENOENT') {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found'
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
