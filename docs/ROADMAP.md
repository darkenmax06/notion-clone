# NotionLocal — Roadmap de desarrollo (Next.js 16 Edition)

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript estricto |
| Editor | BlockNote 0.30 (dynamic import, ssr: false) |
| Estado cliente | Zustand — `lib/store/uiStore.ts` |
| Mutations | Server Actions + Zod |
| API | Route Handlers en `/app/api/` |
| Base de datos | PostgreSQL 16 + Prisma ORM (JSONB para registros) |
| Kanban | dnd-kit |
| Calendario | react-big-calendar + date-fns |
| UI | Tailwind CSS + shadcn/ui + Lucide icons |
| Tests | Jest 29 + React Testing Library 16 |
| Infra | Docker Compose (dev + prod standalone) |

---

## Reglas de arquitectura

- **Server por defecto**: layouts, páginas, fetch con Prisma, Route Handlers
- **`"use client"`**: BlockEditor, KanbanView, CalendarView, SidebarClient, SearchModal, stores Zustand
- **Server Actions**: todas las mutations (createPage, updateRecord, etc.)
- **`params` es Promise** en Next.js 16 → siempre `const { id } = await params`
- **`dynamic = "force-dynamic"`** en todos los page.tsx que usan Prisma (evita pre-render en build)

---

## Fases completadas

### Fase 1 — Setup & Scaffolding ✅
- Next.js 16 App Router + TypeScript + React 19
- Prisma ORM + PostgreSQL en Docker, schema inicial
- Zustand para estado global del cliente
- Tailwind CSS + shadcn/ui
- Jest + React Testing Library (64 tests)
- Script de seed con datos de prueba

### Fase 2 — Sidebar & Editor de páginas ✅
- Sidebar jerárquico (páginas anidadas) — SidebarServer + SidebarClient
- BlockNote con dynamic import + autosave debounce 1 000 ms
- Slash commands (/heading, /list, /code…) — integrados en BlockNote
- Breadcrumb de navegación
- 64 → 104 tests

### Fase 3 — Bases de datos & Tabla ✅
- Modelo Database → Fields → Records (JSONB flexible)
- Vista tabla con columnas editables
- Tipos: TEXT, NUMBER, DATE, TIME, SELECT, MULTI_SELECT, CHECKBOX, URL, EMAIL
- Filtros y ordenamiento client-side
- Panel de detalle por registro
- Modal para añadir campo con opciones SELECT
- 104 → 132 tests

### Fase 4 — Kanban & Calendario ✅
- Kanban con dnd-kit, columnas por campo Select, drag-and-drop entre columnas
- Calendario mensual/semanal/diario con react-big-calendar
- Selector de vista (TABLE / KANBAN / CALENDAR) persistido en DB
- Quick-add desde calendario
- 132 → 156 tests

### Fase 5 — Polish & Docker Production ✅
- Docker multi-stage standalone (Dockerfile + docker-compose.prod.yml)
- Search global ⌘K con pg_trgm + fallback ILIKE
- Export CSV y Markdown para bases de datos y páginas
- Atajos de teclado genéricos (useKeyboardShortcuts)
- Backup automático de DB (cron diario, retención 7 días)
- Modo oscuro con toggle flotante y persistencia localStorage
- Renombrado inline en sidebar y cabeceras
- Edición de iconos (emoji) en páginas y bases de datos
- 156 → 181 tests

---

## Fase 6 — Core UI (paridad con Notion) 🔲

**Objetivo**: cubrir las features visibles más icónicas de Notion que un usuario nuevo espera encontrar.

### 6.1 Papelera (Trash)
- Campo `isDeleted` ya existe en `Page` y `Record`
- Añadir sección "Papelera" en el sidebar (icono Trash)
- Página `/trash` que lista páginas eliminadas con opciones Restaurar / Eliminar permanente
- Server Actions: `restorePage(id)`, `permanentlyDeletePage(id)`
- Soft-delete encadenado: eliminar página padre marca hijos como `isDeleted`
- **Archivos**: `app/(workspace)/trash/page.tsx`, `lib/actions/pages.ts` (2 nuevas actions)

### 6.2 Portadas de página (Cover)
- Campo `cover` ya existe en `Page` (string URL)
- Botón "Añadir portada" en `PageTitleEditor` cuando no hay cover
- Picker: colores sólidos predefinidos (10 opciones) + input de URL de imagen
- Soporte para gradientes CSS como valor de cover (`linear-gradient(...)`)
- Botón "Cambiar" / "Eliminar" al hacer hover sobre la portada
- **Archivos**: `components/editor/PageTitleEditor.tsx`, `lib/actions/pages.ts`

### 6.3 Ancho completo por página (Full Width)
- Campo nuevo `isFullWidth boolean @default(false)` en modelo `Page`
- Toggle en el menú de opciones de la página (icono ↔)
- Cuando activo: `max-w-3xl` → `max-w-full px-16` en el wrapper del editor
- Persistido por Server Action `updatePage({ isFullWidth })`
- **Archivos**: `prisma/schema.prisma`, `app/(workspace)/page/[id]/page.tsx`

### 6.4 Favoritos / Páginas fijadas
- Campo nuevo `isFavorite boolean @default(false)` en modelo `Page`
- Botón estrella (⭐) en la barra de herramientas de la página
- Sección "Favoritos" en el sidebar encima de "Páginas" (igual que Notion)
- Server Action `toggleFavorite(id)`
- **Archivos**: `prisma/schema.prisma`, `components/sidebar/SidebarServer.tsx`, `components/sidebar/SidebarClient.tsx`

### 6.5 Historial de versiones
- Modelo nuevo `PageVersion { id, pageId, content Json, title String, createdAt }` en Prisma
- Guardar snapshot en cada autosave (o cada N segundos si cambió)
- Panel lateral "Historial" accesible desde el menú de página
- Restaurar versión → crea nueva versión con el contenido actual antes de restaurar
- **Archivos**: `prisma/schema.prisma`, `lib/actions/pages.ts`, `components/editor/VersionHistoryPanel.tsx`

### 6.6 Templates de página
- Modelo `Template { id, title, icon, content Json, isSystem boolean }` o reutilizar `Page` con flag
- Galería de templates al crear página nueva (modal)
- Templates del sistema: Meeting Notes, Weekly Review, Project Brief, Bug Report
- Opción "Guardar como template" desde cualquier página
- **Archivos**: `app/(workspace)/templates/page.tsx`, `components/ui/TemplateGallery.tsx`

---

## Fase 7 — Vistas adicionales de base de datos 🔲

### 7.1 Vista Gallery (Galería)
- Nueva opción en ViewSelector: GALLERY
- Cards con imagen (campo URL o cover), título y N campos configurables
- Selector de campo imagen en la toolbar de la vista
- Campo `galleryImageFieldId` en modelo `Database`
- **Archivos**: `components/views/GalleryView.tsx`, `prisma/schema.prisma`
- **Dependencias**: ninguna nueva

### 7.2 Vista List (Lista)
- Nueva opción: LIST
- Fila por registro con solo título + 2-3 campos inline (sin tabla completa)
- Útil para listas de tareas / to-do
- **Archivos**: `components/views/ListView.tsx`

### 7.3 Vista Timeline (Gantt)
- Nueva opción: TIMELINE
- Requiere campo DATE de inicio y campo DATE de fin configurables
- Render horizontal con barras por semana/mes
- Drag de las barras para mover fechas
- Campos `timelineStartFieldId` y `timelineEndFieldId` en `Database`
- **Dependencias**: `react-gantt-chart` o implementación custom con CSS Grid
- **Archivos**: `components/views/TimelineView.tsx`, `prisma/schema.prisma`

### 7.4 Vista Board mejorada (Kanban 2.0)
- Sub-grupos: agrupar por un 2º campo dentro de cada columna
- Contador de registros por columna
- Colapsar/expandir columnas
- Límite WIP (work-in-progress) por columna
- Añadir nueva columna directamente desde la vista (crea opción en el campo Select)

### 7.5 Agrupación en vista Tabla
- Agrupar filas por valor de un campo (Select, Checkbox, Date)
- Grupos colapsables con contador
- `GROUP BY` lógico en client-side (sin cambios en API)

---

## Fase 8 — Campos avanzados de base de datos 🔲

### 8.1 Campo Relation (Relación entre bases de datos)
- Nuevo `FieldType`: `RELATION`
- Modelo nuevo `RecordRelation { id, sourceRecordId, targetRecordId, fieldId }`
- UI: picker de registros de la DB destino (búsqueda inline)
- Configuración del campo: qué base de datos enlaza
- Campo `relationDatabaseId` en `Field.options` (JSON)
- **Complejidad**: alta — requiere cambios en schema, API y UI de celda

### 8.2 Campo Rollup
- Nuevo `FieldType`: `ROLLUP`
- Depende de un campo RELATION existente
- Funciones: COUNT, SUM, AVG, MIN, MAX sobre el campo relacionado
- Se calcula en runtime al cargar los registros
- Configuración: `{ relationFieldId, targetFieldId, function: "sum"|"count"|... }`

### 8.3 Campo Formula
- Nuevo `FieldType`: `FORMULA`
- Parser de expresiones simples: `{Campo A} + {Campo B}`, `IF({Completado}, "✓", "")`, `DAYS_BETWEEN({Inicio}, {Fin})`
- Evaluación client-side al renderizar la celda (no se guarda en `values`)
- Configuración: `{ expression: string }` en `Field.options`
- **Dependencias**: `expr-eval` o `mathjs` para parsear expresiones

### 8.4 Campo People / Asignado
- Nuevo `FieldType`: `PERSON`
- Preparación para multi-usuario (Fase 10)
- Por ahora: campo de texto libre con avatar placeholder
- En Fase 10: picker de usuarios reales del workspace

### 8.5 Campo File / Adjunto
- Nuevo `FieldType`: `FILE`
- Upload de archivos con almacenamiento local (`/uploads/`) o S3 configurable
- Celda muestra nombre del archivo + icono de tipo + botón de descarga
- API Route para upload: `POST /api/upload` → devuelve URL
- **Dependencias**: `formidable` o multer para manejo de multipart

---

## Fase 9 — Editor avanzado 🔲

### 9.1 Menciones de página (@mentions)
- Al escribir `@` en el editor → menú inline con búsqueda de páginas
- Insertar inline mention como nodo custom de BlockNote
- El nodo renderiza el icono + título de la página con link
- Al hacer clic → navega a la página
- **Implementación**: BlockNote custom inline content type
- **Archivos**: `lib/editor/MentionExtension.ts`, `components/editor/MentionSuggestion.tsx`

### 9.2 Backlinks
- Al mencionar una página, registrar en modelo `Backlink { sourcePageId, targetPageId }`
- Sección "Mencionado en" al pie de cada página (colapsable)
- Server Action `getBacklinks(pageId)` → lista de páginas que enlazan
- **Archivos**: `components/editor/BacklinksPanel.tsx`

### 9.3 Bases de datos inline en páginas
- Bloque custom de BlockNote: `/database`
- Renderiza una vista TABLE/KANBAN de una DB existente dentro de la página
- Picker de DB al insertar el bloque
- La DB sigue siendo la misma entidad — los cambios se reflejan en `/db/[id]`
- **Implementación**: BlockNote custom block type con Server Component embebido

### 9.4 Tabla de contenidos (TOC)
- Bloque `/toc` que genera una lista de todos los headings del documento
- Se actualiza automáticamente al cambiar el contenido (escucha el editor)
- Links de anclaje a cada heading
- **Implementación**: BlockNote custom block + `editor.document` listener

### 9.5 Columnas (multi-column layout)
- BlockNote ya soporta `/columns` en versiones recientes
- Activar la extensión de columnas en `useCreateBlockNote`
- UI para añadir/eliminar columnas y ajustar ancho (drag de separador)

### 9.6 Bloques adicionales
| Bloque | Implementación |
|--------|---------------|
| Callout (ℹ️ 📌) | BlockNote custom block con icono + color |
| Toggle (colapsable) | BlockNote ya soporta toggle list |
| Math / LaTeX | Extensión `@blocknote/xl-math` si disponible, o `react-katex` |
| Embed (YouTube, X, Figma) | BlockNote custom block + oEmbed API |
| Tabla nativa | BlockNote ya incluye `TableBlock` |
| Archivo adjunto | Depende de 8.5 |

---

## Fase 10 — Multi-usuario & Workspaces 🔲

### 10.1 Autenticación
- **Dependencias**: `next-auth` v5 (Auth.js) con providers: Email (magic link), Google, GitHub
- Modelo nuevo: `User { id, name, email, image, createdAt }`
- Modelo nuevo: `Workspace { id, name, slug, icon, ownerId }`
- Modelo nuevo: `WorkspaceMember { workspaceId, userId, role: OWNER|ADMIN|MEMBER|VIEWER }`
- Todas las entidades existentes (`Page`, `Database`, `Record`) reciben `workspaceId`
- Middleware de Next.js para proteger rutas autenticadas

### 10.2 Permisos por página
- Modelo `PagePermission { pageId, userId, level: FULL|EDIT|COMMENT|VIEW }`
- Herencia de permisos desde el workspace hacia páginas hijas
- UI de compartir: modal con búsqueda de miembros + selector de nivel
- Link público (compartir con `?token=...`) con nivel VIEW

### 10.3 Colaboración en tiempo real
- **Opción A (simple)**: polling cada 5s con `router.refresh()` — sin dependencias nuevas
- **Opción B (real-time)**: `PartyKit` o `Liveblocks` + BlockNote collaboration plugin
- Cursores de otros usuarios visibles en el editor
- Indicador "N personas están editando"
- **Dependencias Opción B**: `@liveblocks/react` + `@liveblocks/react-blocknote`

### 10.4 Comentarios inline
- Modelo `Comment { id, pageId, blockId, content, userId, resolvedAt, createdAt }`
- Seleccionar texto → botón "Comentar" → hilo de comentarios
- Panel lateral de comentarios
- Notificaciones de nuevos comentarios

### 10.5 Notificaciones
- Modelo `Notification { id, userId, type, payload Json, readAt, createdAt }`
- Tipos: `PAGE_SHARED`, `COMMENT_ADDED`, `MENTION`, `RECORD_ASSIGNED`
- Badge en sidebar + panel de notificaciones
- Email opcional vía `Resend` o `Nodemailer`

---

## Fase 11 — Import & Integraciones 🔲

### 11.1 Import CSV → Base de datos
- UI: botón "Importar CSV" en DatabaseView
- Parse en el servidor con `csv-parse`
- Primera fila como nombres de campo (detecta tipos automáticamente)
- Vista previa antes de confirmar
- **Archivos**: `app/api/databases/[id]/import/route.ts`

### 11.2 Import Markdown → Página
- Subir archivo `.md` → crea página con contenido convertido a BlockNote JSON
- Usa `markdown-it` + mapeo a bloques BlockNote
- **Archivos**: `app/api/pages/import/route.ts`

### 11.3 Import desde Notion
- Aceptar export ZIP de Notion (formato HTML + CSV)
- Parser de HTML → BlockNote JSON para páginas
- Parser de CSV → Records para bases de datos
- Mantiene jerarquía de páginas
- **Complejidad**: alta

### 11.4 API pública (REST)
- Clave de API por workspace (`ApiKey { id, workspaceId, key, name, createdAt }`)
- Endpoints documentados: `GET/POST /api/v1/pages`, `GET/POST /api/v1/databases/{id}/records`
- Swagger/OpenAPI en `/api/docs`
- Rate limiting con `@upstash/ratelimit` o middleware propio
- **Útil para**: Zapier, Make, integraciones custom

---

## Métricas de tests por fase

| Fase | Tests acumulados |
|------|-----------------|
| 1 | 40 |
| 2 | 64 |
| 3 | 104 |
| 4 | 132 |
| 5 | 181 |
| 6 (objetivo) | ~220 |
| 7 (objetivo) | ~260 |
| 8 (objetivo) | ~310 |
| 9 (objetivo) | ~350 |
| 10 (objetivo) | ~420 |
| 11 (objetivo) | ~460 |

---

## Prioridad de implementación recomendada

Para máxima paridad visual con Notion en el menor tiempo:

1. **Papelera** — 1 día — el usuario ya espera poder recuperar páginas
2. **Portadas + Full-width** — 1 día — diferencia visual enorme
3. **Favoritos** — 0.5 días — sidebar incompleto sin esto
4. **Vista Gallery** — 1.5 días — 4ª vista más usada de Notion
5. **Menciones @** — 2 días — fundamental en flujos de trabajo
6. **Vista List** — 0.5 días — simple de implementar
7. **Vista Timeline** — 2 días — muy demandada en gestión de proyectos
8. **Campo Relation** — 3 días — desbloquea casos de uso relacionales
9. **Templates** — 1 día — mejora mucho la experiencia de onboarding
10. **Auth + Workspaces** — 5+ días — necesario para uso empresarial real

---

## Comandos de desarrollo

```bash
npm install --legacy-peer-deps   # instalar dependencias
docker compose up postgres -d    # levantar base de datos
npm run db:push                  # aplicar schema
npm run db:seed                  # datos de prueba
npm run dev                      # servidor de desarrollo
npm test                         # suite completa
npm run test:coverage            # con reporte de cobertura
npm run db:studio                # Prisma Studio visual
```
