import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyKeyOrder,
  createTreeMoveHandlers,
  planTreeMove,
} from "../../src/utils/treeMove.ts";

const bucket = (id: string, keys: string[]) => ({ id, keys, context: id });
for (const [label, key, anchor, type, expected] of [
  ["up", "c", "b", "before", ["a", "c", "b", "d"]],
  ["down", "a", "b", "after", ["b", "a", "c", "d"]],
  ["top", "d", "a", "before", ["d", "a", "b", "c"]],
  ["bottom", "a", "d", "after", ["b", "c", "d", "a"]],
] as const) {
  test(`shared move planner: ${label}`, () => {
    const source = bucket("parent", ["a", "b", "c", "d"]);
    assert.deepEqual(
      planTreeMove(source, source, key, anchor, type)!.targetKeys,
      expected,
    );
    assert.deepEqual(source.keys, ["a", "b", "c", "d"]);
  });
}

test("cross-parent plan supplies both final arrays without mutating the source", () => {
  const source = bucket("source", ["a", "b", "c"]);
  const target = bucket("target", ["x", "y"]);
  const move = planTreeMove(source, target, "a", "y", "before")!;
  assert.deepEqual(move.sourceKeys, ["b", "c"]);
  assert.deepEqual(move.targetKeys, ["x", "a", "y"]);
  assert.deepEqual(source.keys, ["a", "b", "c"]);
  assert.deepEqual(target.keys, ["x", "y"]);
  assert.deepEqual(
    planTreeMove(source, target, "a", undefined, "inner")!.targetKeys,
    ["a", "x", "y"],
  );
  assert.deepEqual(
    planTreeMove(source, target, "a", undefined, "inner", "end")!.targetKeys,
    ["x", "y", "a"],
  );
});

test("invalid, self and stale drops are rejected", () => {
  const source = bucket("source", ["a", "b", "c"]);
  for (const [key, anchor] of [
    ["a", "a"],
    ["missing", "a"],
    ["a", "missing"],
  ]) {
    assert.equal(planTreeMove(source, source, key, anchor, "before"), null);
  }
  assert.equal(
    planTreeMove(source, bucket("target", ["a"]), "a", undefined, "inner"),
    null,
  );
});

test("handler validates permissions and accepts unchanged positions without persisting them", async () => {
  const source = bucket("parent", ["a", "b", "c"]);
  let calls = 0;
  const handlers = createTreeMoveHandlers({
    locate: (node) => ({ key: node.data.id, bucket: source }),
    canDrag: (node) => node.data.id !== "locked",
    canDrop: (_source, _target, type) => type !== "inner",
    commit: async (move) => {
      calls++;
      assert.deepEqual(move.targetKeys, ["b", "c", "a"]);
      return true;
    },
  });
  const node = (id: string) => ({ data: { id } });
  assert.equal(handlers.allowDrop(node("a"), node("c"), "after"), true);
  assert.equal(
    await handlers.handleNodeDrop(node("a"), node("c"), "after"),
    true,
  );
  assert.equal(
    await handlers.handleNodeDrop(node("locked"), node("c"), "after"),
    false,
  );
  assert.equal(
    await handlers.handleNodeDrop(node("a"), node("c"), "inner"),
    false,
  );
  assert.equal(
    await handlers.handleNodeDrop(node("a"), node("b"), "before"),
    true,
  );
  assert.equal(calls, 1);
});

test("flat storage applies sibling order without touching unrelated branches", () => {
  const items = ["a", "nested", "b", "unrelated", "c"].map((id) => ({ id }));
  assert.deepEqual(
    applyKeyOrder(items, ["c", "a", "b"], (item) => item.id).map(
      (item) => item.id,
    ),
    ["c", "nested", "a", "unrelated", "b"],
  );
});
