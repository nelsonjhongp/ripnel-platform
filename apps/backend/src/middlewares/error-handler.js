function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    message: 'Route not found',
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    ok: false,
    message: statusCode >= 500 ? 'Internal server error' : err.message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
