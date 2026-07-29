import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getUploadConfig } from "./config";

const MEBIBYTE = 1024 * 1024;

export const RECEIPT_UPLOAD_POLICY = Object.freeze({
  maximumBytes: 8 * MEBIBYTE,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "application/pdf",
  ] as const,
});

export type ReceiptMimeType =
  (typeof RECEIPT_UPLOAD_POLICY.allowedMimeTypes)[number];

export type ReceiptUploadLike = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type ValidatedReceiptUpload = {
  bytes: Buffer;
  originalName: string;
  mimeType: ReceiptMimeType;
  byteSize: number;
  sha256: string;
  extension: "jpg" | "png" | "pdf";
};

export type StoredPaymentReceipt = Omit<
  ValidatedReceiptUpload,
  "bytes" | "extension"
> & {
  storageKey: string;
};

export type ReceiptUploadErrorCode =
  | "EMPTY_FILE"
  | "TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "INVALID_FILE_SIGNATURE"
  | "SIZE_MISMATCH"
  | "INVALID_OWNER_ID"
  | "INVALID_STORAGE_KEY";

export class ReceiptUploadError extends Error {
  constructor(
    readonly code: ReceiptUploadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ReceiptUploadError";
  }
}

const mimeAliases = new Map<string, ReceiptMimeType>([
  ["image/jpeg", "image/jpeg"],
  ["image/jpg", "image/jpeg"],
  ["image/png", "image/png"],
  ["application/pdf", "application/pdf"],
]);

const mimeMetadataAllowed = new Set([
  ...mimeAliases.keys(),
  "",
  "application/octet-stream",
]);

function signatureMime(bytes: Buffer): ReceiptMimeType | null {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

function extensionFor(mimeType: ReceiptMimeType) {
  if (mimeType === "image/jpeg") return "jpg" as const;
  if (mimeType === "image/png") return "png" as const;
  return "pdf" as const;
}

export function sanitizeReceiptFileName(input: string) {
  const baseName = path
    .basename(input.replaceAll("\0", ""))
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "_")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 180);
  return baseName || "receipt";
}

export function validateReceiptUploadMetadata(
  file: Pick<ReceiptUploadLike, "name" | "type" | "size">,
  maximumBytes = getUploadConfig().maximumBytes,
) {
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new ReceiptUploadError("EMPTY_FILE", "The receipt file is empty.");
  }
  if (file.size > maximumBytes) {
    throw new ReceiptUploadError(
      "TOO_LARGE",
      `The receipt file must not exceed ${Math.floor(maximumBytes / MEBIBYTE)} MB.`,
    );
  }

  const declaredMime = file.type.trim().toLowerCase();
  if (!mimeMetadataAllowed.has(declaredMime)) {
    throw new ReceiptUploadError(
      "UNSUPPORTED_FILE_TYPE",
      "Only JPEG, PNG, and PDF receipt files are accepted.",
    );
  }

  return {
    originalName: sanitizeReceiptFileName(file.name),
    declaredMime,
  };
}

export async function validateReceiptUpload(
  file: ReceiptUploadLike,
): Promise<ValidatedReceiptUpload> {
  const config = getUploadConfig();
  const metadata = validateReceiptUploadMetadata(file, config.maximumBytes);
  const bytes = Buffer.from(await file.arrayBuffer());

  if (bytes.byteLength > config.maximumBytes) {
    throw new ReceiptUploadError(
      "TOO_LARGE",
      `The receipt file must not exceed ${Math.floor(config.maximumBytes / MEBIBYTE)} MB.`,
    );
  }
  if (bytes.byteLength !== file.size) {
    throw new ReceiptUploadError(
      "SIZE_MISMATCH",
      "The uploaded file size does not match its metadata.",
    );
  }

  const detectedMime = signatureMime(bytes);
  if (!detectedMime) {
    throw new ReceiptUploadError(
      "INVALID_FILE_SIGNATURE",
      "The receipt content is not a valid JPEG, PNG, or PDF file.",
    );
  }

  const declaredMime = mimeAliases.get(metadata.declaredMime);
  if (declaredMime && declaredMime !== detectedMime) {
    throw new ReceiptUploadError(
      "INVALID_FILE_SIGNATURE",
      "The receipt content does not match its declared file type.",
    );
  }

  return {
    bytes,
    originalName: metadata.originalName,
    mimeType: detectedMime,
    byteSize: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    extension: extensionFor(detectedMime),
  };
}

function assertSafeOwnerId(ownerId: string) {
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(ownerId)) {
    throw new ReceiptUploadError(
      "INVALID_OWNER_ID",
      "A valid application or member identifier is required.",
    );
  }
}

function resolveStorageKey(storageKey: string) {
  const root = getUploadConfig().directory;
  if (
    !storageKey ||
    storageKey.includes("\0") ||
    storageKey.includes("\\") ||
    storageKey.split("/").includes("..") ||
    path.isAbsolute(storageKey)
  ) {
    throw new ReceiptUploadError(
      "INVALID_STORAGE_KEY",
      "The receipt storage key is invalid.",
    );
  }

  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new ReceiptUploadError(
      "INVALID_STORAGE_KEY",
      "The receipt storage key is outside private storage.",
    );
  }
  return resolved;
}

export async function storePaymentReceipt(
  file: ReceiptUploadLike,
  ownerId: string,
): Promise<StoredPaymentReceipt> {
  assertSafeOwnerId(ownerId);
  const validated = await validateReceiptUpload(file);
  const now = new Date();
  const storageKey = [
    ownerId,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${randomUUID()}.${validated.extension}`,
  ].join("/");
  const destination = resolveStorageKey(storageKey);

  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await writeFile(destination, validated.bytes, {
    flag: "wx",
    mode: 0o600,
  });

  const { bytes: _bytes, extension: _extension, ...metadata } = validated;
  return { ...metadata, storageKey };
}

export function readPaymentReceipt(storageKey: string) {
  return readFile(resolveStorageKey(storageKey));
}

export async function deletePaymentReceipt(storageKey: string) {
  try {
    await unlink(resolveStorageKey(storageKey));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}
