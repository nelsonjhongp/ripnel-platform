const { Pool } = require('pg');
const { env } = require('../config/env');
const { AppError } = require('./errors');

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function query(text, params) {
  if (!env.databaseUrl) {
    throw new AppError('DATABASE_URL is not configured', 500);
  }

  return pool.query(text, params);
}

module.exports = {
  query,
  pool,
};
