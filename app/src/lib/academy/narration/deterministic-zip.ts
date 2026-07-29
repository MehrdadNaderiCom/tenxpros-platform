import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

export interface DeterministicZipEntry {
  path: string;
  data: string | Buffer;
}

export interface DeterministicZipWriteResult {
  bytes: number;
  sha256: string;
  entries: readonly string[];
}

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_STORED_METHOD = 0;
const ZIP_VERSION_2_0 = 20;
const ZIP_DOS_DATE_1980_01_01 = 33;
const ZIP_UINT16_MAX = 0xffff;
const ZIP_UINT32_MAX = 0xffffffff;

let crcTable: Uint32Array | undefined;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value =
        value & 1
          ? 0xedb88320 ^ (value >>> 1)
          : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(data: Buffer): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function assertSafeEntryPath(path: string): void {
  if (
    !path ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("\\") ||
    path.includes("\0")
  ) {
    throw new Error(`Unsafe ZIP entry path: ${JSON.stringify(path)}`);
  }
  const segments = path.split("/");
  if (
    segments.some(
      (segment) => !segment || segment === "." || segment === "..",
    )
  ) {
    throw new Error(`Unsafe ZIP entry path: ${JSON.stringify(path)}`);
  }
  if (Buffer.byteLength(path, "utf8") > ZIP_UINT16_MAX) {
    throw new Error(`ZIP entry path is too long: ${path}`);
  }
}

function normalizeEntries(
  entries: readonly DeterministicZipEntry[],
): readonly {
  path: string;
  pathBytes: Buffer;
  data: Buffer;
  crc: number;
}[] {
  if (entries.length === 0) {
    throw new Error("A ZIP archive must contain at least one file");
  }
  if (entries.length > ZIP_UINT16_MAX) {
    throw new Error("ZIP64 archives are not supported");
  }
  const seen = new Set<string>();
  return entries
    .map((entry) => {
      assertSafeEntryPath(entry.path);
      if (seen.has(entry.path)) {
        throw new Error(`Duplicate ZIP entry path: ${entry.path}`);
      }
      seen.add(entry.path);
      const data = Buffer.isBuffer(entry.data)
        ? Buffer.from(entry.data)
        : Buffer.from(entry.data, "utf8");
      if (data.length > ZIP_UINT32_MAX) {
        throw new Error(`ZIP64 entry is not supported: ${entry.path}`);
      }
      return {
        path: entry.path,
        pathBytes: Buffer.from(entry.path, "utf8"),
        data,
        crc: crc32(data),
      };
    })
    .sort((left, right) =>
      Buffer.compare(left.pathBytes, right.pathBytes),
    );
}

/**
 * Builds a byte-for-byte deterministic, dependency-free ZIP archive.
 *
 * Entries use the standard "stored" method, UTF-8 names, no comments or extra
 * fields, and the ZIP epoch timestamp. This intentionally avoids shelling out
 * to a platform-specific archive utility.
 */
export function createDeterministicZip(
  entries: readonly DeterministicZipEntry[],
): Buffer {
  const normalized = normalizeEntries(entries);
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of normalized) {
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(
      ZIP_LOCAL_FILE_HEADER_SIGNATURE,
      0,
    );
    localHeader.writeUInt16LE(ZIP_VERSION_2_0, 4);
    localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6);
    localHeader.writeUInt16LE(ZIP_STORED_METHOD, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(ZIP_DOS_DATE_1980_01_01, 12);
    localHeader.writeUInt32LE(entry.crc, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(entry.pathBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, entry.pathBytes, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(
      ZIP_CENTRAL_DIRECTORY_SIGNATURE,
      0,
    );
    centralHeader.writeUInt16LE(ZIP_VERSION_2_0, 4);
    centralHeader.writeUInt16LE(ZIP_VERSION_2_0, 6);
    centralHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8);
    centralHeader.writeUInt16LE(ZIP_STORED_METHOD, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(ZIP_DOS_DATE_1980_01_01, 14);
    centralHeader.writeUInt32LE(entry.crc, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(entry.pathBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, entry.pathBytes);

    localOffset +=
      localHeader.length + entry.pathBytes.length + entry.data.length;
    if (localOffset > ZIP_UINT32_MAX) {
      throw new Error("ZIP64 archives are not supported");
    }
  }

  const centralDirectory = Buffer.concat(centralParts);
  if (
    centralDirectory.length > ZIP_UINT32_MAX ||
    localOffset + centralDirectory.length > ZIP_UINT32_MAX
  ) {
    throw new Error("ZIP64 archives are not supported");
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(normalized.length, 8);
  end.writeUInt16LE(normalized.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export async function writeDeterministicZip(
  outputPath: string,
  entries: readonly DeterministicZipEntry[],
): Promise<DeterministicZipWriteResult> {
  const archive = createDeterministicZip(entries);
  await writeFile(outputPath, archive, { flag: "wx", mode: 0o600 });
  return {
    bytes: archive.length,
    sha256: createHash("sha256").update(archive).digest("hex"),
    entries: normalizeEntries(entries).map((entry) => entry.path),
  };
}
