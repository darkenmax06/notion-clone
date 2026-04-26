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

describe("updateDatabase - viewType support", () => {
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

  it("updates viewType to GALLERY", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      title: "Test DB",
      viewType: "GALLERY",
    });

    const result = await updateDatabase(DB_ID, { viewType: "GALLERY" });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ viewType: "GALLERY" }),
      })
    );
  });

  it("updates viewType to LIST", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      title: "Test DB",
      viewType: "LIST",
    });

    const result = await updateDatabase(DB_ID, { viewType: "LIST" });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ viewType: "LIST" }),
      })
    );
  });

  it("updates viewType to TIMELINE", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      title: "Test DB",
      viewType: "TIMELINE",
    });

    const result = await updateDatabase(DB_ID, { viewType: "TIMELINE" });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ viewType: "TIMELINE" }),
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
      title: "Nuevo titulo",
    });

    await updateDatabase(DB_ID, { title: "Nuevo titulo" });

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

describe("updateDatabase - kanbanGroupFieldId support", () => {
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

    await updateDatabase(DB_ID, { title: "Solo titulo" });

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

describe("updateDatabase - gallery/timeline config support", () => {
  beforeEach(() => jest.clearAllMocks());

  it("saves galleryImageFieldId", async () => {
    const FIELD_ID = "ctest00000000000000000111";
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      galleryImageFieldId: FIELD_ID,
    });

    const result = await updateDatabase(DB_ID, { galleryImageFieldId: FIELD_ID });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ galleryImageFieldId: FIELD_ID }),
      })
    );
  });

  it("can clear galleryImageFieldId", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      galleryImageFieldId: null,
    });

    const result = await updateDatabase(DB_ID, { galleryImageFieldId: null });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ galleryImageFieldId: null }),
      })
    );
  });

  it("saves timeline start/end fields together", async () => {
    const START_ID = "ctest00000000000000000221";
    const END_ID = "ctest00000000000000000222";
    (mockDb.update as jest.Mock).mockResolvedValue({
      id: DB_ID,
      timelineStartFieldId: START_ID,
      timelineEndFieldId: END_ID,
    });

    const result = await updateDatabase(DB_ID, {
      timelineStartFieldId: START_ID,
      timelineEndFieldId: END_ID,
    });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          timelineStartFieldId: START_ID,
          timelineEndFieldId: END_ID,
        }),
      })
    );
  });

  it("does not include gallery/timeline fields when omitted", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({ id: DB_ID });

    await updateDatabase(DB_ID, { title: "Solo titulo" });

    const callArg = (mockDb.update as jest.Mock).mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty("galleryImageFieldId");
    expect(callArg.data).not.toHaveProperty("timelineStartFieldId");
    expect(callArg.data).not.toHaveProperty("timelineEndFieldId");
  });
});