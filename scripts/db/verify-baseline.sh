#!/usr/bin/env bash
# Builds a database from supabase/migrations on plain PostgreSQL and checks it.
#   1. every migration applies to an empty database
#   2. behavior assertions pass (signup trigger, RLS, hardened sync RPC)
#   3. re-running the baseline on the migrated database changes nothing
# Uses the server in PGHOST/PGPORT/PGUSER if set (needs rights to create databases
# and roles), otherwise starts a throwaway local cluster.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
migrations="$here/../../supabase/migrations"
db=notechain_baseline_check
tmp=""

cleanup() {
  if [[ -n "$tmp" ]]; then "$pgbin/pg_ctl" -D "$tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$tmp"; fi
}
trap cleanup EXIT

if [[ -z "${PGHOST:-}" ]]; then
  pgbin="$(dirname "$(ls /usr/lib/postgresql/*/bin/initdb 2>/dev/null | sort -V | tail -1 || command -v initdb)")"
  [[ -x "$pgbin/initdb" ]] || { echo "No PostgreSQL server: set PGHOST or install postgresql" >&2; exit 2; }
  tmp="$(mktemp -d)"
  port="$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')"
  "$pgbin/initdb" -D "$tmp/data" -U postgres --auth=trust >/dev/null
  "$pgbin/pg_ctl" -D "$tmp/data" -o "-p $port -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" \
    -l "$tmp/log" -w start >/dev/null
  export PGHOST=127.0.0.1 PGPORT="$port" PGUSER=postgres
fi
psql() { command psql -q -X -v ON_ERROR_STOP=1 "$@"; }

PGOPTIONS="-c client_min_messages=warning" psql -d postgres -c "DROP DATABASE IF EXISTS $db" -c "CREATE DATABASE $db"
psql -d "$db" -c "ALTER DATABASE $db SET search_path = public, extensions" -f "$here/supabase_stub.sql" >/dev/null

# The Supabase CLI applies migrations from a session whose search_path lacks the
# extensions schema, so an unqualified digest() or crypt() fails there but not
# with the database default. Apply migrations the same way. Roles that query the
# data later keep the default.
echo "== apply migrations to an empty database"
for f in "$migrations"/[0-9]*_*.sql; do
  PGOPTIONS="-c search_path=public" psql -d "$db" -f "$f" >/dev/null 2>"${tmp:-/tmp}/err" || { echo "FAIL $(basename "$f"): $(grep -m1 -i error "${tmp:-/tmp}/err")" >&2; exit 1; }
  echo "ok   $(basename "$f")"
done

echo "== behavior assertions"
psql -d "$db" -v migrations_dir="$migrations" -o /dev/null -f "$here/baseline_assertions.sql" 2>&1 \
  | sed -n -e 's/^.*NOTICE:  /     /p' -e '/ERROR:/p'

echo "== baseline is a no-op on a migrated database"
# pg_dump refuses a server newer than itself, so use the newest client installed.
pgdump="$(ls /usr/lib/postgresql/*/bin/pg_dump 2>/dev/null | sort -V | tail -1)"
pgdump="${pgdump:-$(command -v pg_dump)}"
snap() { "$pgdump" -d "$db" --schema-only --no-owner | grep -v '^\\\(un\)\?restrict' ; }
before="$(snap)"
PGOPTIONS="-c client_min_messages=warning -c search_path=public" psql -d "$db" -f "$migrations/001_baseline_schema.sql" >/dev/null
[[ "$before" == "$(snap)" ]] || { echo "FAIL: re-running 001_baseline_schema.sql changed the schema" >&2; exit 1; }
echo "ok   schema identical after re-running 001_baseline_schema.sql"

psql -d postgres -c "DROP DATABASE $db"
echo "ALL CHECKS PASSED"
