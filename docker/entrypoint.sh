#!/bin/sh
# docker/entrypoint.sh — Entrypoint de producción
set -e

echo "⏳ Aplicando schema a la base de datos..."
./node_modules/.bin/prisma db push --accept-data-loss

echo "✅ Schema aplicado. Iniciando servidor Next.js (standalone)..."
exec node server.js
