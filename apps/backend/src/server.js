const app = require('./app');
const { env } = require('./config/env');
const {
  SchemaCompatibilityError,
  assertCashSchemaCompatibility,
} = require('./modules/cash/cash-schema');

async function startServer() {
  try {
    await assertCashSchemaCompatibility();

    app.listen(env.port, () => {
      console.log(`Backend listening on port ${env.port}`);
    });
  } catch (error) {
    if (error instanceof SchemaCompatibilityError) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

startServer();
