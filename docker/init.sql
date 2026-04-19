-- docker/init.sql — Ejecutado por postgres al crear la base de datos por primera vez
-- Habilita la extensión pg_trgm para búsqueda full-text con similaridad trigrama

CREATE EXTENSION IF NOT EXISTS pg_trgm;
