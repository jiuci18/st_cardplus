import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bytesToBase64,
  base64ToBytes,
  bytesToBlob,
  utf8ByteLength,
  formatBytes,
} from "../../src/utils/binary.ts";

test("byte formatting preserves units and invalid-size handling", () => {
  assert.equal(formatBytes(0), "0 Bytes");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1536, 1), "1.5 KB");
  assert.equal(formatBytes(Number.NaN), "未知");
  assert.equal(formatBytes(-1), "未知");
});

test("base64 round trips empty, all byte values, subarrays and large inputs", () => {
  const all = Uint8Array.from({ length: 256 }, (_, i) => i);
  for (const bytes of [
    new Uint8Array(),
    all,
    all.subarray(17, 94),
    new Uint8Array(100_001).fill(237),
  ]) {
    const encoded = bytesToBase64(bytes);
    assert.equal(encoded, Buffer.from(bytes).toString("base64"));
    assert.deepEqual(base64ToBytes(encoded), bytes);
  }
});

test("base64 fallback works without native typed-array APIs", () => {
  const encode = Object.getOwnPropertyDescriptor(
    Uint8Array.prototype,
    "toBase64",
  );
  const decode = Object.getOwnPropertyDescriptor(Uint8Array, "fromBase64");
  try {
    Object.defineProperty(Uint8Array.prototype, "toBase64", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(Uint8Array, "fromBase64", {
      value: undefined,
      configurable: true,
    });
    const bytes = Uint8Array.from({ length: 100_001 }, (_, i) => i % 256);
    assert.equal(bytesToBase64(bytes), Buffer.from(bytes).toString("base64"));
    assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes);
    assert.deepEqual(base64ToBytes(""), new Uint8Array());
    assert.throws(() => base64ToBytes("!"));
  } finally {
    if (encode) Object.defineProperty(Uint8Array.prototype, "toBase64", encode);
    else Reflect.deleteProperty(Uint8Array.prototype, "toBase64");
    if (decode) Object.defineProperty(Uint8Array, "fromBase64", decode);
    else Reflect.deleteProperty(Uint8Array, "fromBase64");
  }
});

test("base64 decoding matches atob for whitespace, omitted padding and invalid input", () => {
  for (const value of ["", "Zg", "Zg==", " Z m 8=\n", "////", "Zh=="]) {
    assert.deepEqual(
      base64ToBytes(value),
      Uint8Array.from(atob(value), (c) => c.charCodeAt(0)),
    );
  }
  for (const value of ["a", "====", "a===", "Zg=!", "中文"]) {
    assert.throws(() => base64ToBytes(value));
  }
});

test("Blob uses only the view range and snapshots the input", async () => {
  const bytes = new Uint8Array([99, 1, 2, 3, 99]);
  const blob = bytesToBlob(bytes.subarray(1, 4), "application/octet-stream");
  bytes.fill(0);
  assert.equal(blob.type, "application/octet-stream");
  assert.deepEqual(
    new Uint8Array(await blob.arrayBuffer()),
    new Uint8Array([1, 2, 3]),
  );
  const shared = new Uint8Array(new SharedArrayBuffer(5));
  shared.set([99, 4, 5, 6, 99]);
  assert.deepEqual(
    new Uint8Array(await bytesToBlob(shared.subarray(1, 4), "").arrayBuffer()),
    new Uint8Array([4, 5, 6]),
  );
});

test("bounded UTF-8 counting matches TextEncoder across chunk and surrogate boundaries", () => {
  const encoder = new TextEncoder();
  const samples = [
    "",
    "ASCII",
    "中文",
    "😀",
    "\ud800",
    "\udc00",
    "\ud800x",
    "a".repeat(16_383) + "😀中文",
    "汉😀x".repeat(100_000),
  ];
  // Cover all UTF-16 code units, including isolated surrogate code units.
  for (let start = 0; start < 65536; start += 256) {
    samples.push(
      String.fromCharCode(...Array.from({ length: 256 }, (_, i) => start + i)),
    );
  }
  for (const text of samples)
    assert.equal(utf8ByteLength(text), encoder.encode(text).length);
});
