const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  signJwt,
  verifyJwt,
  generateJti,
  generateOpaqueToken,
  hashToken,
} = require('../shared/jwt');

const SECRET = 'test-secret-please-do-not-use-in-prod';

describe('shared/jwt', () => {
  describe('signJwt / verifyJwt', () => {
    it('round-trips a payload with jti claim', () => {
      const token = signJwt({ sub: 'u1', jti: 'abc' }, SECRET, {
        expiresInSeconds: 60,
      });
      const result = verifyJwt(token, SECRET);
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.payload.sub, 'u1');
      assert.strictEqual(result.payload.jti, 'abc');
      assert.strictEqual(typeof result.payload.exp, 'number');
      assert.strictEqual(typeof result.payload.iat, 'number');
    });

    it('rejects a token signed with a different secret', () => {
      const token = signJwt({ sub: 'u1' }, SECRET);
      const result = verifyJwt(token, 'different-secret');
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'invalid_signature');
    });

    it('reports expired tokens', () => {
      const token = signJwt({ sub: 'u1' }, SECRET, { expiresInSeconds: -10 });
      const result = verifyJwt(token, SECRET);
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'expired');
    });

    it('rejects malformed tokens', () => {
      assert.strictEqual(verifyJwt('not.a.jwt', SECRET).ok, false);
      assert.strictEqual(verifyJwt('two', SECRET).ok, false);
    });
  });

  describe('generateJti', () => {
    it('returns unique uuids', () => {
      const a = generateJti();
      const b = generateJti();
      assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      assert.notStrictEqual(a, b);
    });
  });

  describe('generateOpaqueToken', () => {
    it('produces a 64-character hex string by default', () => {
      const t = generateOpaqueToken();
      assert.strictEqual(t.length, 64);
      assert.match(t, /^[0-9a-f]+$/);
    });

    it('respects the byte length argument', () => {
      const t = generateOpaqueToken(16);
      assert.strictEqual(t.length, 32);
    });

    it('produces distinct values on repeated calls', () => {
      assert.notStrictEqual(generateOpaqueToken(), generateOpaqueToken());
    });
  });

  describe('hashToken', () => {
    it('returns a 32-byte Buffer (SHA-256)', () => {
      const h = hashToken('abc');
      assert.ok(Buffer.isBuffer(h));
      assert.strictEqual(h.length, 32);
    });

    it('is deterministic for the same input', () => {
      assert.deepStrictEqual(hashToken('x'), hashToken('x'));
    });

    it('differs for different inputs', () => {
      assert.notDeepStrictEqual(hashToken('x'), hashToken('y'));
    });
  });
});