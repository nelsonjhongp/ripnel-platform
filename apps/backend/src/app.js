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
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const transfersRoutes = require('./modules/transfers/transfers.routes');
const usersRoutes = require('./modules/users/users.routes');
const customersRoutes = require('./modules/customers/customers.routes');
const authRoutes = require('./modules/auth/auth.routes');


const {
  errorHandler,
  notFoundHandler,
} = require('./middlewares/error-handler');

function normalizeOrigin(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch (error) {
    return String(value).replace(/\/+$/, '');
  }
}

const app = express();
const allowedOrigins = new Set();
const configuredFrontendOrigin = normalizeOrigin(env.frontendUrl);

if (configuredFrontendOrigin) {
  allowedOrigins.add(configuredFrontendOrigin);
}

try {
  const frontendUrl = new URL(configuredFrontendOrigin || env.frontendUrl);

  if (frontendUrl.hostname === 'localhost') {
    frontendUrl.hostname = '127.0.0.1';
    allowedOrigins.add(frontendUrl.origin);
  }

  if (frontendUrl.hostname === '127.0.0.1') {
    frontendUrl.hostname = 'localhost';
    allowedOrigins.add(frontendUrl.origin);
  }
} catch (error) {
  console.warn('Invalid FRONTEND_URL value for CORS allowlist.');
}

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!origin || (normalizedOrigin && allowedOrigins.has(normalizedOrigin))) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin not allowed'));
    },
  })
);
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api', catalogsRoutes);
app.use('/api/styles', stylesRoutes);
app.use('/api/variants', variantsRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;