import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Prisma known errors
  if (err.code === 'P2002') {
    error = ApiError.conflict('A record with this value already exists', err.meta);
  } else if (err.code === 'P2025') {
    error = ApiError.notFound('Record not found');
  } else if (err.code === 'P2003') {
    error = ApiError.badRequest('Foreign key constraint failed', err.meta);
  }

  if (!(error instanceof ApiError)) {
    error = ApiError.internal(
      env.nodeEnv === 'production' ? 'Internal server error' : err.message
    );
  }

  if (error.status >= 500) logger.error(err);

  res.status(error.status).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(env.nodeEnv === 'development' ? { stack: err.stack } : {})
  });
};