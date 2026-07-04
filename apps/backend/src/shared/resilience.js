// Resilience helpers: DB retry + Gemini circuit breaker.

const db = require('./db');

// PostgreSQL SQLSTATE codes that are safe to retry (transient).
const TRANSIENT_PG_CODES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '57P03', // cannot_connect_now
  '08001', // connection_does_not_exist
  '08006', // connection_failure
  '08001',
  '57P02', // crash_shutdown
]);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

function isRetryable(error) {
  return Boolean(error && TRANSIENT_PG_CODES.has(error.code));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wraps the shared query() with retry on transient PG errors.
// Uses exponential backoff with jitter. Idempotency is the caller's responsibility.
async function queryWithRetry(text, params, { maxRetries = MAX_RETRIES } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await db.query(text, params);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === maxRetries) {
        throw error;
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 50;
      await sleep(delay);
    }
  }
  throw lastError;
}

module.exports = {
  queryWithRetry,
  isRetryable,
  TRANSIENT_PG_CODES,
};