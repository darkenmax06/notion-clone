# NotionLocal — Referencia para Claude Code

Clon local de Notion. Next.js 16 + TypeScript + PostgreSQL + Prisma + Docker.
Fases 1–5 completadas (181 tests, 0 fallos).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript estricto |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Estado cliente | Zustand (`lib/store/uiStore.ts`) |
| Mutations | Server Actions + Zod |
| Editor | BlockNote 0.30 (dynamic import, ssr: false) |
| Kanban | dnd-kit |
| Calendario | react-big-calendar |
| UI | Tailwind CSS + shadcn/ui + Lucide icons |
| Tests | Jest 29 + React Testing Library 16 |
| Infra | Docker Compose (dev + prod) |

---

## Reglas críticas de arquitectura

### Server vs Client Components
- **Server por defecto**: layouts, páginas, fetch con Prisma, Route Handlers
- **`"use client"`**: BlockEditor, KanbanView, CalendarView, SidebarClient, SearchModal, stores Zustand
- **Server Actions**: todas las mutations (createPage, updateRecord, etc.)

### Breaking changes Next.js 16
- `params` en Page components y Route Handlers es una **Promise** → siempre `const { id } = await params`
- React 19 requerido

### Patrones establecidos
- Validación con **Zod** en cada Server Action y Route Handler
- `revalidatePath()` después de cada mutation
- Prisma solo en Server Components y Server Actions — nunca en Client Components
- Tests con mock de `@/lib/prisma` (`jest.mock`)
- Integración tests: `@jest-environment node`; UI tests: `@jest-environment jsdom` (default)

---

## Estructura de carpetas clave

```
app/
  layout.tsx                  ← Root layout — añadir GlobalProviders aquí si hace falta
  (workspace)/
    page/[id]/page.tsx        ← Editor de página
    db/[id]/page.tsx          ← Vista base de datos
  api/
    pages/                    ← GET/POST + GET/PUT/DELETE [id]
    databases/                ← CRUD + fields + export (CSV/MD)
    records/                  ← POST + PUT/DELETE [id]
    search/                   ← GET ?q= (pg_trgm + fallback ILIKE)

components/
  sidebar/SidebarServer.tsx   ← Fetch datos, pasa a SidebarClient
  sidebar/SidebarClient.tsx   ← "use client" — árbol interactivo
  editor/BlockEditor.tsx      ← "use client" — BlockNote + autosave debounce 1000ms
  views/DatabaseView.tsx      ← "use client" — orquestrador TABLE/KANBAN/CALENDAR
  views/ViewSelector.tsx      ← Tabs de vista
  views/KanbanView.tsx        ← dnd-kit columnas por SELECT field
  views/CalendarView.tsx      ← react-big-calendar + date-fns localizer es
  search/SearchModal.tsx      ← "use client" — command palette ⌘K
  GlobalProviders.tsx         ← "use client" — wrapper para providers globales

lib/
  prisma.ts                   ← Singleton PrismaClient
  utils.ts                    ← cn() helper
  store/uiStore.ts            ← Zustand: sidebarCollapsed, activePageId
  actions/pages.ts            ← createPage, updatePage, deletePage, getPageTree
  actions/databases.ts        ← createDatabase, updateDatabase, deleteDatabase, createField, updateField, deleteField
  actions/records.ts          ← createRecord, updateRecord, deleteRecord
  hooks/useKeyboardShortcuts.ts ← Hook genérico atajos de teclado

prisma/
  schema.prisma               ← Modelos: Page, Database, Field, Record
  seed.ts                     ← Datos de prueba (habilita pg_trgm + 3 DBs + 6 páginas)
  migrations/                 ← Migraciones Prisma

docker/
  init.sql                    ← CREATE EXTENSION IF NOT EXISTS pg_trgm
scripts/
  backup.sh                   ← pg_dump | gzip, retención 7 días

__tests__/
  unit/                       ← jsdom — componentes y hooks
  integration/                ← node — Route Handlers con mock de prisma
```

---

## Modelos Prisma

```
Page       → id, title, icon, cover, content(Json), parentId, isDeleted, position
Database   → id, title, icon, viewType(TABLE|KANBAN|CALENDAR), kanbanGroupFieldId, pageId
Field      → id, name, type(TEXT|NUMBER|DATE|TIME|SELECT|MULTI_SELECT|CHECKBOX|URL|EMAIL), position, options(Json), databaseId
Record     → id, position, values(Json JSONB), databaseId, isDeleted
```

Los valores de un Record se guardan como `{ "<fieldId>": <value> }`.

---

## Comandos frecuentes

```bash
npm run dev            # Servidor de desarrollo (webpack)
npm test               # Suite completa (181 tests)
npm run test:coverage  # Con reporte de cobertura
npm run db:push        # Aplicar schema sin migración
npm run db:migrate     # Crear migración Prisma
npm run db:seed        # Cargar datos de prueba
npm run db:studio      # Prisma Studio visual

# Docker desarrollo (hot-reload + seed automático)
docker compose up -d

# Docker producción (standalone build + backup cron)
docker compose -f docker-compose.prod.yml up -d
```

---

## Features implementadas (Fase 5 — completo)

- **Search ⌘K**: `SearchModal` + `/api/search` con pg_trgm + fallback ILIKE
- **Export CSV/MD**: `/api/databases/[id]/export?format=csv|md` y `/api/pages/[id]/export`
- **Atajos de teclado**: `useKeyboardShortcuts` hook genérico
- **Backup DB**: `scripts/backup.sh` (cron diario en docker-compose.prod.yml)

---

## Variables de entorno

```
DATABASE_URL=postgresql://notionlocal:dark@localhost:5432/notionlocal  # dev local
DATABASE_URL=postgresql://notionlocal:<pass>@postgres:5432/notionlocal  # docker
```

El archivo `.env.local` no se commitea — crear localmente si se trabaja fuera de Docker.
