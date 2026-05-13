const { env } = require('../../config/env');

function buildSessionCookie({ token = '', clear = false } = {}) {
  const isProd = env.nodeEnv === 'production';
  const parts = [
    `ripnel_session=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    clear ? 'Max-Age=0' : `Max-Age=${60 * 60 * 8}`,
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
};
