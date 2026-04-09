function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    message: 'Route not found',
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || null;

  if (statusCode >= 500) {
    console.error(err);
  }

  const payload = {
    ok: false,
    message: statusCode >= 500 ? 'Internal server error' : err.message,
  };

  if (code && statusCode < 500) {
    payload.code = code;
  }

  if (err.details && statusCode < 500) {
    payload.details = err.details;
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
