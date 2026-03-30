const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const healthRoutes = require('./modules/health/health.routes');
const rolesRoutes = require('./modules/roles/roles.routes');
const locationsRoutes = require('./modules/locations/locations.routes');
const catalogsRoutes = require('./modules/catalogs/catalogs.routes');
const stylesRoutes = require('./modules/styles/styles.routes');
const variantsRoutes = require('./modules/variants/variants.routes');
const pricesRoutes = require('./modules/prices/prices.routes');
const pricingRulesRoutes = require('./modules/prices/pricing-rules.routes');
const customersRoutes = require('./modules/customers/customers.routes');
const {
  errorHandler,
  notFoundHandler,
} = require('./middlewares/error-handler');

const app = express();
const allowedOrigins = new Set([env.frontendUrl]);

try {
  const frontendUrl = new URL(env.frontendUrl);

  if (frontendUrl.hostname === 'localhost') {
    allowedOrigins.add(env.frontendUrl.replace('localhost', '127.0.0.1'));
  }

  if (frontendUrl.hostname === '127.0.0.1') {
    allowedOrigins.add(env.frontendUrl.replace('127.0.0.1', 'localhost'));
  }
} catch (error) {
  console.warn('Invalid FRONTEND_URL value for CORS allowlist.');
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin not allowed'));
    },
  })
);
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api', catalogsRoutes);
app.use('/api/styles', stylesRoutes);
app.use('/api/variants', variantsRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/pricing-rules', pricingRulesRoutes);
app.use('/api/customers', customersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
