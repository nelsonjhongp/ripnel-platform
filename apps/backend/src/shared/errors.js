class AppError extends Error {
  constructor(message, statusCode, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode || 500;
    this.code = options.code || null;
    this.details = options.details || null;
  }
}

module.exports = {
  AppError,
};
