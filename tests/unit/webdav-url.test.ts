import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWebDAVResourceUrl } from "../../src/utils/cloud/webdavUrl.ts";

test("joins_resource_path", () => {
  const result = buildWebDAVResourceUrl(
    "https://dav.example/backups",
    "card.json",
  );

  assert.equal(result, "https://dav.example/backups/card.json");
});

test("adds_cache_nonce_to_reads", () => {
  const result = buildWebDAVResourceUrl(
    "https://dav.example/backups",
    "card.json",
    42,
  );

  assert.equal(
    result,
    "https://dav.example/backups/card.json?_st_cardplus_cache=42",
  );
});

test("preserves_resource_query", () => {
  const result = buildWebDAVResourceUrl(
    "https://dav.example/backups",
    "card.json?download=1",
    42,
  );

  assert.equal(
    result,
    "https://dav.example/backups/card.json?download=1&_st_cardplus_cache=42",
  );
});
