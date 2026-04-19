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
  icon: z.string().max(10).optional(),
  cover: z.string().url().optional(),
});

const DeletePageSchema = z.object({
  id: z.string().cuid(),
});

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
// updatePage — actualiza título, contenido, icono o portada
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

  revalidatePath("/");
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
