import {
  createPage,
  getPageTree,
  getPageVersions,
  getTemplates,
  permanentlyDeletePage,
  restorePage,
  restorePageVersion,
  savePageVersion,
  toggleFavorite,
  updatePage,
  deletePage,
} from "@/lib/actions/pages";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    page: {
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    pageVersion: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { prisma } from "@/lib/prisma";

const mockPage = prisma.page as jest.Mocked<typeof prisma.page>;
const mockPageVersion = prisma.pageVersion as jest.Mocked<typeof prisma.pageVersion>;

const PAGE_ID = "cjsyq7qry000001qlpjb069q7";
const TEMPLATE_ID = "cjsyq7qry000001qlpjb069q8";
const VERSION_ID = "cjsyq7qry000001qlpjb069q9";

describe("createPage()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a page with default title when none is provided", async () => {
    const fakeCreated = { id: PAGE_ID, title: "Sin título", position: 0 };
    (mockPage.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPage.create as jest.Mock).mockResolvedValue(fakeCreated);

    const result = await createPage({ title: "Sin título" });

    expect(result.success).toBe(true);
    expect(result.page).toMatchObject({ title: "Sin título" });
    expect(mockPage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Sin título", position: 0 }),
    });
  });

  it("increments position after last sibling", async () => {
    (mockPage.findFirst as jest.Mock).mockResolvedValue({ position: 4 });
    (mockPage.create as jest.Mock).mockResolvedValue({ id: PAGE_ID, title: "Nuevo", position: 5 });

    await createPage({ title: "Nuevo" });

    expect(mockPage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ position: 5 }),
    });
  });

  it("accepts valid parentId", async () => {
    (mockPage.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPage.create as jest.Mock).mockResolvedValue({ id: PAGE_ID, title: "Hijo", position: 0 });

    const result = await createPage({ title: "Hijo", parentId: PAGE_ID });

    expect(result.success).toBe(true);
    expect(mockPage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ parentId: PAGE_ID }),
    });
  });

  it("rejects title longer than 500 chars", async () => {
    await expect(createPage({ title: "a".repeat(501) })).rejects.toThrow();
  });
});

describe("updatePage()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates only provided fields", async () => {
    (mockPage.update as jest.Mock).mockResolvedValue({ id: PAGE_ID, title: "Actualizado" });

    const result = await updatePage({ id: PAGE_ID, title: "Actualizado" });

    expect(result.success).toBe(true);
    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: PAGE_ID },
      data: { title: "Actualizado" },
    });
  });

  it("updates content payload", async () => {
    const content = [{ type: "paragraph", content: [] }];
    (mockPage.update as jest.Mock).mockResolvedValue({ id: PAGE_ID, content });

    await updatePage({ id: PAGE_ID, content });

    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: PAGE_ID },
      data: { content },
    });
  });

  it("accepts null icon and cover", async () => {
    (mockPage.update as jest.Mock).mockResolvedValue({ id: PAGE_ID });

    await updatePage({ id: PAGE_ID, icon: null, cover: null });

    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: PAGE_ID },
      data: { icon: null, cover: null },
    });
  });

  it("rejects invalid id format", async () => {
    await expect(updatePage({ id: "not-a-cuid", title: "x" })).rejects.toThrow();
  });
});

describe("deletePage()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("soft-deletes leaf page", async () => {
    (mockPage.findMany as jest.Mock).mockResolvedValue([]);
    (mockPage.update as jest.Mock).mockResolvedValue({ id: PAGE_ID, isDeleted: true });

    const result = await deletePage({ id: PAGE_ID });

    expect(result.success).toBe(true);
    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: PAGE_ID },
      data: { isDeleted: true },
    });
  });

  it("soft-deletes descendants before parent", async () => {
    const childId = "cjsyq7qry000001qlpjb07000";
    (mockPage.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: childId }])
      .mockResolvedValueOnce([]);
    (mockPage.update as jest.Mock).mockResolvedValue({ isDeleted: true });

    await deletePage({ id: PAGE_ID });

    expect(mockPage.update).toHaveBeenNthCalledWith(1, {
      where: { id: childId },
      data: { isDeleted: true },
    });
    expect(mockPage.update).toHaveBeenNthCalledWith(2, {
      where: { id: PAGE_ID },
      data: { isDeleted: true },
    });
  });
});

describe("restorePage()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("restores page and descendants recursively", async () => {
    const childId = "cjsyq7qry000001qlpjb07001";
    (mockPage.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: childId }])
      .mockResolvedValueOnce([]);
    (mockPage.update as jest.Mock).mockResolvedValue({ id: PAGE_ID, isDeleted: false });

    const result = await restorePage({ id: PAGE_ID });

    expect(result.success).toBe(true);
    expect(mockPage.update).toHaveBeenNthCalledWith(1, {
      where: { id: PAGE_ID },
      data: { isDeleted: false },
    });
    expect(mockPage.update).toHaveBeenNthCalledWith(2, {
      where: { id: childId },
      data: { isDeleted: false },
    });
  });
});

describe("permanentlyDeletePage()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("hard-deletes page", async () => {
    (mockPage.delete as jest.Mock).mockResolvedValue({ id: PAGE_ID });

    const result = await permanentlyDeletePage({ id: PAGE_ID });

    expect(result.success).toBe(true);
    expect(mockPage.delete).toHaveBeenCalledWith({ where: { id: PAGE_ID } });
  });
});

describe("toggleFavorite()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("toggles favorite state", async () => {
    (mockPage.findUnique as jest.Mock).mockResolvedValue({ isFavorite: false });
    (mockPage.update as jest.Mock).mockResolvedValue({ isFavorite: true });

    const result = await toggleFavorite({ id: PAGE_ID });

    expect(result.success).toBe(true);
    expect(result.isFavorite).toBe(true);
    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: PAGE_ID },
      data: { isFavorite: true },
    });
  });
});

describe("versions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("savePageVersion removes oldest when page already has 20 versions", async () => {
    (mockPageVersion.count as jest.Mock).mockResolvedValue(20);
    (mockPageVersion.findFirst as jest.Mock).mockResolvedValue({ id: VERSION_ID });
    (mockPageVersion.delete as jest.Mock).mockResolvedValue({ id: VERSION_ID });
    (mockPageVersion.create as jest.Mock).mockResolvedValue({ id: "newVersion" });

    const result = await savePageVersion({
      pageId: PAGE_ID,
      title: "Snapshot",
      content: [{ type: "paragraph" }],
    });

    expect(result.success).toBe(true);
    expect(mockPageVersion.delete).toHaveBeenCalledWith({ where: { id: VERSION_ID } });
    expect(mockPageVersion.create).toHaveBeenCalled();
  });

  it("getPageVersions returns ordered versions", async () => {
    const versions = [{ id: VERSION_ID, title: "v1", createdAt: new Date() }];
    (mockPageVersion.findMany as jest.Mock).mockResolvedValue(versions);

    const result = await getPageVersions({ pageId: PAGE_ID });

    expect(result).toEqual(versions);
    expect(mockPageVersion.findMany).toHaveBeenCalledWith({
      where: { pageId: PAGE_ID },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true },
    });
  });

  it("restorePageVersion saves current snapshot before restoring", async () => {
    (mockPageVersion.findUnique as jest.Mock).mockResolvedValue({
      id: VERSION_ID,
      title: "Version antigua",
      content: [{ type: "paragraph", content: [] }],
    });
    (mockPage.findUnique as jest.Mock).mockResolvedValue({
      title: "Actual",
      content: [{ type: "paragraph", content: [{ type: "text", text: "actual" }] }],
    });
    (mockPageVersion.count as jest.Mock).mockResolvedValue(0);
    (mockPageVersion.create as jest.Mock).mockResolvedValue({ id: "newSnapshot" });
    (mockPage.update as jest.Mock).mockResolvedValue({ id: PAGE_ID, title: "Version antigua" });

    const result = await restorePageVersion({ versionId: VERSION_ID, pageId: PAGE_ID });

    expect(result.success).toBe(true);
    expect(mockPageVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pageId: PAGE_ID, title: "Actual" }),
      })
    );
    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: PAGE_ID },
      data: {
        title: "Version antigua",
        content: [{ type: "paragraph", content: [] }],
      },
    });
  });
});

describe("templates", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getTemplates ensures system templates and returns list", async () => {
    const items = [{ id: TEMPLATE_ID, title: "Meeting Notes", icon: "📝", isSystem: true, content: [] }];
    (mockPage.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(items);
    (mockPage.createMany as jest.Mock).mockResolvedValue({ count: 4 });

    const result = await getTemplates();

    expect(mockPage.createMany).toHaveBeenCalled();
    expect(result).toEqual(items);
  });
});

describe("getPageTree()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns a flat list of non-deleted pages", async () => {
    const mockPages = [{ id: PAGE_ID, title: "Raiz", icon: null, parentId: null, position: 0 }];
    (mockPage.findMany as jest.Mock).mockResolvedValue(mockPages);

    const pages = await getPageTree();

    expect(pages).toHaveLength(1);
    expect(pages[0].title).toBe("Raiz");
  });
});
