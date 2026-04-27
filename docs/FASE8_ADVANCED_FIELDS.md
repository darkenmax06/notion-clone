# Fase 8 - Campos avanzados de base de datos

Fecha de cierre: 26-04-2026

## Alcance implementado

### 8.1 Campo RELATION
- Nuevo `FieldType`: `RELATION`.
- Nuevo modelo Prisma `RecordRelation { id, sourceRecordId, targetRecordId, fieldId }`.
- Persistencia desacoplada de `Record.values`:
  - los enlaces se guardan en `RecordRelation`,
  - en runtime se hidratan en el valor de celda como `string[]`.
- Configuracion en `Field.options`:
  - `{ relationDatabaseId: string | null }`.
- UI de celda:
  - picker multi-seleccion con busqueda inline por etiqueta de registro destino.
- API adicional:
  - `PUT /api/records/[id]/relations` para reemplazar enlaces de un campo relation.
- Server Action adicional:
  - `setRecordRelations(recordId, databaseId, fieldId, targetRecordIds)`.

### 8.2 Campo ROLLUP
- Nuevo `FieldType`: `ROLLUP`.
- Configuracion en `Field.options`:
  - `{ relationFieldId, targetFieldId, function: "count" | "sum" | "avg" | "min" | "max" }`.
- Calculo runtime (no persistido en DB):
  - `COUNT`: total de registros relacionados.
  - `SUM/AVG/MIN/MAX`: agregado numerico sobre `targetFieldId`.
- Render de solo lectura en tabla y panel de detalle.

### 8.3 Campo FORMULA
- Nuevo `FieldType`: `FORMULA`.
- Configuracion en `Field.options`:
  - `{ expression: string }`.
- Evaluacion client-side al render:
  - placeholders por nombre: `{Campo}`,
  - funciones soportadas: `IF(...)`, `DAYS_BETWEEN(...)`,
  - expresiones aritmeticas (via `expr-eval`).
- No se persiste en `Record.values` (valor runtime).

### 8.4 Campo PERSON
- Nuevo `FieldType`: `PERSON`.
- Implementacion actual:
  - texto libre,
  - visual con placeholder/avatar (iniciales) en celda.
- Base lista para migrar a selector real de usuarios en Fase 10.

### 8.5 Campo FILE
- Nuevo `FieldType`: `FILE`.
- Upload endpoint:
  - `POST /api/upload`.
- Almacenamiento configurable:
  - `UPLOAD_STORAGE=local` (default): guarda en `public/uploads`.
  - `UPLOAD_STORAGE=s3`: sube via AWS SDK (`@aws-sdk/client-s3`).
- Valor persistido en celda:
  - `{ name, url, mimeType, size }`.
- UI de celda:
  - nombre + icono + boton de descarga,
  - reemplazo o eliminacion del archivo.

## Cambios de arquitectura

- `lib/database/field-options.ts`:
  - tipos compartidos para opciones de campo y normalizacion.
- `lib/database/computed-fields.ts`:
  - motor runtime de `ROLLUP` y `FORMULA`.
- `app/(workspace)/db/[id]/page.tsx`:
  - hidrata relaciones desde `RecordRelation`,
  - carga catalogos de bases de datos para relation/rollup/formula.
- `components/views/DatabaseView.tsx`:
  - persiste separando valores normales vs relaciones,
  - calcula campos runtime,
  - integra upload y picker relation.

## Archivos principales modificados/agregados

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/actions/databases.ts`
- `lib/actions/records.ts`
- `lib/database/field-options.ts` (nuevo)
- `lib/database/computed-fields.ts` (nuevo)
- `app/(workspace)/db/[id]/page.tsx`
- `app/api/databases/[id]/route.ts`
- `app/api/databases/[id]/fields/route.ts`
- `app/api/databases/[id]/fields/[fieldId]/route.ts`
- `app/api/records/[id]/relations/route.ts` (nuevo)
- `app/api/upload/route.ts` (nuevo)
- `components/views/TableCell.tsx`
- `components/views/AddFieldModal.tsx`
- `components/views/RecordDetailPanel.tsx`
- `components/views/DatabaseView.tsx`
- `components/views/FilterSortBar.tsx`
- `components/views/FieldTypeIcon.tsx`

## Dependencias nuevas

- `expr-eval`
- `@aws-sdk/client-s3`

## Pruebas ejecutadas

- `npm test -- --runInBand`
  - Resultado: **28 suites / 226 tests OK**
- `npm run build`
  - Resultado: **build de produccion OK**

Pruebas nuevas agregadas:
- `__tests__/unit/computed-fields.test.ts`
- `__tests__/unit/records-relations-actions.test.ts`
- `__tests__/integration/api-record-relations.test.ts`
- `__tests__/integration/api-upload.test.ts`

## Validacion de no regresion

- Suite completa unit + integration en verde.
- Build de Next.js/TypeScript en verde.
- Vistas existentes (TABLE/KANBAN/CALENDAR/GALLERY/LIST/TIMELINE) mantienen comportamiento previo.
- Compatibilidad de filtros/ordenamientos conservada para tipos existentes.

