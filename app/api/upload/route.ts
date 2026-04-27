import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

type UploadResponse = {
  name: string;
  url: string;
  mimeType: string;
  size: number;
};

function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120) || "archivo";
}

function getStorageMode(): "local" | "s3" {
  return process.env.UPLOAD_STORAGE === "s3" ? "s3" : "local";
}

function inferContentType(file: File): string {
  return file.type || "application/octet-stream";
}

async function uploadToLocal(file: File): Promise<UploadResponse> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const baseName = sanitizeFilename(file.name);
  const filename = `${Date.now()}-${randomUUID()}-${baseName}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const absolutePath = path.join(uploadsDir, filename);

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    name: file.name,
    url: `/uploads/${filename}`,
    mimeType: inferContentType(file),
    size: file.size,
  };
}

async function uploadToS3(file: File): Promise<UploadResponse> {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Configuracion S3 incompleta");
  }

  const key = `uploads/${Date.now()}-${randomUUID()}-${sanitizeFilename(file.name)}`;
  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: inferContentType(file),
    })
  );

  const baseUrl =
    process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    `https://${bucket}.s3.${region}.amazonaws.com`;

  return {
    name: file.name,
    url: `${baseUrl}/${key}`,
    mimeType: inferContentType(file),
    size: file.size,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const maybeFile = formData.get("file");

    if (!(maybeFile instanceof File)) {
      return NextResponse.json({ error: "Archivo no recibido" }, { status: 400 });
    }

    if (maybeFile.size <= 0) {
      return NextResponse.json({ error: "Archivo vacio" }, { status: 400 });
    }

    if (maybeFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "El archivo excede el limite de 20MB" },
        { status: 413 }
      );
    }

    const payload =
      getStorageMode() === "s3"
        ? await uploadToS3(maybeFile)
        : await uploadToLocal(maybeFile);

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
  }
}

