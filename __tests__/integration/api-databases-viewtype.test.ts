/**
 * @jest-environment node
 */

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

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prisma } from "@/lib/prisma";
import { updateDatabase } from "@/lib/actions/databases";

const mockDb = prisma.database as jest.Mocked<typeof prisma.database>;

const DB_ID = "ctest00000000000000000099";

describe("updateDatabase — viewType support", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates viewType to KANBAN", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      title: "Test DB",
      viewType: "KANBAN",
    });

    const result = await updateDatabase(DB_ID, { viewType: "KANBAN" });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DB_ID },
        data: expect.objectContaining({ viewType: "KANBAN" }),
      })
    );
  });

  it("updates viewType to CALENDAR", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      title: "Test DB",
      viewType: "CALENDAR",
    });

    const result = await updateDatabase(DB_ID, { viewType: "CALENDAR" });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ viewType: "CALENDAR" }),
      })
    );
  });

  it("updates viewType back to TABLE", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      title: "Test DB",
      viewType: "TABLE",
    });

    const result = await updateDatabase(DB_ID, { viewType: "TABLE" });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ viewType: "TABLE" }),
      })
    );
  });

  it("does not include viewType in data when not provided", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      title: "Nuevo título",
    });

    await updateDatabase(DB_ID, { title: "Nuevo título" });

    const callArg = (mockDb.update as jest.Mock).mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty("viewType");
  });

  it("can update title and viewType together", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      title: "Board de tareas",
      viewType: "KANBAN",
    });

    const result = await updateDatabase(DB_ID, {
      title: "Board de tareas",
      viewType: "KANBAN",
    });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Board de tareas",
          viewType: "KANBAN",
        }),
      })
    );
  });

  it("rejects invalid viewType values", async () => {
    await expect(
      updateDatabase(DB_ID, { viewType: "INVALID" as never })
    ).rejects.toThrow();
  });
});

describe("updateDatabase — kanbanGroupFieldId support", () => {
  beforeEach(() => jest.clearAllMocks());

  it("saves a kanbanGroupFieldId", async () => {
    const FIELD_ID = "ctest00000000000000000077";
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      kanbanGroupFieldId: FIELD_ID,
    });

    const result = await updateDatabase(DB_ID, { kanbanGroupFieldId: FIELD_ID });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kanbanGroupFieldId: FIELD_ID }),
      })
    );
  });

  it("can clear kanbanGroupFieldId by setting null", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      kanbanGroupFieldId: null,
    });

    const result = await updateDatabase(DB_ID, { kanbanGroupFieldId: null });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kanbanGroupFieldId: null }),
      })
    );
  });

  it("does not include kanbanGroupFieldId when not provided", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({ id: DB_ID });

    await updateDatabase(DB_ID, { title: "Solo título" });

    const callArg = (mockDb.update as jest.Mock).mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty("kanbanGroupFieldId");
  });

  it("can update viewType and kanbanGroupFieldId together", async () => {
    const FIELD_ID = "ctest00000000000000000088";
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      viewType: "KANBAN",
      kanbanGroupFieldId: FIELD_ID,
    });

    const result = await updateDatabase(DB_ID, {
      viewType: "KANBAN",
      kanbanGroupFieldId: FIELD_ID,
    });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          viewType: "KANBAN",
          kanbanGroupFieldId: FIELD_ID,
        }),
      })
    );
  });
});
