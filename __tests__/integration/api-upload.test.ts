/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: jest.fn(),
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
}));

import { POST } from "@/app/api/upload/route";

const makeRequest = (formData: FormData) =>
  new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    body: formData,
  });

describe("POST /api/upload", () => {
  const previousStorage = process.env.UPLOAD_STORAGE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.UPLOAD_STORAGE = "local";
  });

  afterAll(() => {
    process.env.UPLOAD_STORAGE = previousStorage;
  });

  it("uploads a local file and returns metadata", async () => {
    const formData = new FormData();
    formData.append("file", new File(["contenido"], "documento.txt", { type: "text/plain" }));

    const response = await POST(makeRequest(formData));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.name).toBe("documento.txt");
    expect(payload.url).toMatch(/^\/uploads\//);
    expect(payload.mimeType).toBe("text/plain");
  });

  it("returns 400 when file is missing", async () => {
    const response = await POST(makeRequest(new FormData()));
    expect(response.status).toBe(400);
  });
});
