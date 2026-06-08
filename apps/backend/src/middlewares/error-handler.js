function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    message: 'Route not found',
  });
}

function errorHandler(err, req, res, next) {
  const isCorsOriginError = err?.message === 'CORS origin not allowed';
  const statusCode = err.statusCode || err.status || (isCorsOriginError ? 403 : 500);
  const code = err.code || (isCorsOriginError ? 'CORS_ORIGIN_DENIED' : null);

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
