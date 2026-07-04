const crypto = require('crypto');

function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecodeToString(input) {
  const normalized = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signHs256(unsignedToken, secret) {
  return base64UrlEncode(crypto.createHmac('sha256', secret).update(unsignedToken).digest());
}

function signJwt(payload, secret, { expiresInSeconds } = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    ...(expiresInSeconds ? { exp: now + expiresInSeconds } : {}),
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(fullPayload)
  )}`;
  const signature = signHs256(unsigned, secret);
  return `${unsigned}.${signature}`;
}

function verifyJwt(token, secret) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return { ok: false, reason: 'invalid_format' };

  const [headerB64, payloadB64, signature] = parts;
  const unsigned = `${headerB64}.${payloadB64}`;
  const expectedSig = signHs256(unsigned, secret);

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length) {
    return { ok: false, reason: 'invalid_signature' };
  }
  const sigOk = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  if (!sigOk) return { ok: false, reason: 'invalid_signature' };

  let payload;
  try {
    payload = JSON.parse(base64UrlDecodeToString(payloadB64));
  } catch {
    return { ok: false, reason: 'invalid_payload' };
  }

  if (payload && typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload };
}

function generateJti() {
  return crypto.randomUUID();
}

function generateOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest();
}

module.exports = {
  signJwt,
  verifyJwt,
  generateJti,
  generateOpaqueToken,
  hashToken,
};

