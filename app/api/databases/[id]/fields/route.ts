import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FieldType } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

const CreateFieldSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.nativeEnum(FieldType),
  options: z
    .array(
      z.object({
        value: z.string().min(1),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
    )
    .optional()
    .default([]),
});

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: databaseId } = await params;

    const db = await prisma.database.findUnique({ where: { id: databaseId } });
    if (!db) return NextResponse.json({ error: "Base de datos no encontrada" }, { status: 404 });

    const body = await request.json();
    const data = CreateFieldSchema.parse(body);

    const lastField = await prisma.field.findFirst({
      where: { databaseId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const field = await prisma.field.create({
      data: {
        name: data.name,
        type: data.type,
        options: data.options,
        position: (lastField?.position ?? -1) + 1,
        databaseId,
      },
    });

    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[POST /api/databases/[id]/fields]", error);
    return NextResponse.json({ error: "Error al crear campo" }, { status: 500 });
  }
}
