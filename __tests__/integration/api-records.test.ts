/**
 * @jest-environment node
 */
import { POST } from "@/app/api/records/route";
import { PUT, DELETE } from "@/app/api/records/[id]/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    record: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    database: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockRecord = prisma.record as jest.Mocked<typeof prisma.record>;
const mockDatabase = prisma.database as jest.Mocked<typeof prisma.database>;

const DB_ID = "ctest00000000000000000001";
const RECORD_ID = "ctest00000000000000000004";

const makeRequest = (url: string, options?: RequestInit) =>
  new NextRequest(`http://localhost:3000${url}`, options);

const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/records", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates record and returns 201", async () => {
    (mockDatabase.findUnique as jest.Mock).mockResolvedValue({ id: DB_ID });
    (mockRecord.findFirst as jest.Mock).mockResolvedValue(null);
    (mockRecord.create as jest.Mock).mockResolvedValue({ id: RECORD_ID, position: 0, values: {} });

    const req = makeRequest("/api/records", {
      method: "POST",
      body: JSON.stringify({ databaseId: DB_ID }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.record.id).toBe(RECORD_ID);
  });

  it("returns 404 when database not found", async () => {
    (mockDatabase.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest("/api/records", {
      method: "POST",
      body: JSON.stringify({ databaseId: DB_ID }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid databaseId", async () => {
    const req = makeRequest("/api/records", {
      method: "POST",
      body: JSON.stringify({ databaseId: "not-a-cuid" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    (mockDatabase.findUnique as jest.Mock).mockResolvedValue({ id: DB_ID });
    (mockRecord.findFirst as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = makeRequest("/api/records", {
      method: "POST",
      body: JSON.stringify({ databaseId: DB_ID }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/records/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates record values", async () => {
    const values = { fieldA: "texto", fieldB: 42 };
    (mockRecord.findUnique as jest.Mock).mockResolvedValue({ id: RECORD_ID });
    (mockRecord.update as jest.Mock).mockResolvedValue({ id: RECORD_ID, values });

    const req = makeRequest(`/api/records/${RECORD_ID}`, {
      method: "PUT",
      body: JSON.stringify({ values }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeContext(RECORD_ID));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.record.values).toEqual(values);
  });

  it("returns 404 when record not found", async () => {
    (mockRecord.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest(`/api/records/nonexistent`, {
      method: "PUT",
      body: JSON.stringify({ values: {} }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeContext("nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when values is missing", async () => {
    const req = makeRequest(`/api/records/${RECORD_ID}`, {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeContext(RECORD_ID));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/records/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("soft-deletes record", async () => {
    (mockRecord.findUnique as jest.Mock).mockResolvedValue({ id: RECORD_ID });
    (mockRecord.update as jest.Mock).mockResolvedValue({ id: RECORD_ID, isDeleted: true });

    const res = await DELETE(makeRequest(`/api/records/${RECORD_ID}`), makeContext(RECORD_ID));

    expect(res.status).toBe(200);
    expect(mockRecord.update).toHaveBeenCalledWith({
      where: { id: RECORD_ID },
      data: { isDeleted: true },
    });
  });

  it("returns 404 when record not found", async () => {
    (mockRecord.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await DELETE(makeRequest(`/api/records/nonexistent`), makeContext("nonexistent"));
    expect(res.status).toBe(404);
  });
});
