-- ============================================================================
-- Refresh tokens + access token revocation (Phase 1.3)
-- Adds stateful session management on top of the stateless JWT access token.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Refresh tokens: opaque, rotated, server-stored.
-- Stores SHA-256 hash of the random refresh token (never the raw token).
-- ---------------------------------------------------------------------------
create table if not exists refresh_tokens (
  refresh_id uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(user_id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default current_timestamp,
  created_by_ip text
);

create index if not exists idx_refresh_tokens_user
  on refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_expires
  on refresh_tokens(expires_at);

-- ---------------------------------------------------------------------------
-- Revoked access tokens: short-lived JTI registry.
-- Lets the server invalidate an access token before its natural expiry.
-- Rows are pruned by the expires_at index once tokens have expired.
-- ---------------------------------------------------------------------------
create table if not exists revoked_access_tokens (
  jti       uuid primary key,
  user_id   uuid not null references users(user_id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz not null default current_timestamp
);

create index if not exists idx_revoked_access_expires
  on revoked_access_tokens(expires_at);

-- ---------------------------------------------------------------------------
-- Lockout: per-account failed login attempts tracking.
-- An account is temporarily locked when locked_until > now().
-- On successful login the row is reset (attempts = 0, locked_until = null).
-- ---------------------------------------------------------------------------
create table if not exists failed_login_attempts (
  user_id     uuid primary key references users(user_id) on delete cascade,
  attempts    integer not null default 0,
  locked_until timestamptz,
  last_attempt_at timestamptz not null default current_timestamp
);