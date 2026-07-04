const { describe, it } = require('node:test');
const assert = require('node:assert');
const { isRetryable, queryWithRetry, TRANSIENT_PG_CODES } = require('../shared/resilience');

describe('shared/resilience', () => {
  describe('isRetryable', () => {
    it('returns true for transient PG codes', () => {
      assert.strictEqual(isRetryable({ code: '40001' }), true);
      assert.strictEqual(isRetryable({ code: '40P01' }), true);
      assert.strictEqual(isRetryable({ code: '57P03' }), true);
    });

    it('returns false for non-transient codes', () => {
      assert.strictEqual(isRetryable({ code: '23505' }), false);
      assert.strictEqual(isRetryable({ code: '42601' }), false);
    });

    it('returns false for errors without a code', () => {
      assert.strictEqual(isRetryable(new Error('boom')), false);
      assert.strictEqual(isRetryable(null), false);
    });
  });

  describe('queryWithRetry', () => {
    it('retries transient errors and succeeds on a later attempt', async () => {
      let calls = 0;
      const db = require('../shared/db');
      const original = db.query;
      db.query = async () => {
        calls += 1;
        if (calls < 3) {
          const err = new Error('serialization failure');
          err.code = '40001';
          throw err;
        }
        return { rows: [{ ok: true }] };
      };

      try {
        const result = await queryWithRetry('select 1', [], { maxRetries: 5 });
        assert.strictEqual(calls, 3);
        assert.deepStrictEqual(result.rows, [{ ok: true }]);
      } finally {
        db.query = original;
      }
    });

    it('does not retry non-transient errors', async () => {
      let calls = 0;
      const db = require('../shared/db');
      const original = db.query;
      db.query = async () => {
        calls += 1;
        const err = new Error('duplicate');
        err.code = '23505';
        throw err;
      };

      try {
        await assert.rejects(
          queryWithRetry('insert', [], { maxRetries: 5 }),
          (err) => err.code === '23505'
        );
        assert.strictEqual(calls, 1);
      } finally {
        db.query = original;
      }
    });

    it('exhausts retries and throws the last error', async () => {
      let calls = 0;
      const db = require('../shared/db');
      const original = db.query;
      db.query = async () => {
        calls += 1;
        const err = new Error('cannot connect');
        err.code = '57P03';
        throw err;
      };

      try {
        await assert.rejects(
          queryWithRetry('select 1', [], { maxRetries: 2 }),
          (err) => err.code === '57P03'
        );
        assert.strictEqual(calls, 3);
      } finally {
        db.query = original;
      }
    });
  });
});