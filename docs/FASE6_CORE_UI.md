# Fase 6 - Core UI (Paridad con Notion)

Fecha de cierre: 26-04-2026

## Alcance implementado

### 6.1 Papelera (Trash)
- Sidebar con acceso a `Papelera` (icono `Trash2`) y contador de items eliminados.
- Nueva ruta [`app/(workspace)/trash/page.tsx`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/app/(workspace)/trash/page.tsx).
- Acciones de servidor activas:
  - `restorePage(id)`
  - `permanentlyDeletePage(id)`
- Soft delete encadenado ya existente y mantenido (`deletePage` recursivo).
- Restauracion mejorada a recursiva para descendientes.

### 6.2 Portadas (Cover)
- `PageTitleEditor` con:
  - `Anadir portada` cuando no existe.
  - Picker de 10 colores + gradientes + URL.
  - Soporte de `linear-gradient(...)` y `radial-gradient(...)`.
  - Acciones hover sobre portada: `Cambiar` y `Eliminar`.
- Persistencia via `updatePage({ cover })`.
- API `PUT /api/pages/[id]` actualizada para aceptar URL, hex y gradiente.

### 6.3 Full Width por pagina
- Persistencia por `updatePage({ isFullWidth })`.
- Toggle disponible en menu de opciones de pagina.
- Wrapper del editor:
  - normal: `max-w-3xl px-4`
  - ancho completo: `max-w-full px-16`

### 6.4 Favoritos
- Boton de estrella en toolbar de pagina (`toggleFavorite`).
- Seccion `Favoritos` en sidebar por encima de `Paginas`.

### 6.5 Historial de versiones
- Snapshot durante autosave (throttle de 30s cuando hay cambios).
- Panel lateral `Historial` en opciones de pagina.
- `restorePageVersion` mantiene version de seguridad previa a restaurar.

### 6.6 Templates
- Reuso de modelo `Page` con flags `isTemplate` + `isSystem`.
- Plantillas del sistema garantizadas por accion (`ensureSystemTemplates`):
  - Meeting Notes
  - Weekly Review
  - Project Brief
  - Bug Report
- Galeria modal de templates: [`components/ui/TemplateGallery.tsx`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/components/ui/TemplateGallery.tsx)
- Ruta dedicada de templates: [`app/(workspace)/templates/page.tsx`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/app/(workspace)/templates/page.tsx)
- Opcion `Guardar como template` desde el menu de pagina.

## Archivos principales modificados

- [`lib/actions/pages.ts`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/lib/actions/pages.ts)
- [`components/editor/PageTitleEditor.tsx`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/components/editor/PageTitleEditor.tsx)
- [`components/editor/BlockEditor.tsx`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/components/editor/BlockEditor.tsx)
- [`components/editor/BlockEditorClient.tsx`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/components/editor/BlockEditorClient.tsx)
- [`components/sidebar/SidebarServer.tsx`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/components/sidebar/SidebarServer.tsx)
- [`components/sidebar/SidebarClient.tsx`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/components/sidebar/SidebarClient.tsx)
- [`app/(workspace)/page/[id]/page.tsx`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/app/(workspace)/page/[id]/page.tsx)
- [`app/api/pages/[id]/route.ts`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/app/api/pages/[id]/route.ts)
- [`prisma/seed.ts`](/C:/Users/ramse/Documents/Proyectos Ramses/ramtion/prisma/seed.ts)

## Pruebas ejecutadas

- `npm test -- --runInBand`
  - Resultado: **20 suites / 195 tests OK**
- `npm run build`
  - Resultado: **build de produccion OK**

## Validacion de no regresion

- Se mantienen en verde suites unitarias e integracion existentes.
- APIs de paginas siguen cubiertas por tests de `GET/PUT/DELETE`.
- Sidebar, editor y autosave mantienen cobertura con pruebas adaptadas.

