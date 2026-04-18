/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/databases/route";
import { GET as GET_ONE, PUT, DELETE } from "@/app/api/databases/[id]/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    database: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockDb = prisma.database as jest.Mocked<typeof prisma.database>;

const DB_ID = "ctest00000000000000000001";

const makeRequest = (url: string, options?: RequestInit) =>
  new NextRequest(`http://localhost:3000${url}`, options);

const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/databases", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns databases with status 200", async () => {
    (mockDb.findMany as jest.Mock).mockResolvedValue([
      { id: DB_ID, title: "Tareas", icon: "✅", pageId: null, createdAt: new Date(), updatedAt: new Date(), _count: { records: 3 } },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.databases).toHaveLength(1);
    expect(data.databases[0].title).toBe("Tareas");
  });

  it("returns 500 on database error", async () => {
    (mockDb.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/databases", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates database and returns 201", async () => {
    const fakeDb = { id: DB_ID, title: "Nueva BD", fields: [] };
    (mockDb.create as jest.Mock).mockResolvedValue(fakeDb);

    const req = makeRequest("/api/databases", {
      method: "POST",
      body: JSON.stringify({ title: "Nueva BD" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.database.title).toBe("Nueva BD");
  });

  it("uses default title when none provided", async () => {
    (mockDb.create as jest.Mock).mockResolvedValue({ id: DB_ID, title: "Base de datos sin título", fields: [] });

    const req = makeRequest("/api/databases", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockDb.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: "Base de datos sin título" }) })
    );
  });

  it("returns 400 for invalid pageId", async () => {
    const req = makeRequest("/api/databases", {
      method: "POST",
      body: JSON.stringify({ pageId: "not-a-cuid" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/databases/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns database with fields and records", async () => {
    (mockDb.findUnique as jest.Mock).mockResolvedValue({
      id: DB_ID, title: "Tareas", icon: null, fields: [], records: [],
    });

    const res = await GET_ONE(makeRequest(`/api/databases/${DB_ID}`), makeContext(DB_ID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.database.id).toBe(DB_ID);
  });

  it("returns 404 when not found", async () => {
    (mockDb.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET_ONE(makeRequest(`/api/databases/nonexistent`), makeContext("nonexistent"));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/databases/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates database title", async () => {
    (mockDb.findUnique as jest.Mock).mockResolvedValue({ id: DB_ID });
    (mockDb.update as jest.Mock).mockResolvedValue({ id: DB_ID, title: "Actualizado" });

    const req = makeRequest(`/api/databases/${DB_ID}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Actualizado" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeContext(DB_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.database.title).toBe("Actualizado");
  });

  it("returns 404 when database not found", async () => {
    (mockDb.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest(`/api/databases/nonexistent`, {
      method: "PUT",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeContext("nonexistent"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/databases/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes database", async () => {
    (mockDb.findUnique as jest.Mock).mockResolvedValue({ id: DB_ID });
    (mockDb.delete as jest.Mock).mockResolvedValue({});

    const res = await DELETE(makeRequest(`/api/databases/${DB_ID}`), makeContext(DB_ID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 404 when database not found", async () => {
    (mockDb.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await DELETE(makeRequest(`/api/databases/nonexistent`), makeContext("nonexistent"));
    expect(res.status).toBe(404);
  });
});
