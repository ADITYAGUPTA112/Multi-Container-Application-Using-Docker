#!/bin/bash
set -euo pipefail

BACKUP_DIR=/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.gz"

echo "Starting MongoDB backup for database 'todos_db'..."

# Run mongodump against mongodb:27017/todos_db and compress output with gzip
mongodump \
  --host="mongodb:27017" \
  --db="todos_db" \
  --archive="$BACKUP_FILE" \
  --gzip

# Validate backup file creation and get file size
if [ -f "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup created successfully: $BACKUP_FILE (Size: $BACKUP_SIZE)"
else
  echo "Error: Backup file was not generated." >&2
  exit 1
fi

# Delete backups older than RETENTION_DAYS
echo "Deleting backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "backup_*.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} +

echo "Backup process completed."
