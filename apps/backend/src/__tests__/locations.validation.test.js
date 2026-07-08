const { describe, it, before, beforeEach, after, mock } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const request = require('supertest');
const { signJwt } = require('../shared/jwt');
const { createLocation, patchLocation } = require('../shared/schemas');

describe('createLocation schema', () => {
  it('rejects empty name', () => {
    const result = createLocation.safeParse({ name: '', type: 'store' });
    assert.strictEqual(result.success, false);
  });

  it('rejects missing name', () => {
    const result = createLocation.safeParse({ type: 'store' });
    assert.strictEqual(result.success, false);
  });

  it('rejects invalid type', () => {
    const result = createLocation.safeParse({ name: 'X', type: 'invalid' });
    assert.strictEqual(result.success, false);
  });

  it('rejects missing type', () => {
    const result = createLocation.safeParse({ name: 'X' });
    assert.strictEqual(result.success, false);
  });

  it('accepts minimal valid payload with defaults', () => {
    const result = createLocation.safeParse({ name: 'Tienda Centro', type: 'store' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.active, true);
    assert.strictEqual(result.data.code, null);
  });

  it('accepts payload with manual code', () => {
    const result = createLocation.safeParse({ name: 'X', type: 'store', code: 'TD-CTR' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.code, 'TD-CTR');
  });

  it('defaults active to true when not provided', () => {
    const result = createLocation.safeParse({ name: 'X', type: 'warehouse' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.active, true);
  });
});

describe('patchLocation schema (.strict)', () => {
  it('rejects type field as unknown key', () => {
    const result = patchLocation.safeParse({ name: 'X', type: 'store' });
    assert.strictEqual(result.success, false);
  });

  it('rejects code field as unknown key', () => {
    const result = patchLocation.safeParse({ code: 'NEW' });
    assert.strictEqual(result.success, false);
  });

  it('accepts partial patch with only name', () => {
    const result = patchLocation.safeParse({ name: 'Nuevo' });
    assert.strictEqual(result.success, true);
  });

  it('accepts partial patch with only active', () => {
    const result = patchLocation.safeParse({ active: false });
    assert.strictEqual(result.success, true);
  });

  it('accepts full editable payload', () => {
    const result = patchLocation.safeParse({ name: 'X', address: 'Calle 1', active: true });
    assert.strictEqual(result.success, true);
  });
});

describe('location validation middleware (integration)', () => {
  let app;
  const authServicePath = path.resolve(__dirname, '../modules/auth/auth.service.js');
  const locationsServicePath = path.resolve(__dirname, '../modules/locations/locations.service.js');

  const mockIsAccessRevoked = mock.fn(async () => false);
  const mockRotateRefreshSession = mock.fn();
  const mockListLocations = mock.fn(async () => []);
  const mockCreateLocation = mock.fn(async () => ({ location_id: '2', name: 'New' }));
  const mockPatchLocation = mock.fn(async () => ({ location_id: '1', name: 'Updated' }));

  const JWT_SECRET = 'test-locations-validation-secret';
  const ORIGIN = 'http://localhost:3000';

  function buildToken(payload, expiresInSeconds = 900) {
    return signJwt(payload, JWT_SECRET, { expiresInSeconds });
  }

  function sessionCookie(permissions = ['admin.manage']) {
    const token = buildToken({
      sub: 'user-1',
      jti: `jti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role_id: 'role-1',
      role_name: 'admin',
      permissions,
    });
    return `ripnel_session=${encodeURIComponent(token)}`;
  }

  before(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/test';
    process.env.NODE_ENV = 'test';
    process.env.ALLOWED_ORIGINS = ORIGIN;

    require.cache[authServicePath] = {
      id: authServicePath,
      filename: authServicePath,
      loaded: true,
      exports: {
        isAccessRevoked: mockIsAccessRevoked,
        rotateRefreshSession: mockRotateRefreshSession,
      },
    };

    require.cache[locationsServicePath] = {
      id: locationsServicePath,
      filename: locationsServicePath,
      loaded: true,
      exports: {
        listLocations: mockListLocations,
        createLocation: mockCreateLocation,
        patchLocation: mockPatchLocation,
      },
    };

    const { env } = require('../config/env');
    env.jwtSecret = JWT_SECRET;

    const router = require('../modules/locations/locations.routes');
    const express = require('express');
    const { errorHandler } = require('../middlewares/error-handler');

    app = express();
    app.use(express.json());
    app.use('/api/locations', router);
    app.use(errorHandler);
  });

  after(() => {
    delete require.cache[authServicePath];
    delete require.cache[locationsServicePath];
  });

  beforeEach(() => {
    mockCreateLocation.mock.resetCalls();
    mockPatchLocation.mock.resetCalls();
    mockIsAccessRevoked.mock.resetCalls();
    mockRotateRefreshSession.mock.resetCalls();
    mockIsAccessRevoked.mock.mockImplementation(async () => false);
  });

  describe('POST /api/locations', () => {
    it('returns 400 VALIDATION_ERROR for invalid type', async () => {
      const res = await request(app)
        .post('/api/locations')
        .set('Cookie', sessionCookie())
        .set('Origin', ORIGIN)
        .send({ name: 'Tienda', type: 'invalid' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(res.body.details));
      assert.ok(res.body.details.some((d) => d.path.includes('type')));
      assert.strictEqual(mockCreateLocation.mock.calls.length, 0);
    });

    it('returns 400 VALIDATION_ERROR for empty name', async () => {
      const res = await request(app)
        .post('/api/locations')
        .set('Cookie', sessionCookie())
        .set('Origin', ORIGIN)
        .send({ name: '', type: 'store' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(res.body.details));
      assert.strictEqual(mockCreateLocation.mock.calls.length, 0);
    });

    it('returns 400 VALIDATION_ERROR for missing name', async () => {
      const res = await request(app)
        .post('/api/locations')
        .set('Cookie', sessionCookie())
        .set('Origin', ORIGIN)
        .send({ type: 'store' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(res.body.details));
      assert.strictEqual(mockCreateLocation.mock.calls.length, 0);
    });

    it('returns 201 for valid payload', async () => {
      const res = await request(app)
        .post('/api/locations')
        .set('Cookie', sessionCookie())
        .set('Origin', ORIGIN)
        .send({ name: 'Tienda Centro', type: 'store' });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.ok, true);
      assert.strictEqual(mockCreateLocation.mock.calls.length, 1);
    });
  });

  describe('PATCH /api/locations/:locationId', () => {
    it('returns 400 VALIDATION_ERROR when type is present (.strict)', async () => {
      const res = await request(app)
        .patch('/api/locations/1')
        .set('Cookie', sessionCookie())
        .set('Origin', ORIGIN)
        .send({ name: 'X', type: 'warehouse' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(res.body.details));
      assert.strictEqual(mockPatchLocation.mock.calls.length, 0);
    });

    it('returns 400 VALIDATION_ERROR when code is present (.strict)', async () => {
      const res = await request(app)
        .patch('/api/locations/1')
        .set('Cookie', sessionCookie())
        .set('Origin', ORIGIN)
        .send({ code: 'NEW-CODE' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(res.body.details));
      assert.strictEqual(mockPatchLocation.mock.calls.length, 0);
    });

    it('returns 200 for valid patch with name only', async () => {
      const res = await request(app)
        .patch('/api/locations/1')
        .set('Cookie', sessionCookie())
        .set('Origin', ORIGIN)
        .send({ name: 'Updated Name' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.ok, true);
      assert.strictEqual(mockPatchLocation.mock.calls.length, 1);
    });

    it('returns 200 for valid patch with active only', async () => {
      const res = await request(app)
        .patch('/api/locations/1')
        .set('Cookie', sessionCookie())
        .set('Origin', ORIGIN)
        .send({ active: false });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.ok, true);
      assert.strictEqual(mockPatchLocation.mock.calls.length, 1);
    });
  });
});