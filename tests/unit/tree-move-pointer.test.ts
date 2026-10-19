import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { useTreeMove } from '../../src/composables/tree/useTreeMove.ts';

function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const nodes = ['a', 'b', 'target'].map(id => ({ data: { id } }));
  const calls: string[] = [];
  const checkbox = { closest: () => checkbox, setPointerCapture() {} };
  const row = {
    dataset: { treeKey: 'target' },
    closest: (selector: string) => selector === '[data-tree-key]' ? row : null,
    getBoundingClientRect: () => ({ top: 100, height: 40 }),
    setPointerCapture() {},
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { elementFromPoint: () => row } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  });
  const movement = useTreeMove({
    nodes: () => nodes, key: node => node.data.id, ancestors: () => [], visible: () => true,
    canDrag: () => true, canDrop: (_source, _target, type) => type !== 'inner',
    root: () => ({ contains: () => true }) as any,
    commit: source => { calls.push(source.data.id); return true; },
  });
  t.after(movement.cancel);
  const event = (pointerType = 'mouse', x = 10, y = 10, handle = false) => ({
    pointerType, pointerId: 1, button: 0, clientX: x, clientY: y,
    target: handle ? checkbox : row, currentTarget: row,
    preventDefault() {}, stopPropagation() {},
  }) as unknown as PointerEvent;
  return { movement, nodes, calls, event };
}

test('mouse and long-press touch release through exactly the same batch queue', async t => {
  for (const input of ['mouse', 'touch']) {
    await t.test(input, async t => {
      const { movement, nodes, calls, event } = setup(t);
      movement.select(nodes[0]);
      movement.select(nodes[1], { ctrlKey: true });
      movement.pointerDown(nodes[0], event(input, 10, 10, input === 'touch'));
      if (input === 'touch') {
        t.mock.timers.tick(349);
        assert.equal(movement.dragging.value, false);
        t.mock.timers.tick(1);
      }
      movement.pointerMove(event(input, 10, 105));
      assert.equal(movement.dragging.value, true);
      assert.deepEqual(calls, [], 'pointer movement only previews');
      assert.deepEqual(movement.dropHint.value, { key: 'target', type: 'before' });
      await movement.pointerUp(event(input, 10, 105));
      assert.deepEqual(calls, ['a', 'b']);
      assert.equal(movement.dragging.value, false);
      movement.selectionClick(nodes[0], event(input) as unknown as MouseEvent);
      assert.deepEqual(movement.selectedKeys.value, ['a', 'b'], 'release click must not collapse selection');
    });
  }
});

test('short checkbox tap toggles selection without moving anything', async t => {
  const { movement, nodes, calls, event } = setup(t);
  movement.pointerDown(nodes[0], event('touch', 10, 10, true));
  t.mock.timers.tick(100);
  await movement.pointerUp(event('touch'));
  movement.selectionClick(nodes[0], event('touch', 10, 10, true) as unknown as MouseEvent);
  assert.deepEqual(movement.selectedKeys.value, ['a']);
  t.mock.timers.tick(500);
  assert.deepEqual(calls, []);
  assert.equal(movement.dragging.value, false);
});

test('normal touch scrolling and cancelled holds cannot commit a move', async t => {
  const { movement, nodes, calls, event } = setup(t);
  movement.pointerDown(nodes[0], event('touch'));
  t.mock.timers.tick(500);
  assert.equal(movement.dragging.value, false, 'normal row touch remains a scrolling gesture');
  movement.pointerDown(nodes[0], event('touch', 10, 10, true));
  movement.pointerMove(event('touch', 10, 30));
  t.mock.timers.tick(500);
  await movement.pointerUp(event('touch', 10, 105));
  assert.deepEqual(calls, []);
  movement.pointerDown(nodes[0], event('touch', 10, 10, true));
  t.mock.timers.tick(350);
  movement.pointerMove(event('touch', 10, 105));
  movement.cancel();
  await movement.pointerUp(event('touch', 10, 105));
  assert.deepEqual(calls, []);
  assert.equal(movement.dropHint.value, undefined);
});
