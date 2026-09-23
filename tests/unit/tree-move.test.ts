import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyKeyOrder, createTreeMoveHandlers, planTreeMove } from '../../src/utils/treeMove.ts';

const bucket = (id: string, keys: string[]) => ({ id, keys, context: id });
for (const [label, moving, anchor, type, expected] of [
  ['up', ['c'], 'b', 'before', ['a', 'c', 'b', 'd']],
  ['down', ['a'], 'b', 'after', ['b', 'a', 'c', 'd']],
  ['top', ['d'], 'a', 'before', ['d', 'a', 'b', 'c']],
  ['bottom', ['a'], 'd', 'after', ['b', 'c', 'd', 'a']],
  ['multi in display order', ['c', 'a'], 'd', 'after', ['b', 'd', 'a', 'c']],
] as const) {
  test(`shared move planner: ${label}`, () => {
    const source = bucket('parent', ['a', 'b', 'c', 'd']);
    const result = planTreeMove(source, source, moving, anchor, type)!;
    assert.deepEqual(result.targetKeys, expected);
    assert.deepEqual(source.keys, ['a', 'b', 'c', 'd']);
  });
}

test('cross-parent plan supplies both final arrays and post-removal insertion index', () => {
  const source = bucket('source', ['a', 'b', 'c']);
  const target = bucket('target', ['x', 'y']);
  const move = planTreeMove(source, target, ['c', 'a'], 'y', 'before')!;
  assert.deepEqual(move.sourceKeys, ['b']);
  assert.deepEqual(move.targetKeys, ['x', 'a', 'c', 'y']);
  assert.equal(move.insertIndex, 1);
  assert.deepEqual(target.keys, ['x', 'y']);
  assert.deepEqual(planTreeMove(source, target, ['a'], undefined, 'inner')!.targetKeys, ['a', 'x', 'y']);
  assert.deepEqual(planTreeMove(source, target, ['a'], undefined, 'inner', 'end')!.targetKeys, ['x', 'y', 'a']);
});

test('invalid, self, stale and unchanged drops do not generate a mutation', () => {
  const source = bucket('source', ['a', 'b', 'c']);
  for (const [moving, anchor] of [
    [['a'], 'a'],
    [['a', 'b'], 'b'],
    [['missing'], 'a'],
    [['a'], 'missing'],
  ] as const) {
    assert.equal(planTreeMove(source, source, moving, anchor, 'before'), null);
  }
  assert.equal(planTreeMove(source, source, ['a'], 'b', 'before'), null);
  assert.equal(planTreeMove(source, bucket('target', ['a']), ['a'], undefined, 'inner'), null);
  assert.ok(planTreeMove(source, source, ['a'], 'b', 'before', 'start', true));
});

test('handler uses business buckets, not mutated Element Plus parents; validates before commit', async () => {
  const source = bucket('parent', ['a', 'b', 'c']);
  let calls = 0;
  const handlers = createTreeMoveHandlers({
    locate: (node) => ({ key: node.data.id, bucket: source }),
    canDrag: (node) => node.data.id !== 'locked',
    canDrop: (_source, _target, type) => type !== 'inner',
    commit: async (move) => {
      calls++;
      assert.deepEqual(move.targetKeys, ['b', 'c', 'a']);
      return true;
    },
  });
  const node = (id: string) => ({ data: { id }, parent: { data: { id: 'wrong-parent' } } });
  assert.equal(handlers.allowDrop(node('a'), node('c'), 'next'), true);
  assert.equal(await handlers.handleNodeDrop(node('a'), node('c'), 'after'), true);
  assert.equal(await handlers.handleNodeDrop(node('locked'), node('c'), 'after'), false);
  assert.equal(await handlers.handleNodeDrop(node('a'), node('c'), 'inner'), false);
  assert.equal(calls, 1);
});

test('flat storage applies sibling order without touching unrelated branches', () => {
  const items = ['a', 'nested', 'b', 'unrelated', 'c'].map((id) => ({ id }));
  assert.deepEqual(
    applyKeyOrder(items, ['c', 'a', 'b'], (item) => item.id).map((item) => item.id),
    ['c', 'nested', 'a', 'unrelated', 'b'],
  );
});
