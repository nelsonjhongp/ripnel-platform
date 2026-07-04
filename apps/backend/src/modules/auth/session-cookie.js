const { env } = require('../../config/env');

const ACCESS_MAX_AGE = 60 * 15; // 15 minutes
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function buildSessionCookie({ token = '', clear = false, maxAge = ACCESS_MAX_AGE } = {}) {
  const isProd = env.nodeEnv === 'production';
  const parts = [
    `ripnel_session=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    clear ? 'Max-Age=0' : `Max-Age=${maxAge}`,
  ];

  if (clear) {
    parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }

  if (env.sessionCookieDomain) {
    parts.push(`Domain=${env.sessionCookieDomain}`);
  }

  if (isProd) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function buildRefreshCookie({ token = '', clear = false, maxAge = REFRESH_MAX_AGE } = {}) {
  const isProd = env.nodeEnv === 'production';
  const parts = [
    `ripnel_refresh=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    clear ? 'Max-Age=0' : `Max-Age=${maxAge}`,
  ];

  if (clear) {
    parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }

  if (env.sessionCookieDomain) {
    parts.push(`Domain=${env.sessionCookieDomain}`);
  }

  if (isProd) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

module.exports = {
  buildSessionCookie,
  buildRefreshCookie,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
};