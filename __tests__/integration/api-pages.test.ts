/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/pages/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    page: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockPage = prisma.page as jest.Mocked<typeof prisma.page>;

const makeRequest = (url: string, options?: RequestInit) =>
  new NextRequest(`http://localhost:3000${url}`, options);

describe("GET /api/pages", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns pages array with status 200", async () => {
    const pages = [
      {
        id: "ctest00000000000000000001",
        title: "Página de prueba",
        icon: "📄",
        cover: null,
        parentId: null,
        position: 0,
        createdAt: new Date("2026-04-17"),
        updatedAt: new Date("2026-04-17"),
      },
    ];
    (mockPage.findMany as jest.Mock).mockResolvedValue(pages);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].title).toBe("Página de prueba");
  });

  it("returns empty array when no pages exist", async () => {
    (mockPage.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.pages).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    (mockPage.findMany as jest.Mock).mockRejectedValue(new Error("DB connection failed"));

    const res = await GET();

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});

describe("POST /api/pages", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a page and returns 201", async () => {
    const newPage = { id: "cnew000000000000000000001", title: "Nueva página", position: 0 };
    (mockPage.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPage.create as jest.Mock).mockResolvedValue(newPage);

    const req = makeRequest("/api/pages", {
      method: "POST",
      body: JSON.stringify({ title: "Nueva página" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.page.title).toBe("Nueva página");
  });

  it("uses default title when no title is sent", async () => {
    (mockPage.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPage.create as jest.Mock).mockResolvedValue({ id: "c1", title: "Sin título", position: 0 });

    const req = makeRequest("/api/pages", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockPage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Sin título" }),
    });
  });

  it("returns 400 when title exceeds 500 characters", async () => {
    const req = makeRequest("/api/pages", {
      method: "POST",
      body: JSON.stringify({ title: "x".repeat(501) }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 with malformed parentId", async () => {
    const req = makeRequest("/api/pages", {
      method: "POST",
      body: JSON.stringify({ parentId: "not-a-cuid" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 500 on database error during creation", async () => {
    (mockPage.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPage.create as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = makeRequest("/api/pages", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
