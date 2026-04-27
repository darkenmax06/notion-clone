/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    record: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    field: {
      findUnique: jest.fn(),
    },
    recordRelation: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prisma } from "@/lib/prisma";
import { setRecordRelations } from "@/lib/actions/records";

const mockRecord = prisma.record as jest.Mocked<typeof prisma.record>;
const mockField = prisma.field as jest.Mocked<typeof prisma.field>;
const mockTransaction = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;
const mockRecordRelation = prisma.recordRelation as jest.Mocked<typeof prisma.recordRelation>;

describe("setRecordRelations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async (callback: any) =>
      callback({
        recordRelation: {
          deleteMany: mockRecordRelation.deleteMany,
          createMany: mockRecordRelation.createMany,
        },
      } as any)
    );
  });

  it("replaces relation rows and keeps only valid target ids", async () => {
    (mockRecord.findUnique as jest.Mock).mockResolvedValue({
      id: "rec-1",
      databaseId: "db-1",
      isDeleted: false,
    });
    (mockField.findUnique as jest.Mock).mockResolvedValue({
      id: "field-rel",
      databaseId: "db-1",
      type: "RELATION",
    });
    (mockRecord.findMany as jest.Mock).mockResolvedValue([{ id: "target-1" }]);

    const result = await setRecordRelations("rec-1", "db-1", "field-rel", [
      "target-1",
      "target-1",
      "target-2",
    ]);

    expect(result.success).toBe(true);
    expect(result.targetRecordIds).toEqual(["target-1"]);
    expect(mockRecordRelation.deleteMany).toHaveBeenCalledWith({
      where: { sourceRecordId: "rec-1", fieldId: "field-rel" },
    });
    expect(mockRecordRelation.createMany).toHaveBeenCalledWith({
      data: [
        {
          sourceRecordId: "rec-1",
          targetRecordId: "target-1",
          fieldId: "field-rel",
        },
      ],
      skipDuplicates: true,
    });
  });

  it("throws when field is not relation", async () => {
    (mockRecord.findUnique as jest.Mock).mockResolvedValue({
      id: "rec-1",
      databaseId: "db-1",
      isDeleted: false,
    });
    (mockField.findUnique as jest.Mock).mockResolvedValue({
      id: "field-text",
      databaseId: "db-1",
      type: "TEXT",
    });

    await expect(
      setRecordRelations("rec-1", "db-1", "field-text", ["target-1"])
    ).rejects.toThrow("Campo de relacion invalido");
  });
});
