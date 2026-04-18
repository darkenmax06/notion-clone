import { createPage, updatePage, deletePage, getPageTree } from "@/lib/actions/pages";

// Mock PrismaClient
jest.mock("@/lib/prisma", () => ({
  prisma: {
    page: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Importar después del mock para obtener el mock tipado
import { prisma } from "@/lib/prisma";
const mockPage = prisma.page as jest.Mocked<typeof prisma.page>;

const VALID_CUID = "cjsyq7qry000001qlpjb069q7";

describe("createPage()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a page with default title when none is provided", async () => {
    const fakeCreated = { id: VALID_CUID, title: "Sin título", position: 0 };
    (mockPage.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPage.create as jest.Mock).mockResolvedValue(fakeCreated);

    const result = await createPage({ title: "Sin título" });

    expect(result.success).toBe(true);
    expect(result.page).toMatchObject({ title: "Sin título" });
    expect(mockPage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Sin título", position: 0 }),
    });
  });

  it("increments position after the last sibling", async () => {
    (mockPage.findFirst as jest.Mock).mockResolvedValue({ position: 4 });
    (mockPage.create as jest.Mock).mockResolvedValue({ id: VALID_CUID, title: "Nuevo", position: 5 });

    await createPage({ title: "Nuevo" });

    expect(mockPage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ position: 5 }),
    });
  });

  it("accepts a valid parentId", async () => {
    (mockPage.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPage.create as jest.Mock).mockResolvedValue({ id: VALID_CUID, title: "Hijo", position: 0 });

    const result = await createPage({ title: "Hijo", parentId: VALID_CUID });

    expect(result.success).toBe(true);
    expect(mockPage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ parentId: VALID_CUID }),
    });
  });

  it("rejects a title that exceeds 500 characters", async () => {
    await expect(createPage({ title: "a".repeat(501) })).rejects.toThrow();
  });
});

describe("updatePage()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates only the fields that were provided", async () => {
    const updated = { id: VALID_CUID, title: "Actualizado" };
    (mockPage.update as jest.Mock).mockResolvedValue(updated);

    const result = await updatePage({ id: VALID_CUID, title: "Actualizado" });

    expect(result.success).toBe(true);
    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: VALID_CUID },
      data: { title: "Actualizado" },
    });
  });

  it("updates content (BlockNote JSON)", async () => {
    const content = [{ type: "paragraph", content: [] }];
    (mockPage.update as jest.Mock).mockResolvedValue({ id: VALID_CUID, content });

    await updatePage({ id: VALID_CUID, content });

    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: VALID_CUID },
      data: { content },
    });
  });

  it("rejects an invalid id format", async () => {
    await expect(updatePage({ id: "not-a-cuid", title: "x" })).rejects.toThrow();
  });
});

describe("deletePage()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("soft-deletes a page with no children", async () => {
    (mockPage.findMany as jest.Mock).mockResolvedValue([]);
    (mockPage.update as jest.Mock).mockResolvedValue({ id: VALID_CUID, isDeleted: true });

    const result = await deletePage({ id: VALID_CUID });

    expect(result.success).toBe(true);
    expect(mockPage.update).toHaveBeenCalledWith({
      where: { id: VALID_CUID },
      data: { isDeleted: true },
    });
  });

  it("recursively soft-deletes children before the parent", async () => {
    const childId = "child000000000000000000001";
    // First call: children of parent; second call: children of child (none)
    (mockPage.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: childId }])
      .mockResolvedValueOnce([]);
    (mockPage.update as jest.Mock).mockResolvedValue({ isDeleted: true });

    await deletePage({ id: VALID_CUID });

    // Child updated first, then parent
    expect(mockPage.update).toHaveBeenNthCalledWith(1, {
      where: { id: childId },
      data: { isDeleted: true },
    });
    expect(mockPage.update).toHaveBeenNthCalledWith(2, {
      where: { id: VALID_CUID },
      data: { isDeleted: true },
    });
  });
});

describe("getPageTree()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns a flat list of non-deleted pages", async () => {
    const mockPages = [
      { id: VALID_CUID, title: "Raíz", icon: null, parentId: null, position: 0 },
    ];
    (mockPage.findMany as jest.Mock).mockResolvedValue(mockPages);

    const pages = await getPageTree();

    expect(pages).toHaveLength(1);
    expect(pages[0].title).toBe("Raíz");
  });
});
