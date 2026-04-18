/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    database: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    field: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prisma } from "@/lib/prisma";
import {
  createDatabase,
  updateDatabase,
  deleteDatabase,
  createField,
  updateField,
  deleteField,
} from "@/lib/actions/databases";

const mockDb = prisma.database as jest.Mocked<typeof prisma.database>;
const mockField = prisma.field as jest.Mocked<typeof prisma.field>;

const DB_ID = "ctest00000000000000000001";
const FIELD_ID = "ctest00000000000000000002";

describe("createDatabase", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a database with a default TEXT field", async () => {
    const fakeDb = { id: DB_ID, title: "Mi base", icon: null, fields: [] };
    (mockDb.create as jest.Mock).mockResolvedValue(fakeDb);

    const result = await createDatabase({ title: "Mi base" });

    expect(result.success).toBe(true);
    expect(mockDb.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Mi base",
          fields: { create: [{ name: "Nombre", type: "TEXT", position: 0 }] },
        }),
      })
    );
  });

  it("uses default title when not provided", async () => {
    (mockDb.create as jest.Mock).mockResolvedValue({ id: DB_ID, title: "Base de datos sin título", fields: [] });

    const result = await createDatabase({});

    expect(result.success).toBe(true);
    expect(mockDb.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Base de datos sin título" }),
      })
    );
  });

  it("throws on Zod validation error for too-long title", async () => {
    await expect(createDatabase({ title: "x".repeat(501) })).rejects.toThrow();
  });
});

describe("updateDatabase", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates title", async () => {
    (mockDb.update as jest.Mock).mockResolvedValue({ id: DB_ID, title: "Nuevo título" });

    const result = await updateDatabase(DB_ID, { title: "Nuevo título" });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DB_ID }, data: { title: "Nuevo título" } })
    );
  });
});

describe("deleteDatabase", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes database", async () => {
    (mockDb.delete as jest.Mock).mockResolvedValue({});

    const result = await deleteDatabase(DB_ID);

    expect(result.success).toBe(true);
    expect(mockDb.delete).toHaveBeenCalledWith({ where: { id: DB_ID } });
  });
});

describe("createField", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates field with correct position", async () => {
    (mockField.findFirst as jest.Mock).mockResolvedValue({ position: 2 });
    (mockField.create as jest.Mock).mockResolvedValue({ id: FIELD_ID, name: "Estado", type: "SELECT", position: 3 });

    const result = await createField(DB_ID, { name: "Estado", type: "SELECT", options: [] });

    expect(result.success).toBe(true);
    expect(mockField.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 3 }) })
    );
  });

  it("starts at position 0 when no fields exist", async () => {
    (mockField.findFirst as jest.Mock).mockResolvedValue(null);
    (mockField.create as jest.Mock).mockResolvedValue({ id: FIELD_ID, name: "Nombre", type: "TEXT", position: 0 });

    const result = await createField(DB_ID, { name: "Nombre", type: "TEXT" });

    expect(result.success).toBe(true);
    expect(mockField.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 0 }) })
    );
  });

  it("rejects invalid field type", async () => {
    await expect(createField(DB_ID, { name: "Test", type: "INVALID" as never })).rejects.toThrow();
  });
});

describe("updateField", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates field name", async () => {
    (mockField.update as jest.Mock).mockResolvedValue({ id: FIELD_ID, name: "Nuevo nombre" });

    const result = await updateField(FIELD_ID, DB_ID, { name: "Nuevo nombre" });

    expect(result.success).toBe(true);
    expect(mockField.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: FIELD_ID }, data: { name: "Nuevo nombre" } })
    );
  });
});

describe("deleteField", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes field", async () => {
    (mockField.delete as jest.Mock).mockResolvedValue({});

    const result = await deleteField(FIELD_ID, DB_ID);

    expect(result.success).toBe(true);
    expect(mockField.delete).toHaveBeenCalledWith({ where: { id: FIELD_ID } });
  });
});
