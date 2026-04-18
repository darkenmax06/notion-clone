/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    record: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prisma } from "@/lib/prisma";
import { createRecord, updateRecord, deleteRecord } from "@/lib/actions/records";

const mockRecord = prisma.record as jest.Mocked<typeof prisma.record>;

const DB_ID = "ctest00000000000000000001";
const RECORD_ID = "ctest00000000000000000003";

describe("createRecord", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates record with correct position", async () => {
    (mockRecord.findFirst as jest.Mock).mockResolvedValue({ position: 4 });
    (mockRecord.create as jest.Mock).mockResolvedValue({ id: RECORD_ID, position: 5, values: {} });

    const result = await createRecord(DB_ID);

    expect(result.success).toBe(true);
    expect(mockRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 5, values: {}, databaseId: DB_ID }) })
    );
  });

  it("starts at position 0 when database is empty", async () => {
    (mockRecord.findFirst as jest.Mock).mockResolvedValue(null);
    (mockRecord.create as jest.Mock).mockResolvedValue({ id: RECORD_ID, position: 0, values: {} });

    const result = await createRecord(DB_ID);

    expect(result.success).toBe(true);
    expect(mockRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 0 }) })
    );
  });
});

describe("updateRecord", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates record values", async () => {
    const values = { fieldA: "texto", fieldB: 42 };
    (mockRecord.update as jest.Mock).mockResolvedValue({ id: RECORD_ID, values });

    const result = await updateRecord(RECORD_ID, DB_ID, values);

    expect(result.success).toBe(true);
    expect(mockRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: RECORD_ID }, data: { values } })
    );
  });

  it("accepts empty values object", async () => {
    (mockRecord.update as jest.Mock).mockResolvedValue({ id: RECORD_ID, values: {} });

    const result = await updateRecord(RECORD_ID, DB_ID, {});

    expect(result.success).toBe(true);
  });
});

describe("deleteRecord", () => {
  beforeEach(() => jest.clearAllMocks());

  it("soft-deletes record", async () => {
    (mockRecord.update as jest.Mock).mockResolvedValue({ id: RECORD_ID, isDeleted: true });

    const result = await deleteRecord(RECORD_ID, DB_ID);

    expect(result.success).toBe(true);
    expect(mockRecord.update).toHaveBeenCalledWith({
      where: { id: RECORD_ID },
      data: { isDeleted: true },
    });
  });
});
