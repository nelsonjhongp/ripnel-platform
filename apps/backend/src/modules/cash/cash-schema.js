const { query } = require('../../shared/db');

const CASH_CLOSINGS_TABLE = {
  schema: 'public',
  name: 'cash_closings',
};

const CASH_SCHEMA_REQUIREMENTS = [
  {
    column: 'reopened_by',
    migration: 'supabase/migrations/202606180001_cash_reopen.sql',
    migrationDate: '2026-06-18',
  },
  {
    column: 'reopened_at',
    migration: 'supabase/migrations/202606180001_cash_reopen.sql',
    migrationDate: '2026-06-18',
  },
  {
    column: 'reopen_notes',
    migration: 'supabase/migrations/202606180001_cash_reopen.sql',
    migrationDate: '2026-06-18',
  },
  {
    column: 'opening_balance',
    migration: 'supabase/migrations/202606230001_cash_balance_columns.sql',
    migrationDate: '2026-06-23',
  },
  {
    column: 'closing_balance_declared',
    migration: 'supabase/migrations/202606230001_cash_balance_columns.sql',
    migrationDate: '2026-06-23',
  },
];

class SchemaCompatibilityError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'SchemaCompatibilityError';
    this.code = 'SCHEMA_OUTDATED';
    this.details = details;
  }
}

function groupRequirementsByMigration(missingRequirements) {
  const grouped = new Map();

  for (const requirement of missingRequirements) {
    const existing = grouped.get(requirement.migration);

    if (existing) {
      existing.columns.push(requirement.column);
      continue;
    }

    grouped.set(requirement.migration, {
      migration: requirement.migration,
      migrationDate: requirement.migrationDate,
      columns: [requirement.column],
    });
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.migration.localeCompare(right.migration)
  );
}

function buildCashSchemaCompatibilityMessage(input = {}) {
  const tableName = `${CASH_CLOSINGS_TABLE.schema}.${CASH_CLOSINGS_TABLE.name}`;
  const missingColumns = input.missingColumns || [];
  const missingRequirements = CASH_SCHEMA_REQUIREMENTS.filter((requirement) =>
    missingColumns.includes(requirement.column)
  );
  const lines = ['Cash module database schema is outdated.'];

  if (input.tableMissing) {
    lines.push(`Required table not found: ${tableName}.`);
    lines.push(
      'Apply the base schema first: supabase/migrations/202603250001_ripnel_mvp_v2.sql.'
    );
    return lines.join('\n');
  }

  lines.push(`Missing columns in ${tableName}: ${missingColumns.join(', ')}.`);

  const groupedRequirements = groupRequirementsByMigration(missingRequirements);
  if (groupedRequirements.length > 0) {
    lines.push('Apply these migrations before starting the backend:');
    for (const group of groupedRequirements) {
      lines.push(
        `  - ${group.migrationDate}: ${group.migration} (${group.columns.join(', ')})`
      );
    }
  }

  lines.push(
    'Base schema source of truth: supabase/migrations/202603250001_ripnel_mvp_v2.sql.'
  );

  return lines.join('\n');
}

async function listCashClosingColumns(executor = query) {
  const result = await executor(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = $2`,
    [CASH_CLOSINGS_TABLE.schema, CASH_CLOSINGS_TABLE.name]
  );

  return result.rows.map((row) => row.column_name);
}

async function assertCashSchemaCompatibility(executor = query) {
  const columns = await listCashClosingColumns(executor);

  if (columns.length === 0) {
    throw new SchemaCompatibilityError(
      buildCashSchemaCompatibilityMessage({ tableMissing: true }),
      { tableMissing: true, missingColumns: [] }
    );
  }

  const columnSet = new Set(columns);
  const missingColumns = CASH_SCHEMA_REQUIREMENTS.map((item) => item.column).filter(
    (column) => !columnSet.has(column)
  );

  if (missingColumns.length > 0) {
    throw new SchemaCompatibilityError(
      buildCashSchemaCompatibilityMessage({ missingColumns }),
      { tableMissing: false, missingColumns }
    );
  }
}

module.exports = {
  CASH_SCHEMA_REQUIREMENTS,
  SchemaCompatibilityError,
  assertCashSchemaCompatibility,
  buildCashSchemaCompatibilityMessage,
  listCashClosingColumns,
};
