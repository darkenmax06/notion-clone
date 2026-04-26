# Fase 7 - Vistas adicionales de base de datos

Fecha de cierre: 26-04-2026

## Alcance implementado

### 7.1 Vista Gallery
- Nueva vista `GALLERY` en selector de vistas.
- Cards por registro con:
  - imagen configurable por campo (`URL` o `TEXT`),
  - titulo principal,
  - campos adicionales configurables desde toolbar.
- Persistencia de imagen de galeria por base de datos con `galleryImageFieldId`.

### 7.2 Vista List
- Nueva vista `LIST`.
- Render compacto de filas con titulo + 2/3 campos inline.
- Selector de campos inline desde toolbar.
- Enfoque orientado a listas de tareas y seguimiento rapido.

### 7.3 Vista Timeline (Gantt custom)
- Nueva vista `TIMELINE`.
- Configuracion de campo inicio y fin (`DATE`) por base de datos.
- Render horizontal con escala semana/mes.
- Barras arrastrables para mover fechas de inicio/fin.
- Persistencia en modelo `Database`:
  - `timelineStartFieldId`
  - `timelineEndFieldId`

### 7.4 Board mejorada (Kanban 2.0)
- Subgrupos dentro de cada columna por segundo campo.
- Contador por columna.
- Colapsar / expandir columnas.
- Limite WIP por columna con alerta visual.
- Creacion de columnas desde la propia vista (agrega opcion al campo `SELECT`).

### 7.5 Agrupacion en vista Tabla
- Agrupacion client-side por campos `SELECT`, `CHECKBOX` y `DATE`.
- Grupos colapsables con contador.
- Sin cambios en API para `GROUP BY`.

## Cambios de modelo y acciones

- Prisma `Database`:
  - `galleryImageFieldId String?`
  - `timelineStartFieldId String?`
  - `timelineEndFieldId String?`
- Enum `ViewType` extendido:
  - `GALLERY`
  - `LIST`
  - `TIMELINE`
- `lib/actions/databases.ts` y `app/api/databases/[id]/route.ts` actualizados para soportar los nuevos campos.

## Archivos principales modificados/agregados

- `components/views/DatabaseView.tsx`
- `components/views/ViewSelector.tsx`
- `components/views/KanbanView.tsx`
- `components/views/GalleryView.tsx` (nuevo)
- `components/views/ListView.tsx` (nuevo)
- `components/views/TimelineView.tsx` (nuevo)
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/actions/databases.ts`
- `app/(workspace)/db/[id]/page.tsx`
- `app/api/databases/[id]/route.ts`

## Pruebas ejecutadas

- `npm test -- --runInBand`
  - Resultado: **24 suites / 215 tests OK**
- `npm run build`
  - Resultado: **build de produccion OK**

## Validacion de no regresion

- Suite completa de unit + integration en verde.
- Se mantuvo cobertura de rutas API existentes.
- Persistencia de configuraciones nuevas validada en tests de acciones.
- Build de Next.js + TypeScript completado sin errores.
