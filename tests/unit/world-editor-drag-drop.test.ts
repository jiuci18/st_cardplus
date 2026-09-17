import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { useDragAndDrop } = await import('../../src/composables/worldeditor/useDragAndDrop.ts');
hooks.deregister();

function setup(type: 'landmark' | 'force' | 'region') {
  const items = ['a', 'b', 'c', 'd'].map(id => ({
    id, projectId: 'project', parentLandmarkIds: [], childLandmarkIds: [],
    ...(type === 'landmark' ? { importance: 1 } : type === 'force' ? { power: 1 } : {}),
  }));
  const list = { value: items };
  const empty = () => ({ value: [] });
  const handlers = useDragAndDrop(
    (type === 'landmark' ? list : empty()) as any,
    (type === 'force' ? list : empty()) as any,
    (type === 'region' ? list : empty()) as any,
  );
  const parent = { data: { id: 'category', isEntry: false } };
  const nodes = items.map(raw => ({ data: { id: raw.id, type, isEntry: true, raw }, parent }));
  return { list, handlers, nodes };
}

for (const type of ['landmark', 'force', 'region'] as const) {
  for (const [label, source, target, drop, expected] of [
    ['up', 2, 1, 'before', ['a', 'c', 'b', 'd']],
    ['down', 0, 1, 'after', ['b', 'a', 'c', 'd']],
    ['top', 3, 0, 'before', ['d', 'a', 'b', 'c']],
    ['bottom', 0, 3, 'after', ['b', 'c', 'd', 'a']],
  ] as const) {
    test(`${type} ${label} preserves sibling order`, () => {
      const { list, handlers, nodes } = setup(type);
      assert.equal(handlers.handleNodeDrop(nodes[source], nodes[target], drop), true);
      assert.deepEqual(list.value.map(item => item.id), expected);
    });
  }
}

test('indent and outdent preserve descendants and update parent links', () => {
  const { list, handlers, nodes } = setup('landmark');
  const [a, b, c] = nodes;
  handlers.handleNodeDrop(c, b, 'inner');
  handlers.handleNodeDrop(b, a, 'inner');
  assert.deepEqual(b.data.raw.parentLandmarkIds, ['a']);
  assert.deepEqual(a.data.raw.childLandmarkIds, ['b']);
  assert.deepEqual(c.data.raw.parentLandmarkIds, ['b']);
  assert.equal(handlers.allowDrop(a, c, 'inner'), false);
  // Move B after its parent A, at A's level.
  assert.equal(handlers.handleNodeDrop(b, a, 'after'), true);
  assert.deepEqual(b.data.raw.parentLandmarkIds, []);
  assert.deepEqual(a.data.raw.childLandmarkIds, []);
  assert.deepEqual(c.data.raw.parentLandmarkIds, ['b']);
  assert.deepEqual(list.value.map(item => item.id), ['a', 'b', 'c', 'd']);
});
