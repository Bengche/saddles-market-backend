const notFound = (req, res, next) => {
  const error = new Error(`Not found: ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error] ${statusCode} — ${err.message}`);
    console.error(err.stack);
  } else if (statusCode >= 500) {
    console.error(`[Error] ${statusCode} — ${err.message}`);
  }

  // Handle specific PostgreSQL errors
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists.',
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
    });
  }

  if (err.code === '22P02') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format.',
    });
  }

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later or contact support.'
        : err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
