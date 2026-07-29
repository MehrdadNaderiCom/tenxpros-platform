#!/usr/bin/env node
"use strict";

const { createHash, randomBytes, timingSafeEqual } = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4173;
const ROOT_FILES = Object.freeze([
  "LISTENER-INSTRUCTIONS.txt",
  "audio",
  "index.html",
]);
const CONTENT_TYPES = Object.freeze({
  "index.html": "text/html; charset=utf-8",
  "LISTENER-INSTRUCTIONS.txt": "text/plain; charset=utf-8",
});

function usage() {
  return [
    "Serve a blind audio listening package with temporary authentication",
    "",
    "Usage:",
    "  node scripts/piper-listening-server.cjs --root <listener-directory> [options]",
    "",
    "Options:",
    `  --host <host>             Bind address (default: ${DEFAULT_HOST})`,
    `  --port <port>             TCP port (default: ${DEFAULT_PORT})`,
    "  --username <name>         Login name (default: listener)",
    "  --allow-network-exposure  Required for any non-loopback host",
    "  --tls-cert <path>         TLS certificate; required off loopback",
    "  --tls-key <path>          TLS private key; required off loopback",
    "  --self-test               Run policy tests and exit",
    "  --help                    Show this message",
    "",
    "Set PHASE2B_LISTENER_PASSWORD to a secret of at least 20 characters, or",
    "omit it and the server will generate and display a temporary password once.",
  ].join("\n");
}

function optionValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseArgs(argv) {
  const result = {
    root: "",
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    username: process.env.PHASE2B_LISTENER_USERNAME || "listener",
    password: process.env.PHASE2B_LISTENER_PASSWORD || "",
    generatedPassword: false,
    allowNetworkExposure: false,
    tlsCert: "",
    tlsKey: "",
    help: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      result.help = true;
    } else if (argument === "--self-test") {
      result.selfTest = true;
    } else if (argument === "--allow-network-exposure") {
      result.allowNetworkExposure = true;
    } else if (
      [
        "--root",
        "--host",
        "--port",
        "--username",
        "--tls-cert",
        "--tls-key",
      ].includes(argument)
    ) {
      const value = optionValue(argv, index, argument);
      index += 1;
      if (argument === "--root") result.root = value;
      else if (argument === "--host") result.host = value;
      else if (argument === "--port") result.port = Number(value);
      else if (argument === "--username") result.username = value;
      else if (argument === "--tls-cert") result.tlsCert = value;
      else if (argument === "--tls-key") result.tlsKey = value;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (result.help || result.selfTest) return result;
  if (!result.root) throw new Error("--root is required");
  if (
    !Number.isInteger(result.port) ||
    result.port < 1 ||
    result.port > 65535
  ) {
    throw new Error("--port must be an integer from 1 through 65535");
  }
  if (!/^[A-Za-z0-9._-]{3,32}$/u.test(result.username)) {
    throw new Error(
      "--username must contain 3–32 letters, numbers, dots, underscores, or hyphens",
    );
  }
  if (!result.password) {
    result.password = randomBytes(18).toString("base64url");
    result.generatedPassword = true;
  }
  if (result.password.length < 20) {
    throw new Error(
      "PHASE2B_LISTENER_PASSWORD must contain at least 20 characters",
    );
  }
  return result;
}

function isLoopbackHost(host) {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized === "localhost"
  );
}

function validateExposurePolicy(options) {
  const loopback = isLoopbackHost(options.host);
  if (
    !loopback &&
    (!options.allowNetworkExposure ||
      !options.tlsCert ||
      !options.tlsKey)
  ) {
    throw new Error(
      "A non-loopback host requires --allow-network-exposure, --tls-cert, and --tls-key",
    );
  }
  if (Boolean(options.tlsCert) !== Boolean(options.tlsKey)) {
    throw new Error("--tls-cert and --tls-key must be supplied together");
  }
}

function safeRequestPath(rawUrl, allowedPaths) {
  if (
    typeof rawUrl !== "string" ||
    rawUrl.includes("?") ||
    rawUrl.includes("#")
  ) {
    return undefined;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(rawUrl);
  } catch {
    return undefined;
  }
  if (
    !decoded.startsWith("/") ||
    decoded.includes("\\") ||
    decoded.includes("\0") ||
    decoded.split("/").some((segment) => segment === "..")
  ) {
    return undefined;
  }
  const normalized = decoded === "/" ? "/index.html" : decoded;
  return allowedPaths.has(normalized)
    ? normalized.slice(1)
    : undefined;
}

function parseStudyDefinition(html) {
  const match = html.match(
    /<script type="application\/json" id="study-data">([^<]+)<\/script>/u,
  );
  if (!match) {
    throw new Error("The listening page has no embedded public definition");
  }
  let definition;
  try {
    definition = JSON.parse(match[1]);
  } catch {
    throw new Error("The embedded public definition is invalid JSON");
  }
  if (
    !definition ||
    definition.schema_version !==
      "academy-blind-listening-package-v2" ||
    !/^blind-review-[a-f0-9]{16}$/u.test(
      definition.evaluation_package_id,
    ) ||
    !Array.isArray(definition.pairs) ||
    definition.pairs.length === 0
  ) {
    throw new Error("The embedded public definition is invalid");
  }
  const filenames = [];
  const seenPairs = new Set();
  const seenFiles = new Set();
  for (const pair of definition.pairs) {
    if (
      !pair ||
      !/^sample-\d{2}$/u.test(pair.pair_id) ||
      seenPairs.has(pair.pair_id) ||
      !Array.isArray(pair.samples) ||
      pair.samples.length !== 2
    ) {
      throw new Error("The embedded public pair list is invalid");
    }
    seenPairs.add(pair.pair_id);
    for (let index = 0; index < pair.samples.length; index += 1) {
      const sample = pair.samples[index];
      const label = index === 0 ? "A" : "B";
      if (
        !sample ||
        sample.label !== label ||
        sample.sample_id !== `${pair.pair_id}-${label}` ||
        sample.filename !== `${sample.sample_id}.mp3` ||
        !/^sample-\d{2}-[AB]\.mp3$/u.test(sample.filename) ||
        seenFiles.has(sample.filename)
      ) {
        throw new Error("The embedded public sample list is invalid");
      }
      seenFiles.add(sample.filename);
      filenames.push(sample.filename);
    }
  }
  return filenames.sort();
}

async function assertRegularFile(filePath, label) {
  const fileStat = await fsp.lstat(filePath);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular file`);
  }
  return fileStat;
}

async function inspectListenerRoot(rootInput) {
  const root = path.resolve(rootInput);
  const rootStat = await fsp.lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("--root must be a real directory, not a symbolic link");
  }
  const canonicalRoot = await fsp.realpath(root);
  if (canonicalRoot !== root) {
    throw new Error("--root must use its canonical path");
  }
  const rootEntries = await fsp.readdir(root, {
    withFileTypes: true,
  });
  if (
    rootEntries.map((entry) => entry.name).sort().join("\0") !==
    ROOT_FILES.join("\0")
  ) {
    throw new Error(
      "Listener directory must contain exactly index.html, LISTENER-INSTRUCTIONS.txt, and audio/",
    );
  }
  for (const entry of rootEntries) {
    if (entry.isSymbolicLink()) {
      throw new Error("Listener directory may not contain symbolic links");
    }
    if (entry.name === "audio" && !entry.isDirectory()) {
      throw new Error("audio must be a directory");
    }
    if (entry.name !== "audio" && !entry.isFile()) {
      throw new Error(`${entry.name} must be a regular file`);
    }
  }
  const indexPath = path.join(root, "index.html");
  const instructionsPath = path.join(
    root,
    "LISTENER-INSTRUCTIONS.txt",
  );
  await assertRegularFile(indexPath, "index.html");
  await assertRegularFile(
    instructionsPath,
    "LISTENER-INSTRUCTIONS.txt",
  );
  const html = await fsp.readFile(indexPath, "utf8");
  const filenames = parseStudyDefinition(html);
  const audioDirectory = path.join(root, "audio");
  const audioStat = await fsp.lstat(audioDirectory);
  if (!audioStat.isDirectory() || audioStat.isSymbolicLink()) {
    throw new Error("audio must be a real directory");
  }
  const audioEntries = await fsp.readdir(audioDirectory, {
    withFileTypes: true,
  });
  if (
    audioEntries.map((entry) => entry.name).sort().join("\0") !==
    filenames.join("\0")
  ) {
    throw new Error(
      "The audio directory does not match the embedded file allowlist",
    );
  }
  for (const entry of audioEntries) {
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error("The audio directory may contain only regular files");
    }
    await assertRegularFile(
      path.join(audioDirectory, entry.name),
      entry.name,
    );
  }
  const allowedPaths = new Set([
    "/index.html",
    "/LISTENER-INSTRUCTIONS.txt",
    ...filenames.map((filename) => `/audio/${filename}`),
  ]);
  return { root, allowedPaths };
}

async function readTlsFile(filePath, label) {
  const resolved = path.resolve(filePath);
  await assertRegularFile(resolved, label);
  return fsp.readFile(resolved);
}

function authorized(header, username, password) {
  if (typeof header !== "string" || !header.startsWith("Basic ")) {
    return false;
  }
  let decoded;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  const suppliedUsername = decoded.slice(0, separator);
  const suppliedPassword = decoded.slice(separator + 1);
  const supplied = createHash("sha256")
    .update(`${suppliedUsername}\0${suppliedPassword}`, "utf8")
    .digest();
  const expected = createHash("sha256")
    .update(`${username}\0${password}`, "utf8")
    .digest();
  return timingSafeEqual(supplied, expected);
}

function parseRange(rangeHeader, size) {
  if (rangeHeader === undefined) return undefined;
  if (
    typeof rangeHeader !== "string" ||
    !/^bytes=(?:\d+-\d*|-\d+)$/u.test(rangeHeader)
  ) {
    return null;
  }
  const expression = rangeHeader.slice("bytes=".length);
  const [startText, endText] = expression.split("-");
  let start;
  let end;
  if (!startText) {
    const suffixLength = Number(endText);
    if (
      !Number.isSafeInteger(suffixLength) ||
      suffixLength <= 0
    ) {
      return null;
    }
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(startText);
    end = endText ? Number(endText) : size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= size ||
      end < start
    ) {
      return null;
    }
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

function securityHeaders(contentType) {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Content-Security-Policy":
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src 'self' blob:; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Content-Type": contentType,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function sendText(response, status, text, extraHeaders = {}) {
  const body = Buffer.from(text, "utf8");
  response.writeHead(status, {
    ...securityHeaders("text/plain; charset=utf-8"),
    "Content-Length": body.length,
    ...extraHeaders,
  });
  response.end(body);
}

function createRequestHandler({ root, allowedPaths, username, password }) {
  return async (request, response) => {
    try {
      if (!authorized(request.headers.authorization, username, password)) {
        sendText(response, 401, "Authentication required.\n", {
          "WWW-Authenticate":
            'Basic realm="Blind audio study", charset="UTF-8"',
        });
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        sendText(response, 405, "Method not allowed.\n", {
          Allow: "GET, HEAD",
        });
        return;
      }
      const relativePath = safeRequestPath(
        request.url,
        allowedPaths,
      );
      if (!relativePath) {
        sendText(response, 404, "Not found.\n");
        return;
      }
      const absolutePath = path.join(root, relativePath);
      const fileStat = await assertRegularFile(
        absolutePath,
        "Requested item",
      );
      const isAudio = relativePath.startsWith("audio/");
      const contentType = isAudio
        ? "audio/mpeg"
        : CONTENT_TYPES[relativePath];
      const range = isAudio
        ? parseRange(request.headers.range, fileStat.size)
        : undefined;
      if (range === null) {
        sendText(response, 416, "Range not satisfiable.\n", {
          "Content-Range": `bytes */${fileStat.size}`,
        });
        return;
      }
      const status = range ? 206 : 200;
      const start = range ? range.start : 0;
      const end = range ? range.end : fileStat.size - 1;
      response.writeHead(status, {
        ...securityHeaders(contentType),
        "Accept-Ranges": isAudio ? "bytes" : "none",
        "Content-Length": Math.max(0, end - start + 1),
        ...(range
          ? {
              "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
            }
          : {}),
      });
      if (request.method === "HEAD" || fileStat.size === 0) {
        response.end();
        return;
      }
      const stream = fs.createReadStream(absolutePath, { start, end });
      stream.on("error", () => {
        if (!response.headersSent) {
          sendText(response, 500, "Unable to read file.\n");
        } else {
          response.destroy();
        }
      });
      stream.pipe(response);
    } catch {
      if (!response.headersSent) {
        sendText(response, 500, "Request failed.\n");
      } else {
        response.destroy();
      }
    }
  };
}

function runSelfTest() {
  const assert = require("node:assert/strict");
  assert.equal(isLoopbackHost("127.0.0.1"), true);
  assert.equal(isLoopbackHost("::1"), true);
  assert.equal(isLoopbackHost("0.0.0.0"), false);
  assert.throws(() =>
    validateExposurePolicy({
      host: "0.0.0.0",
      allowNetworkExposure: false,
      tlsCert: "",
      tlsKey: "",
    }),
  );
  validateExposurePolicy({
    host: "0.0.0.0",
    allowNetworkExposure: true,
    tlsCert: "/certificate",
    tlsKey: "/key",
  });
  const allowed = new Set(["/index.html", "/audio/sample-01-A.mp3"]);
  assert.equal(safeRequestPath("/", allowed), "index.html");
  assert.equal(
    safeRequestPath("/audio/sample-01-A.mp3", allowed),
    "audio/sample-01-A.mp3",
  );
  assert.equal(safeRequestPath("/audio/../index.html", allowed), undefined);
  assert.equal(
    safeRequestPath("/audio/%2e%2e/index.html", allowed),
    undefined,
  );
  assert.equal(safeRequestPath("/index.html?x=1", allowed), undefined);
  assert.deepEqual(parseRange("bytes=10-19", 100), {
    start: 10,
    end: 19,
  });
  assert.deepEqual(parseRange("bytes=-10", 100), {
    start: 90,
    end: 99,
  });
  assert.equal(parseRange("bytes=100-101", 100), null);
  const token = Buffer.from("listener:abcdefghijklmnopqrst").toString(
    "base64",
  );
  assert.equal(
    authorized(
      `Basic ${token}`,
      "listener",
      "abcdefghijklmnopqrst",
    ),
    true,
  );
  assert.equal(
    authorized(
      `Basic ${token}`,
      "listener",
      "different-secret-value",
    ),
    false,
  );
  process.stdout.write("Listening server self-test passed.\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (options.selfTest) {
    runSelfTest();
    return;
  }
  validateExposurePolicy(options);
  const inspected = await inspectListenerRoot(options.root);
  const requestHandler = createRequestHandler({
    ...inspected,
    username: options.username,
    password: options.password,
  });
  let server;
  let scheme;
  if (options.tlsCert && options.tlsKey) {
    const [cert, key] = await Promise.all([
      readTlsFile(options.tlsCert, "TLS certificate"),
      readTlsFile(options.tlsKey, "TLS private key"),
    ]);
    server = https.createServer({ cert, key }, requestHandler);
    scheme = "https";
  } else {
    server = http.createServer(requestHandler);
    scheme = "http";
  }
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, resolve);
  });
  process.stdout.write(
    [
      `Listening page: ${scheme}://${options.host}:${options.port}/`,
      `Username: ${options.username}`,
      options.generatedPassword
        ? `Temporary password (shown once): ${options.password}`
        : "Password: read from PHASE2B_LISTENER_PASSWORD",
      "Press Ctrl+C to stop the temporary server.",
      "",
    ].join("\n"),
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `Listening server failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  authorized,
  createRequestHandler,
  inspectListenerRoot,
  isLoopbackHost,
  parseRange,
  parseStudyDefinition,
  safeRequestPath,
  validateExposurePolicy,
};
