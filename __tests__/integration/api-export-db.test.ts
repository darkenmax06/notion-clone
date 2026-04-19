/**
 * @jest-environment node
 */
import { GET } from "@/app/api/databases/[id]/export/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    database: { findUnique: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockDb = {
  id: "db1",
  title: "Tareas",
  fields: [
    { id: "f1", name: "Tarea", position: 0 },
    { id: "f2", name: "Estado", position: 1 },
  ],
  records: [
    { values: { f1: "Implementar search", f2: "En progreso" } },
    { values: { f1: "Exportar CSV", f2: "Pendiente" } },
  ],
};

function makeReq(id: string, format: string) {
  return new NextRequest(
    `http://localhost:3000/api/databases/${id}/export?format=${format}`
  );
}

describe("GET /api/databases/[id]/export", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 when database not found", async () => {
    (prisma.database.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeReq("missing", "csv"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("exports CSV with correct headers and rows", async () => {
    (prisma.database.findUnique as jest.Mock).mockResolvedValue(mockDb);

    const res = await GET(makeReq("db1", "csv"), {
      params: Promise.resolve({ id: "db1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain(".csv");

    const text = await res.text();
    const lines = text.split("\n");
    expect(lines[0]).toBe("Tarea,Estado");
    expect(lines[1]).toContain("Implementar search");
    expect(lines[2]).toContain("Exportar CSV");
  });

  it("exports Markdown with table format", async () => {
    (prisma.database.findUnique as jest.Mock).mockResolvedValue(mockDb);

    const res = await GET(makeReq("db1", "md"), {
      params: Promise.resolve({ id: "db1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/markdown");
    expect(res.headers.get("Content-Disposition")).toContain(".md");

    const text = await res.text();
    expect(text).toContain("# Tareas");
    expect(text).toContain("| Tarea | Estado |");
    expect(text).toContain("| --- | --- |");
    expect(text).toContain("Implementar search");
  });

  it("defaults to CSV when format is not specified", async () => {
    (prisma.database.findUnique as jest.Mock).mockResolvedValue(mockDb);

    const req = new NextRequest("http://localhost:3000/api/databases/db1/export");
    const res = await GET(req, { params: Promise.resolve({ id: "db1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
  });

  it("escapes commas in CSV values", async () => {
    (prisma.database.findUnique as jest.Mock).mockResolvedValue({
      ...mockDb,
      records: [{ values: { f1: "Tarea, con coma", f2: "OK" } }],
    });

    const res = await GET(makeReq("db1", "csv"), {
      params: Promise.resolve({ id: "db1" }),
    });

    const text = await res.text();
    expect(text).toContain('"Tarea, con coma"');
  });

  it("returns 500 on database error", async () => {
    (prisma.database.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeReq("db1", "csv"), {
      params: Promise.resolve({ id: "db1" }),
    });

    expect(res.status).toBe(500);
  });
});
