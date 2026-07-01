#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_BLOB_URI:?BACKUP_BLOB_URI is required}"
: "${SQL_CONNECTION_STRING:?SQL_CONNECTION_STRING is required}"

workdir="${RUNNER_TEMP:-/tmp}/tradelike-restore"
mkdir -p "$workdir"

container_url="${BACKUP_BLOB_URI%%\?*}"
sas="${BACKUP_BLOB_URI#*\?}"
account_name="$(printf '%s' "$container_url" | sed -E 's#https?://([^.]+)\..*#\1#')"
container_name="$(basename "$container_url")"

latest_blob="$(az storage blob list \
  --container-name "$container_name" \
  --account-name "$account_name" \
  --sas-token "$sas" \
  --query "sort_by([].{name:name, lastModified:properties.lastModified}, &lastModified)[-1].name" \
  --output tsv)"

if [ -z "$latest_blob" ] || [ "$latest_blob" = "null" ]; then
  echo "No backup blobs found." >&2
  exit 1
fi

bacpac="$workdir/$latest_blob"

az storage blob download \
  --container-name "$container_name" \
  --account-name "$account_name" \
  --sas-token "$sas" \
  --name "$latest_blob" \
  --file "$bacpac"

sqlpackage /Action:Import \
  /TargetConnectionString:"$SQL_CONNECTION_STRING" \
  /SourceFile:"$bacpac"
