/* ============================================================
   User password policy

   - Tracks users who must change their temporary password.
   - Records when a user last changed their password.
   ============================================================ */

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
