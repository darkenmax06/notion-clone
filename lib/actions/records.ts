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
    data: { values },
  });

  return { success: true, record };
}

export async function deleteRecord(recordId: string, databaseId: string) {
  await prisma.record.update({
    where: { id: recordId },
    data: { isDeleted: true },
  });

  revalidatePath(`/db/${databaseId}`);
  return { success: true };
}
