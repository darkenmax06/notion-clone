"use server";
// lib/actions/pages.ts — Server Actions para mutaciones de Page
// Importar estas funciones SOLO desde Server Components o Client Components con "use server"

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Schemas de validación (Zod)
// ---------------------------------------------------------------------------

const CreatePageSchema = z.object({
  title: z.string().min(1).max(500).default("Sin título"),
  parentId: z.string().cuid().nullable().optional(),
  icon: z.string().max(10).optional(),
});

const UpdatePageSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(500).optional(),
  content: z.any().optional(), // BlockNote JSON blocks
  icon: z.string().max(10).optional().nullable(),
  cover: z.string().max(1000).optional().nullable(),
  isFullWidth: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
});

const DeletePageSchema = z.object({
  id: z.string().cuid(),
});

const PageIdSchema = z.object({
  id: z.string().cuid(),
});

const SaveVersionSchema = z.object({
  pageId: z.string().cuid(),
  title: z.string().min(1).max(500),
  content: z.unknown().optional().nullable(),
});

const GetPageVersionsSchema = z.object({
  pageId: z.string().cuid(),
});

const RestoreVersionSchema = z.object({
  versionId: z.string().cuid(),
  pageId: z.string().cuid(),
});

const CreatePageFromTemplateSchema = z.object({
  templateId: z.string().cuid(),
  parentId: z.string().cuid().nullable().optional(),
});

const SavePageAsTemplateSchema = z.object({
  pageId: z.string().cuid(),
});

type SystemTemplateSeed = {
  title: string;
  icon: string;
  content: unknown;
};

const SYSTEM_TEMPLATES: SystemTemplateSeed[] = [
  {
    title: "Meeting Notes",
    icon: "📝",
    content: [
      {
        id: "meeting-title",
        type: "heading",
        props: { level: 1, textAlignment: "left" },
        content: [{ type: "text", text: "Meeting Notes", styles: {} }],
        children: [],
      },
      {
        id: "meeting-agenda",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Agenda", styles: {} }],
        children: [],
      },
      {
        id: "meeting-agenda-items",
        type: "bulletListItem",
        props: { textAlignment: "left" },
        content: [{ type: "text", text: "Tema 1", styles: {} }],
        children: [],
      },
      {
        id: "meeting-notes",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Notas", styles: {} }],
        children: [],
      },
      {
        id: "meeting-action-items",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Acciones", styles: {} }],
        children: [],
      },
    ],
  },
  {
    title: "Weekly Review",
    icon: "📆",
    content: [
      {
        id: "weekly-title",
        type: "heading",
        props: { level: 1, textAlignment: "left" },
        content: [{ type: "text", text: "Weekly Review", styles: {} }],
        children: [],
      },
      {
        id: "weekly-wins",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Logros", styles: {} }],
        children: [],
      },
      {
        id: "weekly-wins-items",
        type: "bulletListItem",
        props: { textAlignment: "left" },
        content: [{ type: "text", text: "Logro principal", styles: {} }],
        children: [],
      },
      {
        id: "weekly-blockers",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Bloqueos", styles: {} }],
        children: [],
      },
      {
        id: "weekly-next",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Proxima semana", styles: {} }],
        children: [],
      },
    ],
  },
  {
    title: "Project Brief",
    icon: "🚀",
    content: [
      {
        id: "brief-title",
        type: "heading",
        props: { level: 1, textAlignment: "left" },
        content: [{ type: "text", text: "Project Brief", styles: {} }],
        children: [],
      },
      {
        id: "brief-context",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Contexto", styles: {} }],
        children: [],
      },
      {
        id: "brief-goal",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Objetivo", styles: {} }],
        children: [],
      },
      {
        id: "brief-scope",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Scope", styles: {} }],
        children: [],
      },
      {
        id: "brief-timeline",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Timeline", styles: {} }],
        children: [],
      },
    ],
  },
  {
    title: "Bug Report",
    icon: "🐛",
    content: [
      {
        id: "bug-title",
        type: "heading",
        props: { level: 1, textAlignment: "left" },
        content: [{ type: "text", text: "Bug Report", styles: {} }],
        children: [],
      },
      {
        id: "bug-summary",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Resumen", styles: {} }],
        children: [],
      },
      {
        id: "bug-steps",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Pasos para reproducir", styles: {} }],
        children: [],
      },
      {
        id: "bug-expected",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Esperado", styles: {} }],
        children: [],
      },
      {
        id: "bug-actual",
        type: "heading",
        props: { level: 2, textAlignment: "left" },
        content: [{ type: "text", text: "Actual", styles: {} }],
        children: [],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// createPage — crea una nueva página (vacía o con padre)
// ---------------------------------------------------------------------------
export async function createPage(input: z.infer<typeof CreatePageSchema>) {
  const data = CreatePageSchema.parse(input);

  // Calcular posición: última hija del padre (o raíz)
  const lastSibling = await prisma.page.findFirst({
    where: { parentId: data.parentId ?? null, isDeleted: false },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const page = await prisma.page.create({
    data: {
      title: data.title,
      icon: data.icon,
      parentId: data.parentId ?? null,
      position: (lastSibling?.position ?? -1) + 1,
    },
  });

  revalidatePath("/", "layout");
  return { success: true, page };
}

// Prisma rejects `undefined` inside JSON arrays (e.g. BlockNote's columnWidths).
// Recursively replace undefined → null so the payload is always valid JSON.
function sanitizeContent(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : sanitizeContent(v)));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeContent(v)]));
  }
  return value;
}

// ---------------------------------------------------------------------------
// updatePage — actualiza título, contenido, icono, portada, ancho, favorito
// ---------------------------------------------------------------------------
export async function updatePage(input: z.infer<typeof UpdatePageSchema>) {
  const { id, ...data } = UpdatePageSchema.parse(input);

  const page = await prisma.page.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(data.content !== undefined && { content: sanitizeContent(data.content) as any }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.cover !== undefined && { cover: data.cover }),
      ...(data.isFullWidth !== undefined && { isFullWidth: data.isFullWidth }),
      ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
    },
  });

  revalidatePath(`/page/${id}`);
  revalidatePath("/", "layout");
  return { success: true, page };
}

// ---------------------------------------------------------------------------
// deletePage — soft-delete (marca isDeleted = true, en cascada en children)
// ---------------------------------------------------------------------------
export async function deletePage(input: z.infer<typeof DeletePageSchema>) {
  const { id } = DeletePageSchema.parse(input);

  // Soft-delete recursivo: marcar esta página y todas sus hijas
  await softDeleteTree(id);

  revalidatePath("/", "layout");
  revalidatePath("/trash");
  return { success: true };
}

async function softDeleteTree(pageId: string): Promise<void> {
  const children = await prisma.page.findMany({
    where: { parentId: pageId, isDeleted: false },
    select: { id: true },
  });

  // Primero los hijos (recursivo)
  await Promise.all(children.map((c) => softDeleteTree(c.id)));

  // Luego el nodo actual
  await prisma.page.update({
    where: { id: pageId },
    data: { isDeleted: true },
  });
}

// ---------------------------------------------------------------------------
// restorePage — restaura una página eliminada y todos sus descendientes
// ---------------------------------------------------------------------------
export async function restorePage(input: z.infer<typeof PageIdSchema>) {
  const { id } = PageIdSchema.parse(input);

  await restoreTree(id);
  revalidatePath("/", "layout");
  revalidatePath("/trash");
  return { success: true };
}

async function restoreTree(pageId: string): Promise<void> {
  await prisma.page.update({
    where: { id: pageId },
    data: { isDeleted: false },
  });

  const children = await prisma.page.findMany({
    where: { parentId: pageId, isDeleted: true },
    select: { id: true },
  });

  await Promise.all(children.map((child) => restoreTree(child.id)));
}

// ---------------------------------------------------------------------------
// permanentlyDeletePage — hard delete de la página (y descendientes por cascade)
// ---------------------------------------------------------------------------
export async function permanentlyDeletePage(input: z.infer<typeof PageIdSchema>) {
  const { id } = PageIdSchema.parse(input);

  await prisma.page.delete({
    where: { id },
  });

  revalidatePath("/", "layout");
  revalidatePath("/trash");
  return { success: true };
}

// ---------------------------------------------------------------------------
// toggleFavorite — alterna el estado de favorito de una página
// ---------------------------------------------------------------------------
export async function toggleFavorite(input: z.infer<typeof PageIdSchema>) {
  const { id } = PageIdSchema.parse(input);

  const page = await prisma.page.findUnique({
    where: { id },
    select: { isFavorite: true },
  });

  if (!page) throw new Error("Página no encontrada");

  const updated = await prisma.page.update({
    where: { id },
    data: { isFavorite: !page.isFavorite },
  });

  revalidatePath("/", "layout");
  revalidatePath(`/page/${id}`);
  return { success: true, isFavorite: updated.isFavorite };
}

// ---------------------------------------------------------------------------
// getPageTree — helper para Server Components: árbol de páginas raíz
// ---------------------------------------------------------------------------
export async function getPageTree() {
  const pages = await prisma.page.findMany({
    where: { isDeleted: false },
    orderBy: [{ parentId: "asc" }, { position: "asc" }],
    select: {
      id: true,
      title: true,
      icon: true,
      parentId: true,
      position: true,
    },
  });

  return pages;
}

// ---------------------------------------------------------------------------
// savePageVersion — guarda una versión del contenido (máx. 20 por página)
// ---------------------------------------------------------------------------
export async function savePageVersion(input: z.infer<typeof SaveVersionSchema>) {
  const { pageId, title, content } = SaveVersionSchema.parse(input);

  // Contar versiones existentes
  const count = await prisma.pageVersion.count({
    where: { pageId },
  });

  // Si ya hay 20, eliminar la más antigua
  if (count >= 20) {
    const oldest = await prisma.pageVersion.findFirst({
      where: { pageId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (oldest) {
      await prisma.pageVersion.delete({ where: { id: oldest.id } });
    }
  }

  const version = await prisma.pageVersion.create({
    data: {
      pageId,
      title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: sanitizeContent(content) as any,
    },
  });

  return { success: true, version };
}

// ---------------------------------------------------------------------------
// getPageVersions — devuelve versiones de una página (más recientes primero)
// ---------------------------------------------------------------------------
export async function getPageVersions(input: z.infer<typeof GetPageVersionsSchema>) {
  const { pageId } = GetPageVersionsSchema.parse(input);

  const versions = await prisma.pageVersion.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });

  return versions;
}

// ---------------------------------------------------------------------------
// restorePageVersion — restaura contenido de una versión anterior
// ---------------------------------------------------------------------------
export async function restorePageVersion(input: z.infer<typeof RestoreVersionSchema>) {
  const { versionId, pageId } = RestoreVersionSchema.parse(input);

  const version = await prisma.pageVersion.findUnique({
    where: { id: versionId },
  });

  if (!version) throw new Error("Versión no encontrada");

  // Guardar contenido actual como nueva versión antes de restaurar
  const currentPage = await prisma.page.findUnique({
    where: { id: pageId },
    select: { title: true, content: true },
  });

  if (currentPage) {
    await savePageVersion({
      pageId,
      title: currentPage.title,
      content: currentPage.content,
    });
  }

  // Restaurar el contenido de la versión
  const updatedPage = await prisma.page.update({
    where: { id: pageId },
    data: {
      title: version.title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: version.content as any,
    },
  });

  revalidatePath(`/page/${pageId}`);
  return { success: true, page: updatedPage };
}

async function ensureSystemTemplates() {
  const existing = await prisma.page.findMany({
    where: { isTemplate: true, isSystem: true, isDeleted: false },
    select: { title: true },
  });

  const existingTitles = new Set(existing.map((template) => template.title));
  const missing = SYSTEM_TEMPLATES.filter((template) => !existingTitles.has(template.title));

  if (missing.length === 0) return;

  await prisma.page.createMany({
    data: missing.map((template) => ({
      title: template.title,
      icon: template.icon,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: sanitizeContent(template.content) as any,
      isTemplate: true,
      isSystem: true,
      isDeleted: false,
    })),
  });
}

// ---------------------------------------------------------------------------
// getTemplates — devuelve todas las plantillas
// ---------------------------------------------------------------------------
export async function getTemplates() {
  await ensureSystemTemplates();

  const templates = await prisma.page.findMany({
    where: { isTemplate: true, isDeleted: false },
    orderBy: [{ isSystem: "desc" }, { title: "asc" }],
    select: { id: true, title: true, icon: true, isSystem: true, content: true },
  });

  return templates;
}

// ---------------------------------------------------------------------------
// createPageFromTemplate — crea una página nueva basada en una plantilla
// ---------------------------------------------------------------------------
export async function createPageFromTemplate(input: z.infer<typeof CreatePageFromTemplateSchema>) {
  const { templateId, parentId = null } = CreatePageFromTemplateSchema.parse(input);
  await ensureSystemTemplates();

  const template = await prisma.page.findFirst({
    where: { id: templateId, isTemplate: true, isDeleted: false },
    select: { title: true, icon: true, content: true },
  });

  if (!template) throw new Error("Plantilla no encontrada");

  const lastSibling = await prisma.page.findFirst({
    where: { parentId, isDeleted: false },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const page = await prisma.page.create({
    data: {
      title: template.title,
      icon: template.icon,
      parentId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: sanitizeContent(template.content) as any,
      position: (lastSibling?.position ?? -1) + 1,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/templates");
  return { success: true, page };
}

// ---------------------------------------------------------------------------
// savePageAsTemplate — guarda una página como plantilla reutilizable
// ---------------------------------------------------------------------------
export async function savePageAsTemplate(input: z.infer<typeof SavePageAsTemplateSchema>) {
  const { pageId } = SavePageAsTemplateSchema.parse(input);

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { title: true, icon: true, content: true },
  });

  if (!page) throw new Error("Página no encontrada");

  const template = await prisma.page.create({
    data: {
      title: page.title,
      icon: page.icon,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: sanitizeContent(page.content) as any,
      isTemplate: true,
      isSystem: false,
    },
  });

  revalidatePath("/templates");
  revalidatePath(`/page/${pageId}`);
  return { success: true, template };
}
