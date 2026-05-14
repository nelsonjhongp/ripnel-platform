const { AppError } = require('../shared/errors');

function validate(schema, source = 'body') {
  return function validateMiddleware(req, _res, next) {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      return next(
        new AppError('Validation failed', 400, {
          code: 'VALIDATION_ERROR',
          details,
        })
      );
    }

    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
