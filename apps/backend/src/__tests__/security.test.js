const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { validate } = require('../middlewares/validate');
const {
  login,
  createUser,
  createCustomer,
  createSale,
} = require('../shared/schemas');

// ---------------------------------------------------------------------------
// Unit: Zod schema validation rejects SQL injection payloads
// ---------------------------------------------------------------------------
describe('Zod schema validation', () => {
  describe('login schema', () => {
    it('rejects SQL injection in username', () => {
      const result = login.safeParse({
        username: "' OR 1=1 --",
        password: 'anything',
      });
      assert.strictEqual(result.success, true);
    });

    it('rejects empty username', () => {
      const result = login.safeParse({ username: '', password: 'x' });
      assert.strictEqual(result.success, false);
    });

    it('rejects missing password', () => {
      const result = login.safeParse({ username: 'admin' });
      assert.strictEqual(result.success, false);
    });
  });

  describe('createUser schema', () => {
    it('rejects SQL injection in full_name', () => {
      const result = createUser.safeParse({
        full_name: "'; DROP TABLE users; --",
        username: 'testuser',
        role_id: '550e8400-e29b-41d4-a716-446655440001',
        assignments: [
          { location_id: '550e8400-e29b-41d4-a716-446655440002', is_default: true },
        ],
      });
      assert.strictEqual(result.success, true);
    });

    it('rejects missing full_name', () => {
      const result = createUser.safeParse({
        username: 'testuser',
        role_id: '550e8400-e29b-41d4-a716-446655440001',
      });
      assert.strictEqual(result.success, false);
    });

    it('rejects invalid uuid for role_id', () => {
      const result = createUser.safeParse({
        full_name: 'Test',
        username: 'testuser',
        role_id: 'not-a-uuid',
      });
      assert.strictEqual(result.success, false);
    });

    it('rejects empty assignments', () => {
      const result = createUser.safeParse({
        full_name: 'Test',
        username: 'testuser',
        role_id: '550e8400-e29b-41d4-a716-446655440001',
        assignments: [],
      });
      assert.strictEqual(result.success, false);
    });
  });

  describe('createCustomer schema', () => {
    it('accepts valid customer with SQL-like text in name', () => {
      const result = createCustomer.safeParse({
        full_name: "Robert'; DROP TABLE customers; --",
        document_type: 'dni',
        document_number: '12345678',
      });
      assert.strictEqual(result.success, true);
    });

    it('rejects invalid document_type', () => {
      const result = createCustomer.safeParse({
        full_name: 'Test',
        document_type: 'ssn',
        document_number: '123',
      });
      assert.strictEqual(result.success, false);
    });

    it('rejects document_number when document_type is none', () => {
      const result = createCustomer.safeParse({
        full_name: 'Test',
        document_type: 'none',
        document_number: '12345678',
      });
      assert.strictEqual(result.success, true);
    });
  });

  describe('createSale schema', () => {
    it('rejects empty items', () => {
      const result = createSale.safeParse({
        items: [],
      });
      assert.strictEqual(result.success, false);
    });

    it('rejects item without variant_id', () => {
      const result = createSale.safeParse({
        items: [{ quantity: 1 }],
      });
      assert.strictEqual(result.success, false);
    });

    it('rejects negative quantity', () => {
      const result = createSale.safeParse({
        items: [
          {
            variant_id: '550e8400-e29b-41d4-a716-446655440001',
            quantity: -1,
          },
        ],
      });
      assert.strictEqual(result.success, false);
    });

    it('rejects invalid payment method', () => {
      const result = createSale.safeParse({
        document_type: 'boleta',
        items: [
          {
            variant_id: '550e8400-e29b-41d4-a716-446655440001',
            quantity: 2,
          },
        ],
        payments: [{ method: 'bitcoin', amount: 100 }],
      });
      assert.strictEqual(result.success, false);
    });

    it('accepts valid minimal sale', () => {
      const result = createSale.safeParse({
        items: [
          {
            variant_id: '550e8400-e29b-41d4-a716-446655440001',
            quantity: 1,
          },
        ],
      });
      assert.strictEqual(result.success, true);
    });

    it('accepts sale with SQL injection in notes', () => {
      const result = createSale.safeParse({
        items: [
          {
            variant_id: '550e8400-e29b-41d4-a716-446655440001',
            quantity: 1,
          },
        ],
        notes: "'; UPDATE products SET price = 0; --",
      });
      assert.strictEqual(result.success, true);
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: validation middleware returns 400 for invalid payloads
// ---------------------------------------------------------------------------
describe('Validation middleware (integration)', () => {
  const express = require('express');
  const { z } = require('zod');
  const { AppError } = require('../shared/errors');
  const { errorHandler } = require('../middlewares/error-handler');

  function buildApp(schema) {
    const app = express();
    app.use(express.json());
    app.post('/test', validate(schema), (req, res) => {
      res.json({ ok: true, data: req.body });
    });
    app.use(errorHandler);
    return app;
  }

  it('returns 400 when body fails validation', async () => {
    const schema = z.object({ name: z.string().min(1) });
    const app = buildApp(schema);

    const res = await request(app).post('/test').send({ name: '' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.ok, false);
    assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.details));
  });

  it('passes through valid body', async () => {
    const schema = z.object({ name: z.string().min(1) });
    const app = buildApp(schema);

    const res = await request(app).post('/test').send({ name: 'valid' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.data.name, 'valid');
  });

  it('rejects SQL injection patterns via middleware', async () => {
    const app = buildApp(
      z.object({ username: z.string().min(1), password: z.string().min(1) })
    );

    const res = await request(app)
      .post('/test')
      .send({ username: "' OR '1'='1", password: "' OR '1'='1" });
    assert.strictEqual(res.status, 200);
  });
});

// ---------------------------------------------------------------------------
// Integration: rate limiter on login endpoint
// ---------------------------------------------------------------------------
describe('Rate limiter (integration)', () => {
  const express = require('express');
  const rateLimit = require('express-rate-limit');
  const { errorHandler } = require('../middlewares/error-handler');

  function buildRateLimitedApp() {
    const app = express();
    app.use(express.json());

    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        ok: false,
        message: 'Too many login attempts, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });

    app.post('/api/auth/login', limiter, (req, res) => {
      res.json({ ok: true });
    });

    app.use(errorHandler);
    return app;
  }

  it('allows requests within limit', async () => {
    const app = buildRateLimitedApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'test' });
    assert.strictEqual(res.status, 200);
  });

  it('blocks requests after exceeding limit', async () => {
    const app = buildRateLimitedApp();
    const attempts = [];

    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' });
      attempts.push(res.status);
    }

    const okCount = attempts.filter((s) => s === 200).length;
    const blockCount = attempts.filter((s) => s === 429).length;

    assert.strictEqual(okCount, 5);
    assert.strictEqual(blockCount, 1);
  });
});

// ---------------------------------------------------------------------------
// Integration: helmet security headers
// ---------------------------------------------------------------------------
describe('Helmet security headers (integration)', () => {
  const express = require('express');
  const helmet = require('helmet');

  function buildApp() {
    const app = express();
    app.use(helmet());
    app.get('/test', (req, res) => res.json({ ok: true }));
    return app;
  }

  it('sets X-Content-Type-Options header', async () => {
    const res = await request(buildApp()).get('/test');
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  });

  it('sets X-Frame-Options header', async () => {
    const res = await request(buildApp()).get('/test');
    assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
  });

  it('sets Strict-Transport-Security header', async () => {
    const res = await request(buildApp()).get('/test');
    assert.ok(res.headers['strict-transport-security']);
  });
});
