/**
 * @jest-environment node
 *
 * Integration tests for GET/PUT/DELETE /api/pages/[id]
 */
import { GET, PUT, DELETE } from "@/app/api/pages/[id]/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    page: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockPage = prisma.page as jest.Mocked<typeof prisma.page>;

const PAGE_ID = "ctest000000000000000000001";

const makeReq = (url: string, options?: RequestInit) =>
  new NextRequest(`http://localhost:3000${url}`, options);

const makeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

// ---------------------------------------------------------------------------
// GET /api/pages/:id
// ---------------------------------------------------------------------------
describe("GET /api/pages/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the page with status 200 when found", async () => {
    const fakePage = {
      id: PAGE_ID,
      title: "Mi página",
      icon: "📄",
      content: null,
      children: [],
      databases: [],
    };
    (mockPage.findUnique as jest.Mock).mockResolvedValue(fakePage);

    const res = await GET(makeReq(`/api/pages/${PAGE_ID}`), makeCtx(PAGE_ID));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.page.id).toBe(PAGE_ID);
    expect(data.page.title).toBe("Mi página");
  });

  it("returns 404 when page does not exist", async () => {
    (mockPage.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeReq(`/api/pages/${PAGE_ID}`), makeCtx(PAGE_ID));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBeDefined();
  });

  it("returns 500 on database error", async () => {
    (mockPage.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeReq(`/api/pages/${PAGE_ID}`), makeCtx(PAGE_ID));

    expect(res.status).toBe(500);
  });

  it("includes children and databases in the response", async () => {
    const fakePage = {
      id: PAGE_ID,
      title: "Con hijos",
      icon: null,
      content: null,
      children: [{ id: "child1", title: "Hijo", icon: null, position: 0 }],
      databases: [{ id: "db1", title: "DB", icon: null }],
    };
    (mockPage.findUnique as jest.Mock).mockResolvedValue(fakePage);

    const res = await GET(makeReq(`/api/pages/${PAGE_ID}`), makeCtx(PAGE_ID));
    const data = await res.json();

    expect(data.page.children).toHaveLength(1);
    expect(data.page.databases).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/pages/:id
// ---------------------------------------------------------------------------
describe("PUT /api/pages/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates title and returns 200", async () => {
    const updated = { id: PAGE_ID, title: "Nuevo título" };
    (mockPage.update as jest.Mock).mockResolvedValue(updated);

    const req = makeReq(`/api/pages/${PAGE_ID}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Nuevo título" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeCtx(PAGE_ID));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.page.title).toBe("Nuevo título");
    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PAGE_ID },
        data: { title: "Nuevo título" },
      })
    );
  });

  it("updates content (BlockNote JSON blocks)", async () => {
    const content = [{ type: "paragraph", content: [] }];
    (mockPage.update as jest.Mock).mockResolvedValue({ id: PAGE_ID, content });

    const req = makeReq(`/api/pages/${PAGE_ID}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeCtx(PAGE_ID));

    expect(res.status).toBe(200);
    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { content } })
    );
  });

  it("updates icon and cover", async () => {
    (mockPage.update as jest.Mock).mockResolvedValue({ id: PAGE_ID });

    const req = makeReq(`/api/pages/${PAGE_ID}`, {
      method: "PUT",
      body: JSON.stringify({ icon: "🔥", cover: "https://example.com/img.jpg" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeCtx(PAGE_ID));

    expect(res.status).toBe(200);
    expect(mockPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { icon: "🔥", cover: "https://example.com/img.jpg" },
      })
    );
  });

  it("returns 400 when title is empty string", async () => {
    const req = makeReq(`/api/pages/${PAGE_ID}`, {
      method: "PUT",
      body: JSON.stringify({ title: "" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeCtx(PAGE_ID));

    expect(res.status).toBe(400);
  });

  it("returns 400 when cover is not a valid URL", async () => {
    const req = makeReq(`/api/pages/${PAGE_ID}`, {
      method: "PUT",
      body: JSON.stringify({ cover: "not-a-url" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeCtx(PAGE_ID));

    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    (mockPage.update as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = makeReq(`/api/pages/${PAGE_ID}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, makeCtx(PAGE_ID));

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/pages/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/pages/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("soft-deletes a leaf page and returns success", async () => {
    (mockPage.findMany as jest.Mock).mockResolvedValue([]); // no children
    (mockPage.update as jest.Mock).mockResolvedValue({ id: PAGE_ID, isDeleted: true });

    const res = await DELETE(makeReq(`/api/pages/${PAGE_ID}`), makeCtx(PAGE_ID));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: PAGE_ID },
      data: { isDeleted: true },
    });
  });

  it("recursively soft-deletes children before the parent", async () => {
    const childId = "cchild00000000000000000001";
    (mockPage.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: childId }]) // children of PAGE_ID
      .mockResolvedValueOnce([]);               // children of childId (none)
    (mockPage.update as jest.Mock).mockResolvedValue({ isDeleted: true });

    const res = await DELETE(makeReq(`/api/pages/${PAGE_ID}`), makeCtx(PAGE_ID));

    expect(res.status).toBe(200);
    // Child deleted first
    expect(mockPage.update).toHaveBeenNthCalledWith(1, {
      where: { id: childId },
      data: { isDeleted: true },
    });
    // Parent deleted second
    expect(mockPage.update).toHaveBeenNthCalledWith(2, {
      where: { id: PAGE_ID },
      data: { isDeleted: true },
    });
  });

  it("returns 500 on database error", async () => {
    (mockPage.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await DELETE(makeReq(`/api/pages/${PAGE_ID}`), makeCtx(PAGE_ID));

    expect(res.status).toBe(500);
  });
});
