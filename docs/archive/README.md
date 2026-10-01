# Archive

Point-in-time reports, setup notes, and one-off scripts kept for history. They
describe the project as it was in February to March 2026 and are not
maintained. Several claim the product is "production-ready"; it is not. For the
current state read `CONTEXT.md` and `PRODUCTION_READINESS_AUDIT.md`.

- `scripts/` ad-hoc SQL and shell fixes applied by hand early on. They are not a
  schema source.
- `supabase-migrations-bak/` early schema drafts (`001` to `004`). They defined
  `notes`, `todos`, `notebooks`, `devices`, `pdf_*` tables and storage buckets that
  the app never queried, so `supabase/migrations/001_baseline_schema.sql` does not
  carry them forward.
- `scripts/complete_database_setup.sql` the bootstrap that was pasted into the
  Supabase SQL editor by hand. `001_baseline_schema.sql` reproduces it (checked by
  diffing the resulting schemas) and is safe to run on existing databases; this
  script is not, because it replaces the hardened `insert_sync_operation`.
