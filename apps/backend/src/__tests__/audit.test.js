const { describe, it } = require('node:test');
const assert = require('node:assert');

// We test the repo's SQL builder indirectly by stubbing the shared db.query.
// This validates that filters are applied parametrically without hitting a DB.

function makeStub() {
  const calls = [];
  const stub = async (text, params) => {
    calls.push({ text, params });
    return { rows: [{ total: 0 }] };
  };
  return { stub, calls };
}

const db = require('../shared/db');
const { listAuditLogs } = require('../modules/audit/audit.repo');

function withStubbedPool(fn) {
  return async (testName, assertions) => {
    const { stub, calls } = makeStub();
    const original = db.pool.query.bind(db.pool);
    db.pool.query = stub;
    try {
      await assertions(calls);
    } finally {
      db.pool.query = original;
    }
  };
}

describe('audit.repo — listAuditLogs', () => {
  it('applies all filters as parametrized placeholders', async () => {
    const { stub, calls } = makeStub();
    const originalQuery = db.pool.query;
    db.pool.query = stub;

    try {
      await listAuditLogs({
        tableName: 'users',
        operation: 'insert',
        actorUserId: '550e8400-e29b-41d4-a716-446655440000',
        from: '2026-01-01',
        to: '2026-12-31',
        limit: 50,
        offset: 10,
      });

      assert.strictEqual(calls.length, 1);
      const { text, params } = calls[0];
      assert.match(text, /where table_name = \$1 and operation = \$2 and actor_user_id = \$3::uuid and occurred_at >= \$4::timestamptz and occurred_at <= \$5::timestamptz/);
      assert.deepStrictEqual(params, [
        'users',
        'INSERT',
        '550e8400-e29b-41d4-a716-446655440000',
        '2026-01-01',
        '2026-12-31',
        50,
        10,
      ]);
    } finally {
      db.pool.query = originalQuery;
    }
  });

  it('works with no filters', async () => {
    const { stub, calls } = makeStub();
    const originalQuery = db.pool.query;
    db.pool.query = stub;

    try {
      await listAuditLogs();
      assert.strictEqual(calls.length, 1);
      assert.ok(!calls[0].text.includes('where'));
      assert.deepStrictEqual(calls[0].params, [100, 0]);
    } finally {
      db.pool.query = originalQuery;
    }
  });

  it('clamps limit to 500', async () => {
    const { stub, calls } = makeStub();
    const originalQuery = db.pool.query;
    db.pool.query = stub;

    try {
      await listAuditLogs({ limit: 9999 });
      assert.strictEqual(calls[0].params[0], 500);
    } finally {
      db.pool.query = originalQuery;
    }
  });
});

describe('withTransaction — actor context injection', { skip: true }, () => {
  it('sets local app.actor_user_id and app.actor_role on the client', async () => {});
});