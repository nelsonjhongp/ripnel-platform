# RIPNEL — Deploy Guide

## Stack

- Frontend: Next.js 16 (apps/frontend)
- Backend: Node.js + Express 5 (apps/backend)
- Database: PostgreSQL via Supabase (managed)
- Tests: node:test (backend), Playwright unit (frontend)

## Environment variables

See `apps/backend/.env.example` and `apps/frontend/.env.example`.

### Required

| Variable | Scope | Description |
|---|---|---|
| `DATABASE_URL` | backend | Supabase connection string |
| `JWT_SECRET` | backend | 32+ char HMAC-SHA256 signing key |
| `FRONTEND_URL` | backend | Frontend origin (CORS + CSRF gate) |
| `NEXT_PUBLIC_API_BASE_URL` | frontend | Backend base URL |

### Security (Phase 1)

| Variable | Default | Description |
|---|---|---|
| `DB_SSL` | `true` | Enable SSL to Postgres |
| `DB_SSL_REJECT_UNAUTHORIZED` | `true` | Validate DB cert (set `false` only for local dev) |
| `CA_CERT_PATH` | — | Path to CA cert file (optional, for custom CAs) |
| `SESSION_COOKIE_DOMAIN` | — | Cookie domain (set in prod for subdomains) |

### Optional

| Variable | Scope | Description |
|---|---|---|
| `GEMINI_API_KEY` | backend | Google Gemini for chatbot |
| `SMTP_*` | backend | Email receipts |
| `ALLOWED_ORIGINS` | backend | Comma-separated extra CORS origins (`*.host` wildcards) |

## Secrets management

- **Never commit real secrets** to the repo. Use the platform's secret injection
  (Vercel env panel, Render env panel, or a vault like Doppler).
- The `.env.example` files contain only placeholder names with no real values.

## Database migrations

Migrations live in `supabase/migrations/`. Apply in order:

```bash
# Option A: Supabase CLI (local or linked project)
supabase db push

# Option B: psql against the database
psql "$DATABASE_URL" -f supabase/migrations/202603250001_ripnel_mvp_v2.sql
psql "$DATABASE_URL" -f supabase/migrations/202607040001_refresh_tokens_lockout.sql
# ... etc in order
```

### Security-relevant migrations (Phase 1-2)

| File | What it adds |
|---|---|
| `202607040001_refresh_tokens_lockout.sql` | `refresh_tokens`, `revoked_access_tokens`, `failed_login_attempts` |
| `202607040002_audit_logs.sql` | `audit_logs` WORM table + AFTER triggers on 26 tables |

## Supabase platform features (managed)

The following capabilities are provided by the Supabase platform (Pro plan)
and are not configured in-repo:

- **PITR (Point-in-Time Recovery)**: continuous WAL archiving for microsecond
  restores. Enabled in the Supabase dashboard under Database > Backups.
- **Connection Pooling**: Supavisor (port 6543) multiplexes connections to avoid
  exhausting the Postgres connection limit.
- **Read Replicas**: optional read replica can be created via the dashboard for
  analytical read-heavy workloads. Not yet wired into the backend (single pool).

## PII encryption decision

Column-level encryption (`pgp_sym_encrypt`) was evaluated and **deferred** for the
MVP. Supabase provides encryption-at-rest at the platform level. The `customers`
module uses partial `ILIKE` search on `document_number` and `email`, which is
incompatible with blind-hash exact-match only search. If regulatory requirements
change, revisit `pgcrypto` `pgp_sym_encrypt` + `digest()` blind index columns.

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to main:

1. **Backend job**: spins up a Postgres 16 service container, runs
   `node --test` (unit + integration tests).
2. **Frontend job**: `npm run lint`, `npm run typecheck` (tsc --noEmit),
   Playwright unit tests.

No auto-deploy is configured yet. Deploy manually:

```bash
# Frontend (Vercel)
npm run build --workspace @ripnel/frontend

# Backend (Render / Railway / Fly)
npm run start --workspace @ripnel/backend
```

## Audit trail

Every INSERT/UPDATE/DELETE on 26 critical tables triggers `fn_audit_capture()`
which writes to `audit_logs` (WORM: `REVOKE UPDATE, DELETE, TRUNCATE`).

The backend sets `app.actor_user_id` via `SET LOCAL` inside transactions
(see `withTransaction` / `attachActor` in `shared/db.js`) so the trigger can
stamp the acting user without trusting application-level writes.

Query the trail via:

```
GET /api/audit?table=sales&operation=UPDATE&from=2026-01-01&to=2026-12-31&limit=50
```

Requires the `admin.manage` permission.