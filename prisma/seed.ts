import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Habilitar pg_trgm para búsqueda full-text (idempotente)
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  console.log("✓ Extensión pg_trgm habilitada");

  console.log("Limpiando datos existentes…");
  await prisma.record.deleteMany();
  await prisma.field.deleteMany();
  await prisma.database.deleteMany();
  await prisma.page.deleteMany();

  console.log("Creando páginas de prueba…");

  const home = await prisma.page.create({
    data: { title: "Inicio", icon: "🏠", position: 0 },
  });

  const notes = await prisma.page.create({
    data: { title: "Notas de trabajo", icon: "📝", position: 1 },
  });

  const projects = await prisma.page.create({
    data: { title: "Proyectos", icon: "🚀", position: 2 },
  });

  await prisma.page.create({
    data: {
      title: "Reunión semanal",
      icon: "📅",
      parentId: notes.id,
      position: 0,
      content: [
        {
          id: "b1",
          type: "heading",
          props: { level: 1, textAlignment: "left" },
          content: [{ type: "text", text: "Reunión semanal", styles: {} }],
          children: [],
        },
        {
          id: "b2",
          type: "paragraph",
          props: { textAlignment: "left" },
          content: [{ type: "text", text: "Puntos a tratar esta semana.", styles: {} }],
          children: [],
        },
      ],
    },
  });

  await prisma.page.create({
    data: { title: "Ideas pendientes", icon: "💡", parentId: notes.id, position: 1 },
  });

  await prisma.page.create({
    data: {
      title: "NotionLocal — Desarrollo",
      icon: "⚙️",
      parentId: projects.id,
      position: 0,
      content: [
        {
          id: "b3",
          type: "heading",
          props: { level: 1, textAlignment: "left" },
          content: [{ type: "text", text: "NotionLocal", styles: {} }],
          children: [],
        },
        {
          id: "b4",
          type: "paragraph",
          props: { textAlignment: "left" },
          content: [
            {
              type: "text",
              text: "Clon local de Notion con Next.js 16, Prisma y PostgreSQL.",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
  });

  await prisma.page.update({
    where: { id: home.id },
    data: {
      content: [
        {
          id: "b5",
          type: "heading",
          props: { level: 1, textAlignment: "left" },
          content: [{ type: "text", text: "Bienvenido a NotionLocal", styles: {} }],
          children: [],
        },
        {
          id: "b6",
          type: "paragraph",
          props: { textAlignment: "left" },
          content: [
            {
              type: "text",
              text: "Usa el sidebar para navegar. Haz clic en + para crear nuevas páginas.",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
  });

  // -------------------------------------------------------------------------
  // Database 1: Tareas del proyecto (vista KANBAN por defecto)
  // -------------------------------------------------------------------------
  console.log("Creando base de datos Tareas…");

  const taskDb = await prisma.database.create({
    data: { title: "Tareas del proyecto", icon: "✅", pageId: projects.id, viewType: "KANBAN" },
  });

  const taskNameField = await prisma.field.create({
    data: { name: "Tarea", type: "TEXT", position: 0, databaseId: taskDb.id },
  });

  const taskStatusField = await prisma.field.create({
    data: {
      name: "Estado",
      type: "SELECT",
      position: 1,
      options: [
        { value: "Pendiente", color: "#ef4444" },
        { value: "En progreso", color: "#f59e0b" },
        { value: "Revisión", color: "#8b5cf6" },
        { value: "Completado", color: "#22c55e" },
      ],
      databaseId: taskDb.id,
    },
  });

  const taskPriorityField = await prisma.field.create({
    data: {
      name: "Prioridad",
      type: "SELECT",
      position: 2,
      options: [
        { value: "Alta", color: "#ef4444" },
        { value: "Media", color: "#f59e0b" },
        { value: "Baja", color: "#3b82f6" },
      ],
      databaseId: taskDb.id,
    },
  });

  const taskDueDateField = await prisma.field.create({
    data: { name: "Fecha límite", type: "DATE", position: 3, databaseId: taskDb.id },
  });

  const taskDoneField = await prisma.field.create({
    data: { name: "Completado", type: "CHECKBOX", position: 4, databaseId: taskDb.id },
  });

  const taskEstField = await prisma.field.create({
    data: { name: "Estimación (h)", type: "NUMBER", position: 5, databaseId: taskDb.id },
  });

  await prisma.record.createMany({
    data: [
      {
        position: 0,
        values: {
          [taskNameField.id]: "Configurar Next.js 16",
          [taskStatusField.id]: "Completado",
          [taskPriorityField.id]: "Alta",
          [taskDueDateField.id]: "2026-04-05",
          [taskDoneField.id]: true,
          [taskEstField.id]: 4,
        },
        databaseId: taskDb.id,
      },
      {
        position: 1,
        values: {
          [taskNameField.id]: "Implementar editor BlockNote",
          [taskStatusField.id]: "Completado",
          [taskPriorityField.id]: "Alta",
          [taskDueDateField.id]: "2026-04-08",
          [taskDoneField.id]: true,
          [taskEstField.id]: 8,
        },
        databaseId: taskDb.id,
      },
      {
        position: 2,
        values: {
          [taskNameField.id]: "Vista tabla Phase 3",
          [taskStatusField.id]: "Completado",
          [taskPriorityField.id]: "Alta",
          [taskDueDateField.id]: "2026-04-14",
          [taskDoneField.id]: true,
          [taskEstField.id]: 12,
        },
        databaseId: taskDb.id,
      },
      {
        position: 3,
        values: {
          [taskNameField.id]: "Vista Kanban con dnd-kit",
          [taskStatusField.id]: "En progreso",
          [taskPriorityField.id]: "Alta",
          [taskDueDateField.id]: "2026-04-22",
          [taskDoneField.id]: false,
          [taskEstField.id]: 10,
        },
        databaseId: taskDb.id,
      },
      {
        position: 4,
        values: {
          [taskNameField.id]: "Vista Calendario react-big-calendar",
          [taskStatusField.id]: "En progreso",
          [taskPriorityField.id]: "Alta",
          [taskDueDateField.id]: "2026-04-25",
          [taskDoneField.id]: false,
          [taskEstField.id]: 6,
        },
        databaseId: taskDb.id,
      },
      {
        position: 5,
        values: {
          [taskNameField.id]: "Selector de vistas",
          [taskStatusField.id]: "Revisión",
          [taskPriorityField.id]: "Media",
          [taskDueDateField.id]: "2026-04-20",
          [taskDoneField.id]: false,
          [taskEstField.id]: 3,
        },
        databaseId: taskDb.id,
      },
      {
        position: 6,
        values: {
          [taskNameField.id]: "Quick-add desde calendario",
          [taskStatusField.id]: "Pendiente",
          [taskPriorityField.id]: "Media",
          [taskDueDateField.id]: "2026-04-28",
          [taskDoneField.id]: false,
          [taskEstField.id]: 4,
        },
        databaseId: taskDb.id,
      },
      {
        position: 7,
        values: {
          [taskNameField.id]: "Tests unitarios Phase 4",
          [taskStatusField.id]: "Pendiente",
          [taskPriorityField.id]: "Alta",
          [taskDueDateField.id]: "2026-04-30",
          [taskDoneField.id]: false,
          [taskEstField.id]: 5,
        },
        databaseId: taskDb.id,
      },
      {
        position: 8,
        values: {
          [taskNameField.id]: "Docker producción Phase 5",
          [taskStatusField.id]: "Pendiente",
          [taskPriorityField.id]: "Baja",
          [taskDueDateField.id]: "2026-05-10",
          [taskDoneField.id]: false,
          [taskEstField.id]: 8,
        },
        databaseId: taskDb.id,
      },
    ],
  });

  // -------------------------------------------------------------------------
  // Database 2: Eventos del mes (vista CALENDAR por defecto)
  // -------------------------------------------------------------------------
  console.log("Creando base de datos Eventos…");

  const eventDb = await prisma.database.create({
    data: { title: "Eventos del mes", icon: "📅", viewType: "CALENDAR" },
  });

  const evNameField = await prisma.field.create({
    data: { name: "Evento", type: "TEXT", position: 0, databaseId: eventDb.id },
  });

  const evDateField = await prisma.field.create({
    data: { name: "Fecha", type: "DATE", position: 1, databaseId: eventDb.id },
  });

  const evStartTimeField = await prisma.field.create({
    data: { name: "Hora inicio", type: "TIME", position: 2, databaseId: eventDb.id },
  });

  const evEndTimeField = await prisma.field.create({
    data: { name: "Hora fin", type: "TIME", position: 3, databaseId: eventDb.id },
  });

  const evTypeField = await prisma.field.create({
    data: {
      name: "Tipo",
      type: "SELECT",
      position: 4,
      options: [
        { value: "Reunión", color: "#6366f1" },
        { value: "Entrega", color: "#ef4444" },
        { value: "Review", color: "#f59e0b" },
        { value: "Demo", color: "#22c55e" },
      ],
      databaseId: eventDb.id,
    },
  });

  const evNotesField = await prisma.field.create({
    data: { name: "Notas", type: "TEXT", position: 5, databaseId: eventDb.id },
  });

  await prisma.record.createMany({
    data: [
      {
        position: 0,
        values: {
          [evNameField.id]: "Kick-off Phase 4",
          [evDateField.id]: "2026-04-12",
          [evStartTimeField.id]: "09:00",
          [evEndTimeField.id]: "10:00",
          [evTypeField.id]: "Reunión",
          [evNotesField.id]: "Inicio del sprint de Kanban y Calendario",
        },
        databaseId: eventDb.id,
      },
      {
        position: 1,
        values: {
          [evNameField.id]: "Review Kanban",
          [evDateField.id]: "2026-04-18",
          [evStartTimeField.id]: "11:30",
          [evEndTimeField.id]: "12:30",
          [evTypeField.id]: "Review",
          [evNotesField.id]: "Revisión del drag-and-drop",
        },
        databaseId: eventDb.id,
      },
      {
        position: 2,
        values: {
          [evNameField.id]: "Entrega Phase 4",
          [evDateField.id]: "2026-04-22",
          [evStartTimeField.id]: "17:00",
          [evEndTimeField.id]: "17:30",
          [evTypeField.id]: "Entrega",
          [evNotesField.id]: "Kanban + Calendario completos",
        },
        databaseId: eventDb.id,
      },
      {
        position: 3,
        values: {
          [evNameField.id]: "Demo cliente",
          [evDateField.id]: "2026-04-25",
          [evStartTimeField.id]: "15:00",
          [evEndTimeField.id]: "16:30",
          [evTypeField.id]: "Demo",
          [evNotesField.id]: "Presentación del MVP",
        },
        databaseId: eventDb.id,
      },
      {
        position: 4,
        values: {
          [evNameField.id]: "Sprint Planning May",
          [evDateField.id]: "2026-04-30",
          [evStartTimeField.id]: "10:00",
          [evEndTimeField.id]: "12:00",
          [evTypeField.id]: "Reunión",
          [evNotesField.id]: "Planificación Phase 5",
        },
        databaseId: eventDb.id,
      },
      {
        position: 5,
        values: {
          [evNameField.id]: "Standup diario",
          [evDateField.id]: "2026-04-19",
          [evStartTimeField.id]: "09:30",
          [evEndTimeField.id]: "09:50",
          [evTypeField.id]: "Reunión",
          [evNotesField.id]: "Sync del equipo",
        },
        databaseId: eventDb.id,
      },
      {
        position: 6,
        values: {
          [evNameField.id]: "Code review tests",
          [evDateField.id]: "2026-04-21",
          [evStartTimeField.id]: "14:00",
          [evEndTimeField.id]: "15:30",
          [evTypeField.id]: "Review",
          [evNotesField.id]: "Review de la suite de tests",
        },
        databaseId: eventDb.id,
      },
      {
        position: 7,
        values: {
          [evNameField.id]: "Almuerzo de equipo",
          [evDateField.id]: "2026-04-23",
          [evStartTimeField.id]: "13:00",
          [evEndTimeField.id]: "14:00",
          [evTypeField.id]: "Reunión",
          [evNotesField.id]: "Team building",
        },
        databaseId: eventDb.id,
      },
      {
        position: 8,
        values: {
          [evNameField.id]: "Evento sin hora (todo el día)",
          [evDateField.id]: "2026-04-24",
          [evTypeField.id]: "Demo",
          [evNotesField.id]: "Sin hora inicio/fin — aparece como evento de todo el día",
        },
        databaseId: eventDb.id,
      },
    ],
  });

  // -------------------------------------------------------------------------
  // Database 3: Contactos (standalone, vista TABLE por defecto)
  // -------------------------------------------------------------------------
  console.log("Creando base de datos Contactos…");

  const contactDb = await prisma.database.create({
    data: { title: "Contactos", icon: "👥", viewType: "TABLE" },
  });

  const cNameField = await prisma.field.create({
    data: { name: "Nombre", type: "TEXT", position: 0, databaseId: contactDb.id },
  });

  const cRoleField = await prisma.field.create({
    data: { name: "Rol", type: "TEXT", position: 1, databaseId: contactDb.id },
  });

  const cStatusField = await prisma.field.create({
    data: {
      name: "Estado",
      type: "SELECT",
      position: 2,
      options: [
        { value: "Activo", color: "#22c55e" },
        { value: "Inactivo", color: "#94a3b8" },
        { value: "Lead", color: "#f59e0b" },
      ],
      databaseId: contactDb.id,
    },
  });

  const cDateField = await prisma.field.create({
    data: { name: "Último contacto", type: "DATE", position: 3, databaseId: contactDb.id },
  });

  await prisma.record.createMany({
    data: [
      {
        position: 0,
        values: {
          [cNameField.id]: "Ana García",
          [cRoleField.id]: "CEO",
          [cStatusField.id]: "Activo",
          [cDateField.id]: "2026-04-15",
        },
        databaseId: contactDb.id,
      },
      {
        position: 1,
        values: {
          [cNameField.id]: "Carlos López",
          [cRoleField.id]: "Dev Lead",
          [cStatusField.id]: "Activo",
          [cDateField.id]: "2026-04-17",
        },
        databaseId: contactDb.id,
      },
      {
        position: 2,
        values: {
          [cNameField.id]: "María Torres",
          [cRoleField.id]: "Designer",
          [cStatusField.id]: "Lead",
          [cDateField.id]: "2026-04-10",
        },
        databaseId: contactDb.id,
      },
    ],
  });

  console.log("✅ Seed completado:");
  console.log("   - 6 páginas (3 raíz + 3 sub-páginas)");
  console.log("   - 3 bases de datos:");
  console.log("     · Tareas del proyecto: 6 campos, 9 registros [KANBAN]");
  console.log("     · Eventos del mes: 6 campos (Hora inicio + Hora fin TIME), 9 registros [CALENDAR]");
  console.log("     · Contactos: 4 campos, 3 registros [TABLE]");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
