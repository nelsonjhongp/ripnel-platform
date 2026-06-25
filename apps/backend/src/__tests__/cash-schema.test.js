const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  SchemaCompatibilityError,
  assertCashSchemaCompatibility,
  buildCashSchemaCompatibilityMessage,
} = require('../modules/cash/cash-schema');

describe('cash schema compatibility', () => {
  it('builds a clear message for missing balance columns', () => {
    const message = buildCashSchemaCompatibilityMessage({
      missingColumns: ['opening_balance', 'closing_balance_declared'],
    });

    assert.match(message, /Cash module database schema is outdated/);
    assert.match(
      message,
      /2026-06-23: supabase\/migrations\/202606230001_cash_balance_columns\.sql/
    );
    assert.match(message, /opening_balance, closing_balance_declared/);
  });

  it('fails clearly when cash_closings table is missing', async () => {
    await assert.rejects(
      () => assertCashSchemaCompatibility(async () => ({ rows: [] })),
      (error) => {
        assert.ok(error instanceof SchemaCompatibilityError);
        assert.match(error.message, /Required table not found: public\.cash_closings/);
        assert.match(
          error.message,
          /supabase\/migrations\/202603250001_ripnel_mvp_v2\.sql/
        );
        return true;
      }
    );
  });

  it('fails clearly when required cash columns are missing', async () => {
    await assert.rejects(
      () =>
        assertCashSchemaCompatibility(async () => ({
          rows: [
            { column_name: 'cash_closing_id' },
            { column_name: 'location_id' },
            { column_name: 'business_date' },
            { column_name: 'status' },
          ],
        })),
      (error) => {
        assert.ok(error instanceof SchemaCompatibilityError);
        assert.deepStrictEqual(error.details.missingColumns, [
          'reopened_by',
          'reopened_at',
          'reopen_notes',
          'opening_balance',
          'closing_balance_declared',
        ]);
        assert.match(
          error.message,
          /2026-06-18: supabase\/migrations\/202606180001_cash_reopen\.sql/
        );
        assert.match(
          error.message,
          /2026-06-23: supabase\/migrations\/202606230001_cash_balance_columns\.sql/
        );
        return true;
      }
    );
  });

  it('passes when required columns exist', async () => {
    await assert.doesNotReject(() =>
      assertCashSchemaCompatibility(async () => ({
        rows: [
          { column_name: 'reopened_by' },
          { column_name: 'reopened_at' },
          { column_name: 'reopen_notes' },
          { column_name: 'opening_balance' },
          { column_name: 'closing_balance_declared' },
        ],
      }))
    );
  });
});
