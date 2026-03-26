class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode || 500;
  }
}

module.exports = {
  AppError,
};
