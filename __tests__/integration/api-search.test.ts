/**
 * @jest-environment node
 */
import { GET } from "@/app/api/search/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    page: { findMany: jest.fn() },
    database: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const makeReq = (q: string) =>
  new NextRequest(`http://localhost:3000/api/search?q=${encodeURIComponent(q)}`);

describe("GET /api/search", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns empty results for empty query", async () => {
    const req = makeReq("");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.pages).toEqual([]);
    expect(data.databases).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns empty results for single-char query", async () => {
    const req = makeReq("a");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.pages).toEqual([]);
    expect(data.databases).toEqual([]);
  });

  it("calls $queryRaw for 2+ char queries and returns results", async () => {
    const pages = [{ id: "p1", title: "Inicio", icon: "🏠" }];
    const databases = [{ id: "d1", title: "Tareas", icon: "✅" }];

    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce(pages)
      .mockResolvedValueOnce(databases);

    const req = makeReq("In");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].title).toBe("Inicio");
    expect(data.databases).toHaveLength(1);
    expect(data.databases[0].title).toBe("Tareas");
  });

  it("falls back to prisma.page.findMany when pg_trgm is unavailable", async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error("pg_trgm not available"));
    (prisma.page.findMany as jest.Mock).mockResolvedValue([
      { id: "p1", title: "Proyectos", icon: "🚀" },
    ]);
    (prisma.database.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeReq("proy");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.pages).toHaveLength(1);
    expect(prisma.page.findMany).toHaveBeenCalled();
  });

  it("returns 500 when both pg_trgm and fallback fail", async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error("DB error"));
    (prisma.page.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));
    (prisma.database.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = makeReq("test");
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("trims whitespace from query parameter", async () => {
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = makeReq("  hola  ");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });
});
