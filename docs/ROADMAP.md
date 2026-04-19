# NotionLocal — Roadmap de desarrollo (Next.js 16 Edition)

## Stack
- Framework: **Next.js 16** (App Router) + TypeScript + React 19
- Editor de bloques: BlockNote con dynamic import (ssr: false)
- Estado global: Zustand (solo Client Components) — `lib/store/uiStore.ts`
- Mutations: Server Actions de Next.js + Zod para validación
- API: Route Handlers en /app/api/
- Base de datos: PostgreSQL 16 (JSONB para registros flexibles)
- ORM: Prisma con migraciones
- Kanban: dnd-kit (Client Component)
- Calendario: react-big-calendar (Client Component)
- UI: Tailwind CSS + shadcn/ui (CSS variables, `components.json`)
- Infra: Docker Compose con 2 servicios (nextjs + postgres)
- Tests: Jest 29 + React Testing Library 16 + `next/jest`

## Estructura de carpetas
```
notion-local/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── (workspace)/
│   │   ├── page/[id]/page.tsx
│   │   └── db/[id]/page.tsx
│   └── api/
│       ├── pages/route.ts
│       ├── pages/[id]/route.ts
│       ├── databases/route.ts
│       └── records/route.ts
├── components/
│   ├── sidebar/
│   │   ├── SidebarServer.tsx
│   │   └── SidebarClient.tsx
│   ├── editor/
│   │   └── BlockEditor.tsx
│   └── views/
├── lib/
│   ├── prisma.ts
│   ├── utils.ts
│   ├── store/
│   │   └── uiStore.ts        ← Zustand (sidebarCollapsed, activePageId)
│   └── actions/
│       └── pages.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts               ← Datos de prueba
│   └── migrations/
├── __tests__/
│   ├── unit/
│   │   ├── utils.test.ts
│   │   └── pages-actions.test.ts
│   └── integration/
│       └── api-pages.test.ts
├── docs/
│   └── ROADMAP.md
├── jest.config.ts
├── jest.setup.ts
├── components.json           ← shadcn/ui config
├── Dockerfile
└── docker-compose.yml
```

## Docker — Servicios
| Servicio | Descripción                          | Puerto |
|----------|--------------------------------------|--------|
| nextjs   | Next.js standalone (app + API)       | :3000  |
| postgres | PostgreSQL 16-alpine + volumen       | :5432  |

## Regla Server vs Client Components
- Server Components (default): layouts, páginas, fetch con Prisma
- "use client": BlockEditor, KanbanView, CalendarView, Sidebar interactivo, stores Zustand
- Server Actions: createPage, updateRecord, deleteDatabase

## Breaking changes de Next.js 16 (vs 14)
- `params` en Page components y Route Handlers es ahora una **Promise** → usar `const { id } = await params`
- React 19 requerido (actualizado de React 18)
- `eslint-config-next` debe coincidir con la versión de `next`

---

## Fase 1 — Setup & Scaffolding ✅ (Días 1–2)
- [x] **Next.js 16** App Router + TypeScript (proyecto único, no monorepo)
- [x] React 19
- [x] Prisma ORM + PostgreSQL en Docker, schema inicial
- [x] Zustand para estado global del cliente (`lib/store/uiStore.ts`)
- [x] Tailwind CSS + shadcn/ui (`components.json`, CSS variables en `globals.css`)
- [x] Variables de entorno (`.env.local`)
- [x] Suite de tests: Jest + React Testing Library (`jest.config.ts`)
- [x] Tests unitarios: `cn()`, Server Actions (createPage, updatePage, deletePage)
- [x] Tests de integración: Route Handlers GET/POST `/api/pages`
- [x] Script de seed con datos de prueba (`prisma/seed.ts`)

## Fase 2 — Sidebar & Notas (Días 3–6) ✅
- [x] Sidebar jerárquico (páginas anidadas) — `SidebarServer` + `SidebarClient` con árbol recursivo
- [x] BlockNote con dynamic import (ssr: false) — `components/editor/BlockEditor.tsx`
- [x] Route Handlers en /app/api/pages/ — GET/POST + GET/PUT/DELETE `[id]`
- [x] Autosave con debounce (1 000 ms) — `BlockEditor` con `useRef` + `setTimeout`
- [x] Slash commands básicos (/heading, /list) — integrados por defecto en BlockNote 0.14
- [x] Breadcrumb de navegación — `components/ui/Breadcrumb.tsx`
- [x] Tests unitarios: `Breadcrumb`, `SidebarClient`, `BlockEditor` (40 tests nuevos)
- [x] Tests de integración: Route Handler `GET/PUT/DELETE /api/pages/[id]`
- [x] Suite completa: 64 tests, 0 fallos (sin regresiones en Fase 1)

## Fase 3 — Base de datos & Tablas (Días 7–11) ✅
- [x] Modelo: Database → Fields → Records (JSONB flexible) — schema ya existente
- [x] Server Actions — `lib/actions/databases.ts` (Database + Field CRUD) y `lib/actions/records.ts`
- [x] Route Handlers — `/api/databases/`, `/api/databases/[id]/`, `/api/databases/[id]/fields/`, `/api/databases/[id]/fields/[fieldId]/`, `/api/records/`, `/api/records/[id]/`
- [x] Vista tabla con columnas editables — `components/views/DatabaseView.tsx` (Client Component)
- [x] Tipos soportados: Text, Number, Date, Select, Checkbox — `components/views/TableCell.tsx`
- [x] Cabeceras con icono de tipo, menú de renombrar/eliminar — `components/views/FieldHeader.tsx`
- [x] Filtros y ordenamiento client-side — `components/views/FilterSortBar.tsx`
- [x] Detail view por registro (panel lateral) — `components/views/RecordDetailPanel.tsx`
- [x] Modal para añadir campo nuevo con opciones SELECT — `components/views/AddFieldModal.tsx`
- [x] Sidebar actualizado con sección "Bases de datos" — `SidebarServer` + `SidebarClient`
- [x] Página `/db/[id]` (Server Component) — `app/(workspace)/db/[id]/page.tsx`
- [x] Tests unitarios: `databases-actions.test.ts`, `records-actions.test.ts`
- [x] Tests de integración: `api-databases.test.ts`, `api-records.test.ts`
- [x] Seed actualizado: 2 bases de datos (Tareas 6 campos/5 registros + Contactos 4 campos/3 registros)

### Arquitectura Fase 3
```
app/(workspace)/db/[id]/page.tsx   ← Server Component (fetch + notFound)
components/views/
  DatabaseView.tsx                 ← Client Component (estado tabla, mutations)
  TableCell.tsx                    ← Renderizado/edición por tipo de campo
  FieldHeader.tsx                  ← Cabecera de columna con menú
  FilterSortBar.tsx                ← Filtros y ordenamiento
  RecordDetailPanel.tsx            ← Panel lateral de detalle
  AddFieldModal.tsx                ← Modal para crear campo
  FieldTypeIcon.tsx                ← Icono por FieldType
lib/actions/
  databases.ts                     ← createDatabase, updateDatabase, deleteDatabase, createField, updateField, deleteField
  records.ts                       ← createRecord, updateRecord, deleteRecord
app/api/
  databases/route.ts               ← GET (list), POST (create)
  databases/[id]/route.ts          ← GET, PUT, DELETE
  databases/[id]/fields/route.ts   ← POST (create field)
  databases/[id]/fields/[fieldId]/route.ts ← PUT, DELETE
  records/route.ts                 ← POST (create)
  records/[id]/route.ts            ← PUT (update values), DELETE (soft)
```

## Fase 4 — Vista Kanban & Calendario (Días 12–17) ✅
- [x] Kanban con dnd-kit (Client Component) — `components/views/KanbanView.tsx`
- [x] Columnas agrupadas por campo Select/Status, drag-and-drop entre columnas
- [x] react-big-calendar para vista mensual (Client Component) — `components/views/CalendarView.tsx`
- [x] Eventos vinculados a campo Date de la DB, coloreados por campo Select
- [x] Selector de vista (Tabla / Kanban / Calendar) — `components/views/ViewSelector.tsx`
- [x] Quick-add desde calendario (clic en slot o botón "Añadir") con RecordDetailPanel
- [x] viewType persistido en DB (nuevo campo en schema + Server Action actualizado)
- [x] Tests unitarios: `view-selector.test.tsx`, `kanban-view.test.tsx`, `calendar-view.test.tsx`
- [x] Tests de integración: `api-databases-viewtype.test.ts`
- [x] Suite completa: 132 tests, 0 fallos (sin regresiones en Fases 1-3)
- [x] Seed actualizado: 3 bases de datos con vistas predeterminadas distintas

### Arquitectura Fase 4
```
components/views/
  ViewSelector.tsx          ← Tabs TABLE / KANBAN / CALENDAR
  KanbanView.tsx            ← Board dnd-kit: columnas por SELECT, drag entre cols
  CalendarView.tsx          ← react-big-calendar + date-fns localizer (es)
  DatabaseView.tsx          ← Orquestador: gestiona estado + renderiza vista activa
prisma/schema.prisma        ← nuevo enum ViewType {TABLE, KANBAN, CALENDAR}
                               campo viewType en modelo Database
lib/actions/databases.ts    ← updateDatabase acepta viewType
prisma/seed.ts              ← 3 DBs: Tareas[KANBAN], Eventos[CALENDAR], Contactos[TABLE]
__tests__/
  unit/view-selector.test.tsx
  unit/kanban-view.test.tsx
  unit/calendar-view.test.tsx
  integration/api-databases-viewtype.test.ts
```

### Dependencias añadidas (Fase 4)
```
@dnd-kit/core ^6.x
@dnd-kit/sortable ^8.x
@dnd-kit/utilities ^3.x
react-big-calendar ^1.x
date-fns ^3.x
@types/react-big-calendar ^1.x
```

## Fase 5 — Polish & Docker Production (Días 18–21) ✅
- [x] Docker con 2 servicios: nextjs standalone + postgres — `docker-compose.prod.yml`
- [x] Dockerfile multi-stage con output standalone de Next.js (ya existente, validado)
- [x] Search global full-text (pg_trgm) — `app/api/search/route.ts` + `docker/init.sql`
- [x] Export a Markdown / CSV — `app/api/databases/[id]/export/route.ts` + `app/api/pages/[id]/export/route.ts`
- [x] Atajos de teclado (⌘K) — `lib/hooks/useKeyboardShortcuts.ts` + `components/search/SearchModal.tsx`
- [x] Backup automático de DB — `scripts/backup.sh` (cron 02:00 UTC, retención 7 días)
- [x] Tests unitarios: `keyboard-shortcuts.test.ts`, `search-modal.test.tsx`
- [x] Tests de integración: `api-search.test.ts`, `api-export-db.test.ts`
- [x] Suite completa: 181 tests, 0 fallos (sin regresiones en Fases 1-4)

### Arquitectura Fase 5
```
app/api/
  search/route.ts                     ← GET ?q= → pg_trgm similarity + fallback ILIKE
  databases/[id]/export/route.ts      ← GET ?format=csv|md → descarga directa
  pages/[id]/export/route.ts          ← GET → BlockNote JSON → Markdown
components/
  search/SearchModal.tsx              ← Command palette ⌘K (Client Component)
  GlobalProviders.tsx                 ← Client wrapper montado en layout
lib/hooks/
  useKeyboardShortcuts.ts             ← Hook genérico: { "meta+k": fn }
docker/
  init.sql                            ← CREATE EXTENSION IF NOT EXISTS pg_trgm
scripts/
  backup.sh                           ← pg_dump | gzip + rotación 7 días
docker-compose.prod.yml               ← Producción: standalone build + backup cron
__tests__/
  unit/keyboard-shortcuts.test.ts
  unit/search-modal.test.tsx
  integration/api-search.test.ts
  integration/api-export-db.test.ts
```

### Dependencias añadidas (Fase 5)
Ninguna nueva — Phase 5 reutiliza la infraestructura existente.

---

## Comandos de desarrollo

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Levantar base de datos
docker compose up postgres -d

# Aplicar schema a la DB
npm run db:push

# Cargar datos de prueba
npm run db:seed

# Servidor de desarrollo
npm run dev

# Tests
npm test
npm run test:coverage

# Prisma Studio (interfaz visual de la DB)
npm run db:studio
```
