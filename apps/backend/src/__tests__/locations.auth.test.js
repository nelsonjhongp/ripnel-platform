const { describe, it, before, beforeEach, after, mock } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const request = require('supertest');
const { signJwt } = require('../shared/jwt');

const JWT_SECRET = 'test-locations-auth-secret';
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

describe('locations auth protection', () => {
  let app;
  const authServicePath = path.resolve(__dirname, '../modules/auth/auth.service.js');
  const locationsServicePath = path.resolve(__dirname, '../modules/locations/locations.service.js');

  const mockIsAccessRevoked = mock.fn(async () => false);
  const mockRotateRefreshSession = mock.fn();
  const mockListLocations = mock.fn(async () => [{ location_id: '1', name: 'Test' }]);
  const mockCreateLocation = mock.fn(async () => ({ location_id: '2', name: 'New' }));
  const mockPatchLocation = mock.fn(async () => ({ location_id: '1', name: 'Updated' }));

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
    mockListLocations.mock.resetCalls();
    mockCreateLocation.mock.resetCalls();
    mockPatchLocation.mock.resetCalls();
    mockIsAccessRevoked.mock.resetCalls();
    mockRotateRefreshSession.mock.resetCalls();
    mockIsAccessRevoked.mock.mockImplementation(async () => false);
  });

  describe('GET /api/locations', () => {
    it('returns 401 without auth cookie', async () => {
      const res = await request(app).get('/api/locations');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.ok, false);
      assert.strictEqual(mockListLocations.mock.calls.length, 0);
    });

    it('returns 200 with valid auth cookie', async () => {
      const res = await request(app)
        .get('/api/locations')
        .set('Cookie', sessionCookie());

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.ok, true);
      assert.strictEqual(mockListLocations.mock.calls.length, 1);
    });

    it('returns 401 when session is revoked', async () => {
      mockIsAccessRevoked.mock.mockImplementation(async () => true);

      const res = await request(app)
        .get('/api/locations')
        .set('Cookie', sessionCookie());

      assert.strictEqual(res.status, 401);
      assert.strictEqual(mockListLocations.mock.calls.length, 0);
    });
  });

  describe('POST /api/locations', () => {
    const body = { name: 'New Store', type: 'store' };

    it('returns 401 without auth cookie', async () => {
      const res = await request(app)
        .post('/api/locations')
        .set('Origin', ORIGIN)
        .send(body);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.ok, false);
      assert.strictEqual(mockCreateLocation.mock.calls.length, 0);
    });

    it('returns 403 without admin.manage permission', async () => {
      const res = await request(app)
        .post('/api/locations')
        .set('Cookie', sessionCookie(['inventory.view']))
        .set('Origin', ORIGIN)
        .send(body);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.ok, false);
      assert.strictEqual(mockCreateLocation.mock.calls.length, 0);
    });

    it('returns 201 with admin.manage permission', async () => {
      const res = await request(app)
        .post('/api/locations')
        .set('Cookie', sessionCookie(['admin.manage']))
        .set('Origin', ORIGIN)
        .send(body);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.ok, true);
      assert.strictEqual(mockCreateLocation.mock.calls.length, 1);
    });
  });

  describe('PATCH /api/locations/:locationId', () => {
    const body = { name: 'Updated Store' };

    it('returns 401 without auth cookie', async () => {
      const res = await request(app)
        .patch('/api/locations/1')
        .set('Origin', ORIGIN)
        .send(body);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.ok, false);
      assert.strictEqual(mockPatchLocation.mock.calls.length, 0);
    });

    it('returns 403 without admin.manage permission', async () => {
      const res = await request(app)
        .patch('/api/locations/1')
        .set('Cookie', sessionCookie(['inventory.view']))
        .set('Origin', ORIGIN)
        .send(body);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.ok, false);
      assert.strictEqual(mockPatchLocation.mock.calls.length, 0);
    });

    it('returns 200 with admin.manage permission', async () => {
      const res = await request(app)
        .patch('/api/locations/1')
        .set('Cookie', sessionCookie(['admin.manage']))
        .set('Origin', ORIGIN)
        .send(body);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.ok, true);
      assert.strictEqual(mockPatchLocation.mock.calls.length, 1);
    });
  });
});
