import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || undefined;

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = `File size exceeds maximum allowed limit (${Math.round(env.maxUploadSizeBytes / (1024 * 1024))}MB).`;
  }

  if (err.code === '23505') {
    statusCode = 409;
    message = 'A record with this unique value already exists.';
  }

  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced record does not exist or violates referential integrity.';
  }

  if (err.code === '23514') {
    statusCode = 400;
    message = 'Input violates database integrity constraints.';
  }

  if (statusCode >= 500 && env.nodeEnv === 'production') {
    message = 'An unexpected internal error occurred.';
    details = undefined;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.nodeEnv === 'development' && statusCode >= 500 ? { stack: err.stack } : {})
  });
}

