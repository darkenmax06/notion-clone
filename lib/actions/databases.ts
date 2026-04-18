"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FieldType, ViewType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateDatabaseSchema = z.object({
  title: z.string().min(1).max(500).default("Base de datos sin título"),
  icon: z.string().max(10).optional(),
  pageId: z.string().cuid().nullable().optional(),
});

const UpdateDatabaseSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  icon: z.string().max(10).nullable().optional(),
  viewType: z.nativeEnum(ViewType).optional(),
  kanbanGroupFieldId: z.string().nullable().optional(),
});

const SelectOptionSchema = z.object({
  value: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const CreateFieldSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.nativeEnum(FieldType),
  options: z.array(SelectOptionSchema).optional(),
});

const UpdateFieldSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  options: z.array(SelectOptionSchema).optional(),
});

// ---------------------------------------------------------------------------
// Database actions
// ---------------------------------------------------------------------------

export async function createDatabase(
  input: z.infer<typeof CreateDatabaseSchema>
) {
  const data = CreateDatabaseSchema.parse(input);

  const db = await prisma.database.create({
    data: {
      title: data.title,
      icon: data.icon,
      pageId: data.pageId ?? null,
      fields: {
        create: [{ name: "Nombre", type: "TEXT", position: 0 }],
      },
    },
    include: { fields: true },
  });

  revalidatePath("/");
  return { success: true, database: db };
}

export async function updateDatabase(
  id: string,
  input: z.infer<typeof UpdateDatabaseSchema>
) {
  const data = UpdateDatabaseSchema.parse(input);

  const db = await prisma.database.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.viewType !== undefined && { viewType: data.viewType }),
      ...(data.kanbanGroupFieldId !== undefined && { kanbanGroupFieldId: data.kanbanGroupFieldId }),
    },
  });

  revalidatePath(`/db/${id}`);
  return { success: true, database: db };
}

export async function deleteDatabase(id: string) {
  await prisma.database.delete({ where: { id } });
  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Field actions
// ---------------------------------------------------------------------------

export async function createField(
  databaseId: string,
  input: z.infer<typeof CreateFieldSchema>
) {
  const data = CreateFieldSchema.parse(input);

  const lastField = await prisma.field.findFirst({
    where: { databaseId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const field = await prisma.field.create({
    data: {
      name: data.name,
      type: data.type,
      options: data.options ?? [],
      position: (lastField?.position ?? -1) + 1,
      databaseId,
    },
  });

  revalidatePath(`/db/${databaseId}`);
  return { success: true, field };
}

export async function updateField(
  fieldId: string,
  databaseId: string,
  input: z.infer<typeof UpdateFieldSchema>
) {
  const data = UpdateFieldSchema.parse(input);

  const field = await prisma.field.update({
    where: { id: fieldId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.options !== undefined && { options: data.options }),
    },
  });

  revalidatePath(`/db/${databaseId}`);
  return { success: true, field };
}

export async function deleteField(fieldId: string, databaseId: string) {
  await prisma.field.delete({ where: { id: fieldId } });
  revalidatePath(`/db/${databaseId}`);
  return { success: true };
}
