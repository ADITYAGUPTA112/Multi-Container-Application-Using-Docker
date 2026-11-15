#!/bin/bash
set -euo pipefail

# Takes backup file as argument $1
if [ $# -lt 1 ] || [ -z "${1:-}" ]; then
  echo "Error: Backup file argument is required."
  echo "Usage: $0 <path-to-backup-file.gz>"
  exit 1
fi

BACKUP_FILE="$1"

# Validates file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' does not exist." >&2
  exit 1
fi

echo "Starting restore from $BACKUP_FILE..."

# Decompress and mongorestore
mongorestore \
  --host="mongodb:27017" \
  --archive="$BACKUP_FILE" \
  --gzip \
  --drop

# Echo success with timestamp
RESTORE_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "MongoDB restore completed successfully at $RESTORE_TIMESTAMP"
