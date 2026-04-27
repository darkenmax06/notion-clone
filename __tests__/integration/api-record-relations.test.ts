/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

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

import { prisma } from "@/lib/prisma";
import { PUT } from "@/app/api/records/[id]/relations/route";

const mockRecord = prisma.record as jest.Mocked<typeof prisma.record>;
const mockField = prisma.field as jest.Mocked<typeof prisma.field>;
const mockRecordRelation = prisma.recordRelation as jest.Mocked<typeof prisma.recordRelation>;
const mockTransaction = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;

const makeRequest = (recordId: string, body: object) =>
  new NextRequest(`http://localhost:3000/api/records/${recordId}/relations`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PUT /api/records/[id]/relations", () => {
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

  it("updates relation links and returns 200", async () => {
    (mockRecord.findUnique as jest.Mock).mockResolvedValue({
      id: "rec-1",
      databaseId: "ctest00000000000000000001",
      isDeleted: false,
    });
    (mockField.findUnique as jest.Mock).mockResolvedValue({
      id: "field-rel",
      type: "RELATION",
      databaseId: "ctest00000000000000000001",
    });
    (mockRecord.findMany as jest.Mock).mockResolvedValue([{ id: "ctest00000000000000000002" }]);

    const response = await PUT(
      makeRequest("rec-1", {
        fieldId: "ctest00000000000000000003",
        targetRecordIds: [
          "ctest00000000000000000002",
          "ctest00000000000000000002",
        ],
      }),
      context("rec-1")
    );

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockRecordRelation.deleteMany).toHaveBeenCalled();
    expect(mockRecordRelation.createMany).toHaveBeenCalled();
  });

  it("returns 400 when field is not relation", async () => {
    (mockRecord.findUnique as jest.Mock).mockResolvedValue({
      id: "rec-1",
      databaseId: "ctest00000000000000000001",
      isDeleted: false,
    });
    (mockField.findUnique as jest.Mock).mockResolvedValue({
      id: "field-text",
      type: "TEXT",
      databaseId: "ctest00000000000000000001",
    });

    const response = await PUT(
      makeRequest("rec-1", {
        fieldId: "ctest00000000000000000003",
        targetRecordIds: [],
      }),
      context("rec-1")
    );

    expect(response.status).toBe(400);
  });
});

