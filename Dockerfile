# Dockerfile — Multi-stage build para Next.js standalone output
# Stage 1: deps  →  Stage 2: builder  →  Stage 3: runner

# ---------------------------------------------------------------------------
# Stage 1 — Instalar dependencias de producción
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# Stage 2 — Build de la aplicación
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copiar todas las dependencias (incluyendo dev) para el build
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copiar código fuente
COPY . .

# Generar Prisma client antes del build
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

# Next.js recopila telemetría anónima — desactivar
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — Imagen de producción minimal (standalone)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos estáticos generados por Next.js
COPY --from=builder /app/public ./public

# Standalone incluye server.js + node_modules mínimos
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar Prisma (schema + cliente generado + CLI para db push en runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Entrypoint: db push + start
COPY --from=builder /app/docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "./entrypoint.sh"]
