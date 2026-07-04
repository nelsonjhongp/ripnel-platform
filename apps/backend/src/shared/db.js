const { Pool } = require('pg');
const { env } = require('../config/env');
const { AppError } = require('./errors');

const fs = require('fs');

function buildSslConfig() {
  if (!env.dbSsl) return false;

  const sslConfig = { rejectUnauthorized: env.dbSslRejectUnauthorized };

  if (env.caCertPath) {
    try {
      sslConfig.ca = fs.readFileSync(env.caCertPath, 'utf8');
    } catch (err) {
      throw new Error(
        `Unable to read CA certificate at ${env.caCertPath}: ${err.message}`
      );
    }
  }

  return sslConfig;
}

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: buildSslConfig(),
});

async function query(text, params) {
  if (!env.databaseUrl) {
    throw new AppError('DATABASE_URL is not configured', 500);
  }

  return pool.query(text, params);
}

// ---------------------------------------------------------------------------
// Transaction helper — holds a client, sets actor session vars, runs BEGIN.
// Usage:
//   const result = await withTransaction({ actorUserId: req.auth.sub }, async (tx) => {
//     const user = await insertUser(form, tx.query);
//     return user;
//   });
// The trigger functions read current_setting('app.actor_user_id', true) to
// stamp audit rows with the acting user without relying on application code.
// ---------------------------------------------------------------------------
async function withTransaction({ actorUserId = null, actorRole = null } = {}, fn) {
  const client = await pool.connect();
  const tx = {
    query: client.query.bind(client),
    client,
  };

  try {
    await client.query('begin');

    if (actorUserId) {
      await client.query(`set local app.actor_user_id = $1`, [String(actorUserId)]);
    }
    if (actorRole) {
      await client.query(`set local app.actor_role = $1`, [String(actorRole)]);
    }

    const result = await fn(tx);
    await client.query('commit');
    return result;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    client.release();
  }
}

// Attach actor context to an existing client+transaction (for services that
// manage their own BEGIN/COMMIT via pool.connect()). Call after `begin`.
async function attachActor(client, { actorUserId = null, actorRole = null } = {}) {
  if (actorUserId) {
    await client.query(`set local app.actor_user_id = $1`, [String(actorUserId)]);
  }
  if (actorRole) {
    await client.query(`set local app.actor_role = $1`, [String(actorRole)]);
  }
}

module.exports = {
  query,
  pool,
  withTransaction,
};
