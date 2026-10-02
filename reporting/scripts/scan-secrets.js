#!/usr/bin/env node
/**
 * Fails (exit 1) if any secret value from .env / the environment appears anywhere in the report output.
 * Run after a test run and before sharing or uploading any report -- CI runs it before every artifact upload.
 *
 * Secrets: every key in .env.example whose name matches SECRET_KEY_PATTERN, so a new key like API_TOKEN is
 * covered automatically. Looks inside zips, embedded base64 (Allure single-file, Playwright HTML report)
 * and compressed data (traces, Monocart). Prints only the key name and file, never the value.
 *
 * Usage: node reporting/scripts/scan-secrets.js [dir-or-file ...]   (defaults to every report folder)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rootDir = path.resolve(__dirname, '..', '..');
require('dotenv').config({ path: path.join(rootDir, '.env'), quiet: true });

const SECRET_KEY_PATTERN = /PASSWORD|SECRET|TOKEN|EMAIL|USER|KEY|WEBHOOK/i;
const DEFAULT_TARGETS = [
  'playwright-report',
  'monocart-report',
  'allure-results',
  'allure-report-single',
  'test-results',
  'release-summary',
  'reports-archive',
  'reporting/report-examples',
];
const MAX_DEPTH = 4;

const secretKeys = fs
  .readFileSync(path.join(rootDir, '.env.example'), 'utf8')
  .split(/\r?\n/)
  .map((line) => line.split('=')[0].trim())
  .filter((key) => key && !key.startsWith('#') && SECRET_KEY_PATTERN.test(key));

const missing = secretKeys.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`scan-secrets: no value for ${missing.join(', ')} -- can't verify reports are clean.`);
  process.exit(1);
}

// Each secret as it could appear: raw, URL/form-encoded (request bodies), JSON-escaped.
const needles = secretKeys.flatMap((key) => {
  const value = process.env[key];
  const forms = new Set([
    value,
    encodeURIComponent(value),
    encodeURIComponent(value).replace(/%20/g, '+'),
    JSON.stringify(value).slice(1, -1),
  ]);
  return [...forms].map((form) => ({ key, bytes: Buffer.from(form, 'utf8') }));
});

// Minimal central-directory zip reader (no dependency); malformed zips yield whatever was read before the error.
function unzipEntries(buf) {
  const entries = [];
  try {
    readZip(buf, entries);
  } catch {
    // truncated/corrupt zip
  }
  return entries;
}

function readZip(buf, entries) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd === -1 || eocd + 22 > buf.length) return;
  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count && buf.readUInt32LE(offset) === 0x02014b50; i++) {
    const method = buf.readUInt16LE(offset + 10);
    const size = buf.readUInt32LE(offset + 20);
    const nameLength = buf.readUInt16LE(offset + 28);
    const local = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLength);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    try {
      entries.push({ name, data: method === 8 ? zlib.inflateRawSync(raw) : raw });
    } catch {
      entries.push({ name, data: raw });
    }
    offset += 46 + nameLength + buf.readUInt16LE(offset + 30) + buf.readUInt16LE(offset + 32);
  }
}

function tryDecompress(buf) {
  for (const fn of [zlib.gunzipSync, zlib.inflateSync, zlib.inflateRawSync]) {
    try {
      return fn(buf);
    } catch {
      // not this format
    }
  }
  return null;
}

// Surrounding text with every secret form masked, so a leak can be traced to its source without re-exposing it.
// The slice is widened by the longest needle first, so no secret straddling the window edge survives unmasked.
const CONTEXT = 40;
const longestNeedle = Math.max(...needles.map((n) => n.bytes.length));
function maskedContext(buf, at, length) {
  let text = buf
    .subarray(Math.max(0, at - CONTEXT - longestNeedle), at + length + CONTEXT + longestNeedle)
    .toString('latin1');
  for (const n of [...needles].sort((a, b) => b.bytes.length - a.bytes.length)) {
    text = text.split(n.bytes.toString('latin1')).join('***');
  }
  const marker = text.indexOf('***');
  return text
    .slice(Math.max(0, marker - CONTEXT), marker + 3 + CONTEXT)
    .replace(/[^\x20-\x7e]/g, '.')
    .replace(/\s+/g, ' ');
}

// Returns { key, where, context } for each secret found in buf, looking through zips, base64 runs and
// compressed data. `where` is the path inside the file, e.g. "base64 > report.json".
function scan(buf, depth = 0, where = []) {
  const hits = needles
    .map((n) => ({ n, at: buf.indexOf(n.bytes) }))
    .filter(({ at }) => at !== -1)
    .map(({ n, at }) => ({ key: n.key, where: where.join(' > '), context: maskedContext(buf, at, n.bytes.length) }));
  if (depth >= MAX_DEPTH) return hits;
  const nested = [];

  if (buf.length >= 4 && buf.readUInt32LE(0) === 0x04034b50) {
    nested.push(...unzipEntries(buf).map((e) => ({ data: e.data, label: e.name })));
  }
  const decompressed = tryDecompress(buf);
  if (decompressed) nested.push({ data: decompressed, label: 'compressed' });

  const text = buf.toString('latin1');
  for (const match of text.matchAll(/[A-Za-z0-9+/]{200,}={0,2}/g)) {
    const decoded = Buffer.from(match[0], 'base64');
    nested.push({ data: decoded, label: 'base64' });
    const inner = tryDecompress(decoded);
    if (inner) nested.push({ data: inner, label: 'base64 > compressed' });
  }

  for (const child of nested) hits.push(...scan(child.data, depth + 1, [...where, child.label]));
  return hits;
}

const walk = (target) =>
  fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).flatMap((name) => walk(path.join(target, name)))
    : [target];

const targets = (process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_TARGETS)
  .map((t) => path.resolve(rootDir, t))
  .filter((t) => fs.existsSync(t));
const files = targets.flatMap(walk);

// Nothing scanned is not "clean" -- a wrong path or an empty run must not read as a pass.
if (!files.length) {
  console.error('scan-secrets: no report files found to scan.');
  process.exit(1);
}

let leaks = 0;
for (const file of files) {
  // One line per secret per file (its first location) -- enough to trace the source without flooding the log.
  const seen = new Set();
  for (const hit of scan(fs.readFileSync(file))) {
    if (seen.has(hit.key)) continue;
    seen.add(hit.key);
    const where = hit.where ? ` > ${hit.where}` : '';
    console.error(`LEAK: ${hit.key} found in ${path.relative(rootDir, file)}${where}`);
    console.error(`      context: ...${hit.context}...`);
    leaks++;
  }
}

if (leaks) {
  console.error(`scan-secrets: ${leaks} leak(s) -- do not share or upload these reports.`);
  process.exit(1);
}
console.log(`scan-secrets: clean -- ${files.length} files checked for ${secretKeys.join(', ')}.`);
