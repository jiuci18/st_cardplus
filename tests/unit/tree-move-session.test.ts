import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTreeMoveHandlers, type TreeMoveType } from '../../src/utils/treeMove.ts';
import { useTreeMove } from '../../src/composables/tree/useTreeMove.ts';

function setup(innerPosition: 'start' | 'end' = 'start') {
  let keys = ['a', 'b', 'c', 'd', 'e'];
  const nodes = keys.map(id => ({ data: { id } }));
  const writes: string[][] = [];
  const handlers = createTreeMoveHandlers({
    locate: node => ({ key: node.data.id, bucket: { id: 'root', keys, context: null } }),
    container: () => ({ id: 'root', keys, context: null }),
    canDrag: () => true,
    canDrop: () => true,
    innerPosition,
    commit: move => { keys = move.targetKeys; writes.push([...keys]); return true; },
  });
  const movement = useTreeMove({
    nodes: () => nodes, key: node => node.data.id, ancestors: () => [], visible: () => true,
    canDrag: handlers.allowDrag,
    canDrop: handlers.allowDrop,
    commit: handlers.handleNodeDrop, innerPosition: () => innerPosition,
  });
  return { movement, nodes, writes, keys: () => keys };
}

for (const [type, position, expected] of [
  ['before', 'start', ['b', 'a', 'c', 'd', 'e']],
  ['after', 'start', ['b', 'd', 'a', 'c', 'e']],
  ['inner', 'start', ['a', 'c', 'b', 'd', 'e']],
  ['inner', 'end', ['b', 'd', 'e', 'a', 'c']],
] as const) {
  test(`collected selection inserts sequentially in tree order: ${type}/${position}`, async () => {
    const { movement, nodes, writes, keys } = setup(position);
    movement.select(nodes[2], { ctrlKey: true });
    movement.select(nodes[0], { ctrlKey: true });
    assert.equal(movement.startDrag(nodes[0]), true);
    assert.deepEqual(writes, [], 'collecting and hovering never persist');
    assert.equal(movement.canDrop(nodes[0], nodes[3], type), true);
    assert.deepEqual(writes, []);
    assert.equal(await movement.drop(nodes[0], nodes[3], type), true);
    assert.deepEqual(keys(), expected);
    assert.ok(writes.length > 0);
  });
}

test('already-positioned members do not abort the batch', async () => {
  const { movement, nodes, keys } = setup();
  movement.select(nodes[0]);
  movement.select(nodes[2], { ctrlKey: true });
  movement.startDrag(nodes[0]);
  assert.equal(await movement.drop(nodes[0], nodes[1], 'before'), true);
  assert.deepEqual(keys(), ['a', 'c', 'b', 'd', 'e']);
});

test('selection toggles, supports visible ranges, prunes deletion and resets on unselected drag', () => {
  const { movement, nodes } = setup();
  movement.select(nodes[0]);
  movement.select(nodes[2], { shiftKey: true });
  assert.deepEqual(movement.selectedKeys.value, ['a', 'b', 'c']);
  movement.select(nodes[1], { metaKey: true });
  assert.deepEqual(movement.selectedKeys.value, ['a', 'c']);
  movement.prune(new Set(['c', 'd']));
  assert.deepEqual(movement.selectedKeys.value, ['c']);
  movement.startDrag(nodes[3]);
  assert.deepEqual(movement.selectedKeys.value, ['d']);
  movement.cancel();
  movement.select(nodes[0]);
  assert.deepEqual(movement.selectedKeys.value, ['a']);
});

test('cancel and menu movement do not carry the collected multi-selection', async () => {
  const { movement, nodes, writes, keys } = setup();
  movement.select(nodes[0]);
  movement.select(nodes[2], { ctrlKey: true });
  movement.startDrag(nodes[0]);
  movement.cancel();
  assert.deepEqual(writes, []);
  assert.equal(await movement.move(nodes[0], nodes[3], 'after'), true);
  assert.deepEqual(keys(), ['b', 'c', 'd', 'a', 'e']);
});

test('waits for each save, locks the collected set, and rejects concurrent drops', async () => {
  const nodes = ['a', 'b', 'target'].map(id => ({ data: { id } }));
  const calls: string[] = [];
  let release!: () => void;
  const movement = useTreeMove({
    nodes: () => nodes, key: node => node.data.id, ancestors: () => [], visible: () => true,
    canDrag: () => true, canDrop: () => true,
    commit: async source => {
      calls.push(source.data.id);
      if (calls.length === 1) await new Promise<void>(resolve => { release = resolve; });
      return true;
    },
  });
  movement.select(nodes[0]);
  movement.select(nodes[1], { ctrlKey: true });
  movement.startDrag(nodes[0]);
  assert.equal(movement.dragging.value, true);
  assert.equal(movement.startDrag(nodes[2]), false, 'an active collection cannot be replaced');
  movement.select(nodes[2]);
  const pending = movement.drop(nodes[0], nodes[2], 'before');
  assert.deepEqual(calls, ['a']);
  assert.equal(movement.dragging.value, false, 'release consumes the collection');
  assert.equal(movement.busy.value, true);
  assert.equal(await movement.drop(nodes[0], nodes[2], 'before'), false);
  release();
  assert.equal(await pending, true);
  assert.deepEqual(calls, ['a', 'b']);
  assert.equal(movement.busy.value, false);
});

test('parent/child selection moves the subtree once and blocks cycles for every selected node', async () => {
  const nodes = ['p', 'child', 'other', 'target'].map(id => ({ data: { id } }));
  const calls: string[] = [];
  const movement = useTreeMove({
    nodes: () => nodes, key: node => node.data.id,
    ancestors: key => key === 'child' ? ['p'] : [], visible: () => true,
    canDrag: () => true, canDrop: () => true,
    commit: source => { calls.push(source.data.id); return true; },
  });
  for (const node of nodes.slice(0, 3)) movement.select(node, { ctrlKey: true });
  movement.startDrag(nodes[2]);
  assert.equal(movement.canDrop(nodes[2], nodes[1], 'inner'), false);
  assert.equal(movement.canDrop(nodes[2], nodes[0], 'before'), false);
  assert.equal(await movement.drop(nodes[2], nodes[3], 'before'), true);
  assert.deepEqual(calls, ['p', 'other']);
});

for (const failure of ['reject', 'throw', 'invalid'] as const) {
  test(`${failure} stops the queue and always releases the busy state`, async () => {
    const nodes = ['a', 'b', 'target'].map(id => ({ data: { id } }));
    let calls = 0;
    let settled = false;
    const movement = useTreeMove({
      nodes: () => nodes, key: node => node.data.id, ancestors: () => [], visible: () => true,
      canDrag: () => true, canDrop: source => failure !== 'invalid' || source.data.id !== 'b',
      commit: () => { calls++; if (failure === 'throw') throw new Error('save failed'); return false; },
      settled: () => { settled = true; },
    });
    movement.select(nodes[0]);
    movement.select(nodes[1], { ctrlKey: true });
    movement.startDrag(nodes[0]);
    const pending = movement.drop(nodes[0], nodes[2], 'before');
    if (failure === 'throw') await assert.rejects(pending, /save failed/);
    else assert.equal(await pending, false);
    assert.equal(calls, failure === 'invalid' ? 0 : 1);
    assert.equal(settled, true);
    assert.equal(movement.busy.value, false);
  });
}

test('refresh failure releases the lock after committing without retaining the drag state', async () => {
  const nodes = ['a', 'target'].map(id => ({ data: { id } }));
  let movement!: ReturnType<typeof useTreeMove>;
  movement = useTreeMove({
    nodes: () => nodes, key: node => node.data.id, ancestors: () => [], visible: () => true,
    canDrag: () => true, canDrop: () => true, commit: () => true,
    settled: () => {
      assert.equal(movement.busy.value, true);
      assert.equal(movement.dragging.value, false);
      throw new Error('refresh failed');
    },
  });
  movement.startDrag(nodes[0]);
  await assert.rejects(movement.drop(nodes[0], nodes[1], 'before'), /refresh failed/);
  assert.equal(movement.busy.value, false);
  movement.select(nodes[1]);
  assert.deepEqual(movement.selectedKeys.value, ['target']);
});

test('drop position resolution handles adjacent selections without native single-node restrictions', () => {
  const { movement, nodes } = setup();
  movement.select(nodes[0]);
  movement.select(nodes[2], { ctrlKey: true });
  movement.startDrag(nodes[0]);
  for (const [ratio, type] of [[0.1, 'before'], [0.5, 'inner'], [0.9, 'after']] as [number, TreeMoveType][]) {
    assert.equal(movement.dropTypeAt(nodes[0], nodes[1], ratio), type);
  }
  assert.equal(movement.dropTypeAt(nodes[0], nodes[2], 0.5), undefined);
});
