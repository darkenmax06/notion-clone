"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Record actions
// ---------------------------------------------------------------------------

export async function createRecord(databaseId: string) {
  const lastRecord = await prisma.record.findFirst({
    where: { databaseId, isDeleted: false },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const record = await prisma.record.create({
    data: {
      databaseId,
      position: (lastRecord?.position ?? -1) + 1,
      values: {},
    },
  });

  revalidatePath(`/db/${databaseId}`);
  return { success: true, record };
}

export async function updateRecord(
  recordId: string,
  databaseId: string,
  values: Record<string, unknown>
) {
  const record = await prisma.record.update({
    where: { id: recordId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { values: values as any },
  });

  return { success: true, record };
}

export async function setRecordRelations(
  recordId: string,
  databaseId: string,
  fieldId: string,
  targetRecordIds: string[]
) {
  const [record, field] = await Promise.all([
    prisma.record.findUnique({
      where: { id: recordId },
      select: { id: true, databaseId: true, isDeleted: true },
    }),
    prisma.field.findUnique({
      where: { id: fieldId },
      select: { id: true, databaseId: true, type: true },
    }),
  ]);

  if (!record || record.databaseId !== databaseId || record.isDeleted) {
    throw new Error("Registro no encontrado");
  }

  if (!field || field.databaseId !== databaseId || field.type !== "RELATION") {
    throw new Error("Campo de relacion invalido");
  }

  const uniqueTargetIds = Array.from(
    new Set(targetRecordIds.map((value) => value.trim()).filter(Boolean))
  );

  const validTargets =
    uniqueTargetIds.length > 0
      ? await prisma.record.findMany({
          where: { id: { in: uniqueTargetIds }, isDeleted: false },
          select: { id: true },
        })
      : [];

  const validTargetIds = validTargets.map((target) => target.id);

  await prisma.$transaction(async (tx) => {
    await tx.recordRelation.deleteMany({
      where: { sourceRecordId: recordId, fieldId },
    });

    if (validTargetIds.length > 0) {
      await tx.recordRelation.createMany({
        data: validTargetIds.map((targetRecordId) => ({
          sourceRecordId: recordId,
          targetRecordId,
          fieldId,
        })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath(`/db/${databaseId}`);
  return { success: true, targetRecordIds: validTargetIds };
}

export async function deleteRecord(recordId: string, databaseId: string) {
  await prisma.record.update({
    where: { id: recordId },
    data: { isDeleted: true },
  });

  revalidatePath(`/db/${databaseId}`);
  return { success: true };
}
