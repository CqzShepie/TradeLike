#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_BLOB_URI:?BACKUP_BLOB_URI is required}"
: "${SQL_CONNECTION_STRING:?SQL_CONNECTION_STRING is required}"

timestamp="$(date -u +%Y%m%d%H%M%S)"
workdir="${RUNNER_TEMP:-/tmp}/tradelike-backup"
mkdir -p "$workdir"

bacpac="$workdir/tradelike-${timestamp}.bacpac"
blob_name="tradelike-${timestamp}.bacpac"

sqlpackage /Action:Export \
  /SourceConnectionString:"$SQL_CONNECTION_STRING" \
  /TargetFile:"$bacpac"

az storage blob upload \
  --file "$bacpac" \
  --blob-url "${BACKUP_BLOB_URI%/}/${blob_name}" \
  --overwrite false

cutoff="$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ)"
container_url="${BACKUP_BLOB_URI%%\?*}"
sas="${BACKUP_BLOB_URI#*\?}"
account_name="$(printf '%s' "$container_url" | sed -E 's#https?://([^.]+)\..*#\1#')"
container_name="$(basename "$container_url")"

az storage blob list \
  --container-name "$container_name" \
  --account-name "$account_name" \
  --sas-token "$sas" \
  --query "[?properties.lastModified < '$cutoff'].name" \
  --output tsv |
while read -r old_blob; do
  [ -z "$old_blob" ] && continue
  az storage blob delete \
    --container-name "$container_name" \
    --account-name "$account_name" \
    --sas-token "$sas" \
    --name "$old_blob"
done
