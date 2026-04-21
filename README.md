# NotionLocal

Clon local y auto-hospedado de Notion construido con Next.js 16, PostgreSQL y Docker. Diseñado para que empresas y equipos tengan un espacio de trabajo tipo Notion completamente bajo su control, sin depender de servicios externos ni pagar suscripciones.

## Características actuales

| Área | Funcionalidad |
|------|--------------|
| **Páginas** | Editor de bloques (BlockNote) con autosave, jerarquía anidada, iconos emoji, portadas, breadcrumb, renombrado inline |
| **Base de datos** | Tabla, Kanban y Calendario — campos TEXT, NUMBER, DATE, TIME, SELECT, MULTI_SELECT, CHECKBOX, URL, EMAIL |
| **Sidebar** | Árbol jerárquico de páginas, sección de bases de datos, colapso/expansión |
| **Búsqueda** | Búsqueda global full-text ⌘K con pg_trgm (PostgreSQL) |
| **Export** | CSV y Markdown para bases de datos; Markdown para páginas |
| **UI/UX** | Modo oscuro con persistencia, atajos de teclado, diseño responsive |
| **Infra** | Docker Compose para dev y producción, backup automático diario de la DB |

## Stack técnico

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Base de datos**: PostgreSQL 16 + Prisma ORM
- **Editor**: BlockNote 0.30
- **UI**: Tailwind CSS + shadcn/ui + Lucide icons
- **Estado**: Zustand (solo cliente)
- **Tests**: Jest 29 + React Testing Library (181 tests)
- **Infra**: Docker + Docker Compose

---

## Instalación en servidor local (para uso empresarial)

### Requisitos previos

| Herramienta | Versión mínima | Verificar |
|-------------|---------------|-----------|
| Docker | 24.x | `docker --version` |
| Docker Compose | v2.x | `docker compose version` |
| Git | cualquiera | `git --version` |

> Node.js **no es necesario** en el servidor — la aplicación corre completamente dentro de Docker.

---

### Opción A — Producción con Docker (recomendada para empresas)

Esta opción levanta la aplicación como imagen standalone optimizada, junto con PostgreSQL y un servicio de backup automático.

**1. Clonar el repositorio**

```bash
git clone https://github.com/darkenmax06/notion-clone.git notionlocal
cd notionlocal
```

**2. Crear el archivo de variables de entorno**

```bash
cp .env.example .env.prod
```

Editar `.env.prod` con valores seguros:

```env
POSTGRES_USER=notionlocal
POSTGRES_PASSWORD=cambiar_por_contraseña_segura
POSTGRES_DB=notionlocal
```

> La variable `DATABASE_URL` se construye automáticamente desde las anteriores en `docker-compose.prod.yml`.

**3. Construir la imagen de producción**

```bash
docker compose -f docker-compose.prod.yml build
```

El build tarda 2-5 minutos la primera vez. Incluye:
- Compilación de Next.js en modo standalone
- Generación del cliente Prisma
- Imagen final ~200 MB (Alpine Linux)

**4. Levantar los servicios**

```bash
docker compose -f docker-compose.prod.yml up -d
```

Esto inicia 3 contenedores:
| Contenedor | Función | Puerto |
|------------|---------|--------|
| `notionlocal_postgres_prod` | Base de datos PostgreSQL 16 | 5433 (host) |
| `notionlocal_app_prod` | Aplicación Next.js | 3000 |
| `notionlocal_backup` | Backup automático diario | — |

**5. Verificar que la aplicación está activa**

```bash
curl http://localhost:3000
# Debe devolver HTML de la página de inicio
```

O abrir en el navegador: **http://localhost:3000**

**6. (Opcional) Cargar datos de prueba**

```bash
docker exec notionlocal_app_prod node -e "
const { execSync } = require('child_process');
execSync('npx prisma db seed', { stdio: 'inherit' });
"
```

**7. (Opcional) Exponer en la red local de la empresa**

Si el servidor tiene IP fija (por ejemplo `192.168.1.100`), la aplicación ya es accesible en `http://192.168.1.100:3000` desde cualquier equipo en la misma red.

Para usar un dominio interno (`notionlocal.empresa.com`), configurar un reverse proxy (Nginx o Caddy) apuntando al puerto 3000.

**Ejemplo con Nginx:**

```nginx
server {
    listen 80;
    server_name notionlocal.empresa.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### Opción B — Desarrollo local (para desarrolladores)

Requiere Node.js 20+ instalado en la máquina.

**1. Clonar e instalar dependencias**

```bash
git clone https://github.com/darkenmax06/notion-clone.git notionlocal
cd notionlocal
npm install --legacy-peer-deps
```

**2. Configurar variables de entorno**

Crear archivo `.env.local` en la raíz:

```env
DATABASE_URL=postgresql://notionlocal:dark@localhost:5432/notionlocal
```

**3. Levantar PostgreSQL con Docker**

```bash
docker compose up postgres -d
```

**4. Aplicar el schema y cargar datos de prueba**

```bash
npm run db:push    # crea las tablas
npm run db:seed    # carga datos de ejemplo
```

**5. Iniciar el servidor de desarrollo**

```bash
npm run dev
```

Abrir en el navegador: **http://localhost:3000**

---

## Gestión del entorno de producción

### Ver logs en tiempo real

```bash
docker logs notionlocal_app_prod -f
docker logs notionlocal_postgres_prod -f
```

### Reiniciar la aplicación

```bash
docker compose -f docker-compose.prod.yml restart nextjs
```

### Parar todos los servicios

```bash
docker compose -f docker-compose.prod.yml down
```

### Actualizar a una nueva versión

```bash
git pull
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Backup manual de la base de datos

```bash
docker exec notionlocal_postgres_prod pg_dump \
  -U notionlocal notionlocal | gzip > backup_$(date +%Y%m%d).sql.gz
```

Los backups automáticos se guardan en `./backups/` con retención de 7 días.

### Restaurar un backup

```bash
gunzip -c backups/notionlocal_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i notionlocal_postgres_prod psql -U notionlocal notionlocal
```

---

## Estructura del proyecto

```
notionlocal/
├── app/
│   ├── layout.tsx                    # Root layout + providers globales
│   ├── page.tsx                      # Página de inicio
│   ├── globals.css                   # Estilos globales + override BlockNote
│   ├── (workspace)/
│   │   ├── page/[id]/page.tsx        # Editor de página
│   │   └── db/[id]/page.tsx          # Vista base de datos
│   └── api/
│       ├── pages/                    # CRUD páginas
│       ├── databases/                # CRUD bases de datos + export
│       ├── records/                  # CRUD registros
│       └── search/                   # Búsqueda full-text
├── components/
│   ├── sidebar/                      # SidebarServer + SidebarClient
│   ├── editor/                       # BlockEditor + PageTitleEditor
│   ├── views/                        # TABLE, KANBAN, CALENDAR, filtros
│   ├── search/                       # SearchModal (⌘K)
│   └── ui/                           # DarkModeToggle, Breadcrumb, etc.
├── lib/
│   ├── prisma.ts                     # Singleton PrismaClient
│   ├── actions/                      # Server Actions (pages, databases, records)
│   └── hooks/                        # useKeyboardShortcuts
├── prisma/
│   ├── schema.prisma                 # Modelos: Page, Database, Field, Record
│   ├── seed.ts                       # Datos de prueba
│   └── migrations/
├── docker/
│   ├── entrypoint.sh                 # db push + start en producción
│   └── init.sql                      # CREATE EXTENSION pg_trgm
├── scripts/
│   └── backup.sh                     # pg_dump + rotación 7 días
├── __tests__/                        # 181 tests (unit + integration)
├── Dockerfile                        # Multi-stage: deps → builder → runner
├── docker-compose.yml                # Dev: nextjs + postgres con hot-reload
└── docker-compose.prod.yml           # Prod: standalone + postgres + backup
```

---

## Comandos de referencia rápida

```bash
# --- Desarrollo ---
npm run dev              # servidor con hot-reload
npm test                 # suite de tests (181 tests)
npm run test:coverage    # tests + reporte de cobertura
npm run db:studio        # Prisma Studio (interfaz visual de la DB)
npm run db:push          # aplicar schema sin migración
npm run db:migrate       # crear migración Prisma
npm run db:seed          # datos de prueba

# --- Producción ---
docker compose -f docker-compose.prod.yml build          # construir imagen
docker compose -f docker-compose.prod.yml up -d          # levantar servicios
docker compose -f docker-compose.prod.yml down           # parar servicios
docker compose -f docker-compose.prod.yml logs -f        # ver logs
```

---

## Roadmap

Ver [docs/ROADMAP.md](docs/ROADMAP.md) para el plan completo de desarrollo hacia paridad 1:1 con Notion (11 fases que cubren: papelera, portadas, favoritos, vistas Gallery/List/Timeline, campos Relation/Formula/Rollup, menciones @, backlinks, multi-usuario, colaboración en tiempo real y más).

---

## Licencia

MIT — libre para uso personal y empresarial.
