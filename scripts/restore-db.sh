#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Restore a Baseform database backup from Supabase Storage.
#
# Usage:
#   ./scripts/restore-db.sh <backup-filename> <database-url>
#
# Example:
#   ./scripts/restore-db.sh backup-2026-04-16T02-00-00Z.sql.gz \
#     "postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres"
#
# Prerequisites:
#   - psql and pg_restore available locally (brew install postgresql)
#   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in your environment
#     (or copy them from .env.local)
# ---------------------------------------------------------------------------
set -euo pipefail

FILENAME="${1:?Usage: $0 <backup-filename> <database-url>}"
DATABASE_URL="${2:?Usage: $0 <backup-filename> <database-url>}"

SUPABASE_URL="${SUPABASE_URL:?Set SUPABASE_URL in your environment}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY in your environment}"

TMP_FILE="/tmp/${FILENAME}"

echo "==> Downloading ${FILENAME} from Supabase Storage…"
curl -fsSL \
  "${SUPABASE_URL}/storage/v1/object/db-backups/${FILENAME}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -o "${TMP_FILE}"

echo "==> Download complete ($(du -sh "${TMP_FILE}" | cut -f1))"
echo ""
echo "WARNING: This will restore the backup into the target database."
echo "         All existing data will be overwritten by the backup."
echo "         Target: ${DATABASE_URL%%@*}@…"
echo ""
read -rp "Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  rm -f "${TMP_FILE}"
  exit 1
fi

echo "==> Restoring…"
gunzip -c "${TMP_FILE}" | psql "${DATABASE_URL}"

echo "==> Restore complete."
rm -f "${TMP_FILE}"
