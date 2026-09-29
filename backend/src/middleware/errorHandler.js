const { ZodError } = require('zod');

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function errorHandler(err, req, res, _next) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const issues = err.issues || err.errors || [];
    const formattedErrors = issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formattedErrors,
      },
    });
  }

  // Handle custom AppErrors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        details: err.details || undefined,
      },
    });
  }

  // Default server error
  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
}

module.exports = {
  AppError,
  errorHandler,
};
