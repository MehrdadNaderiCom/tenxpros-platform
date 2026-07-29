import { describe, expect, it } from "vitest";
import {
  ReceiptUploadError,
  sanitizeReceiptFileName,
  validateReceiptUpload,
  validateReceiptUploadMetadata,
} from "../src/lib/uploads";

function upload(
  bytes: number[],
  type: string,
  name = "receipt",
) {
  const buffer = Uint8Array.from(bytes);
  return {
    name,
    type,
    size: buffer.byteLength,
    async arrayBuffer() {
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
    },
  };
}

describe("receipt upload validation", () => {
  it("accepts a PNG by signature and keeps a safe Persian filename", async () => {
    const file = upload(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00],
      "image/png",
      "فیش واریزی.png",
    );

    const result = await validateReceiptUpload(file);

    expect(result.mimeType).toBe("image/png");
    expect(result.extension).toBe("png");
    expect(result.originalName).toBe("فیش واریزی.png");
    expect(result.sha256).toMatch(/^[a-f\d]{64}$/);
  });

  it("accepts octet-stream metadata when a PDF signature is valid", async () => {
    const result = await validateReceiptUpload(
      upload(
        [...Buffer.from("%PDF-1.7\n", "ascii"), 0x00],
        "application/octet-stream",
        "receipt.bin",
      ),
    );

    expect(result.mimeType).toBe("application/pdf");
    expect(result.extension).toBe("pdf");
  });

  it("rejects a declared image whose content is HTML", async () => {
    const file = upload(
      [...Buffer.from("<html>", "ascii")],
      "image/jpeg",
      "fake.jpg",
    );

    await expect(validateReceiptUpload(file)).rejects.toMatchObject({
      code: "INVALID_FILE_SIGNATURE",
    });
  });

  it("rejects a valid signature that disagrees with declared MIME", async () => {
    const file = upload(
      [...Buffer.from("%PDF-1.7\n", "ascii")],
      "image/png",
      "fake.png",
    );

    await expect(validateReceiptUpload(file)).rejects.toMatchObject({
      code: "INVALID_FILE_SIGNATURE",
    });
  });

  it("rejects empty and oversized files before reading their body", () => {
    expect(() =>
      validateReceiptUploadMetadata(
        { name: "empty.pdf", type: "application/pdf", size: 0 },
        10,
      ),
    ).toThrowError(ReceiptUploadError);
    try {
      validateReceiptUploadMetadata(
        { name: "large.pdf", type: "application/pdf", size: 11 },
        10,
      );
    } catch (error) {
      expect(error).toMatchObject({ code: "TOO_LARGE" });
    }
  });

  it("removes traversal and control characters from display names", () => {
    expect(sanitizeReceiptFileName("../../\0فیش<script>.pdf")).toBe(
      "فیش_script_.pdf",
    );
  });
});
