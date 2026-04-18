import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  databaseId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { databaseId } = CreateSchema.parse(body);

    const db = await prisma.database.findUnique({ where: { id: databaseId } });
    if (!db) return NextResponse.json({ error: "Base de datos no encontrada" }, { status: 404 });

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

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[POST /api/records]", error);
    return NextResponse.json({ error: "Error al crear registro" }, { status: 500 });
  }
}
