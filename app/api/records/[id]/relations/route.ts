import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const UpdateRelationsSchema = z.object({
  fieldId: z.string().cuid(),
  targetRecordIds: z.array(z.string().cuid()).default([]),
});

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: recordId } = await params;
    const body = await request.json();
    const data = UpdateRelationsSchema.parse(body);

    const [record, field] = await Promise.all([
      prisma.record.findUnique({
        where: { id: recordId },
        select: { id: true, databaseId: true, isDeleted: true },
      }),
      prisma.field.findUnique({
        where: { id: data.fieldId },
        select: { id: true, type: true, databaseId: true },
      }),
    ]);

    if (!record || record.isDeleted) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    if (!field || field.type !== "RELATION" || field.databaseId !== record.databaseId) {
      return NextResponse.json({ error: "Campo relation invalido" }, { status: 400 });
    }

    const uniqueTargetIds = Array.from(
      new Set(data.targetRecordIds.map((value) => value.trim()).filter(Boolean))
    );

    const targets =
      uniqueTargetIds.length > 0
        ? await prisma.record.findMany({
            where: { id: { in: uniqueTargetIds }, isDeleted: false },
            select: { id: true },
          })
        : [];

    const validTargetIds = targets.map((target) => target.id);

    await prisma.$transaction(async (tx) => {
      await tx.recordRelation.deleteMany({
        where: { sourceRecordId: recordId, fieldId: data.fieldId },
      });

      if (validTargetIds.length > 0) {
        await tx.recordRelation.createMany({
          data: validTargetIds.map((targetRecordId) => ({
            sourceRecordId: recordId,
            targetRecordId,
            fieldId: data.fieldId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return NextResponse.json({
      success: true,
      fieldId: data.fieldId,
      targetRecordIds: validTargetIds,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[PUT /api/records/[id]/relations]", error);
    return NextResponse.json({ error: "Error al actualizar relaciones" }, { status: 500 });
  }
}

