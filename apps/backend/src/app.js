const os = require('os');
const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const authRoutes = require('./modules/auth/auth.routes');
const healthRoutes = require('./modules/health/health.routes');
const rolesRoutes = require('./modules/roles/roles.routes');
const locationsRoutes = require('./modules/locations/locations.routes');
const catalogsRoutes = require('./modules/catalogs/catalogs.routes');
const stylesRoutes = require('./modules/styles/styles.routes');
const variantsRoutes = require('./modules/variants/variants.routes');
const pricesRoutes = require('./modules/prices/prices.routes');
const pricingRulesRoutes = require('./modules/prices/pricing-rules.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const transfersRoutes = require('./modules/transfers/transfers.routes');
const usersRoutes = require('./modules/users/users.routes');
const customersRoutes = require('./modules/customers/customers.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const postsalesRoutes = require('./modules/postsales/postsales.routes');
const cashRoutes = require('./modules/cash/cash.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const homeRoutes = require('./modules/home/home.routes');
const productsRoutes = require('./modules/products/products.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
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

function collectLocalFrontendOrigins(baseOrigin) {
  const origins = new Set();

  if (!baseOrigin) {
    return origins;
  }

  try {
    const frontendUrl = new URL(baseOrigin);
    const localHosts = new Set(['localhost', '127.0.0.1']);

    for (const networkInterface of Object.values(os.networkInterfaces())) {
      for (const address of networkInterface || []) {
        if (address.family === 'IPv4' && !address.internal) {
          localHosts.add(address.address);
        }
      }
    }

    for (const hostname of localHosts) {
      frontendUrl.hostname = hostname;
      origins.add(frontendUrl.origin);
    }
  } catch (error) {
    console.warn('Invalid FRONTEND_URL value for CORS allowlist.');
  }

  return origins;
}

function isPrivateIpv4(hostname) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname || '')) {
    return false;
  }

  const [a, b] = hostname.split('.').map(Number);

  return (
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

function isAllowedDevOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
    if (isPrivateIpv4(hostname)) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

function isLocalRequest(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
  } catch {
    return false;
  }
}

const app = express();
const allowedOrigins = new Set();
const configuredFrontendOrigin = normalizeOrigin(env.frontendUrl);

// Also load explicit allowed origins from env (comma-separated).
// Supports plain origins (https://foo.com) and wildcard host patterns like "*.vercel.app".
const wildcardHostPatterns = [];
const rawAllowedFromEnv = process.env.ALLOWED_ORIGINS || '';
if (rawAllowedFromEnv) {
  for (const part of rawAllowedFromEnv.split(',')) {
    const trimmed = String(part || '').trim();
    if (!trimmed) continue;

    if (trimmed.includes('*')) {
      // store hostname pattern for wildcard matching
      wildcardHostPatterns.push(trimmed.replace(/^\*\./, '').toLowerCase());
      continue;
    }

    const normalized = normalizeOrigin(trimmed);
    if (normalized) allowedOrigins.add(normalized);
  }
}

if (configuredFrontendOrigin) {
  for (const origin of collectLocalFrontendOrigins(configuredFrontendOrigin)) {
    allowedOrigins.add(origin);
  }
}

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!origin) return callback(null, true);

      const isAllowedExplicit = normalizedOrigin && allowedOrigins.has(normalizedOrigin);
      const isAllowedDev = env.nodeEnv !== 'production' && normalizedOrigin && isAllowedDevOrigin(normalizedOrigin);
      const isAllowedWildcard = (() => {
        if (!normalizedOrigin) return false;
        try {
          const u = new URL(normalizedOrigin);
          const host = u.hostname.toLowerCase();
          return wildcardHostPatterns.some((pattern) => host === pattern || host.endsWith('.' + pattern));
        } catch (e) {
          return false;
        }
      })();

      if (isAllowedExplicit || isAllowedDev || isAllowedWildcard) {
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
app.use('/api/pricing-rules', pricingRulesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/postsales', postsalesRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
