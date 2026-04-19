#!/bin/sh
# scripts/backup.sh — Backup automático de PostgreSQL con retención 7 días

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="notionlocal_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') Iniciando backup: $FILENAME"

PGPASSWORD="${POSTGRES_PASSWORD:-dark}" pg_dump \
  -h "${POSTGRES_HOST:-postgres}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-notionlocal}" \
  -d "${POSTGRES_DB:-notionlocal}" \
  --no-owner \
  --no-privileges \
  | gzip > "$BACKUP_DIR/$FILENAME"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
  echo "$(date '+%Y-%m-%d %H:%M:%S') Backup completado: $BACKUP_DIR/$FILENAME ($SIZE)"

  # Eliminar backups de más de 7 días
  find "$BACKUP_DIR" -name "notionlocal_*.sql.gz" -mtime +7 -delete
  echo "$(date '+%Y-%m-%d %H:%M:%S') Limpieza de backups antiguos completada"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: Backup fallido (código $EXIT_CODE)"
  exit 1
fi
