# Archive

Point-in-time reports, setup notes, and one-off scripts kept for history. They
describe the project as it was in February to March 2026 and are not
maintained. Several claim the product is "production-ready"; it is not. For the
current state read `CONTEXT.md` and `PRODUCTION_READINESS_AUDIT.md`.

- `scripts/` ad-hoc SQL and shell fixes applied by hand early on. They are not a
  schema source.

Not archived on purpose: `supabase/migrations/*.sql.bak` and
`complete_database_setup.sql` at the repo root. Together they are the only
definition of the base schema (`notes`, `todos`, `devices`, the signup trigger,
and the sync RPC). The numbered migrations from `005` on assume that base
already exists, so a fresh database cannot be built from them alone.
