import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectScope, nextTick, ref } from 'vue';
import { useSidebarTree } from '../../src/components/ui/layout/common/useSidebarTree.ts';

type Data = { id: string; children?: Data[] };
const tick = async () => { await nextTick(); await nextTick(); await nextTick(); };

function setup(t: { after: (fn: () => void) => void }, drop?: (source: any, target: any, type: any) => boolean | Promise<boolean>) {
  const source = ref<Data[]>([{ id: 'a', children: [{ id: 'a1' }] }, { id: 'b', children: [{ id: 'b1' }] }]);
  const defaults = ref<string[]>(['a']);
  const current = ref<string>();
  const filter = ref('');
  const nodes = new Map<string, any>();
  let selected: string | undefined;
  const scope = effectScope();
  t.after(() => scope.stop());
  const controller = scope.run(() => useSidebarTree({
    data: () => source.value,
    key: () => 'id', children: () => 'children', defaults: () => defaults.value,
    current: () => current.value, filter: () => filter.value, autoExpandFirst: () => true,
    tree: () => ({
      getNode: (key: string) => {
        if (!nodes.has(key)) nodes.set(key, {
          expanded: false, data: { id: key },
          expand() { this.expanded = true; }, collapse() { this.expanded = false; },
        });
        return nodes.get(key);
      },
      setCurrentKey: (key: string | undefined) => { selected = key; },
      filter: (value: string) => { if (value) for (const node of nodes.values()) node.expanded = true; },
    }),
    drop: drop ?? (() => true),
  }))!;
  return { controller, source, defaults, current, filter, nodes, selected: () => selected };
}

test('open/close/toggle use one state and refresh preserves explicit collapses', async t => {
  const { controller, source, defaults, nodes } = setup(t);
  await tick();
  await controller.close('a');
  source.value = [...source.value];
  defaults.value = ['a'];
  await tick();
  assert.deepEqual(controller.expandedKeys.value, []);
  assert.equal(nodes.get('a').expanded, false);
  await controller.open('b1');
  assert.deepEqual(controller.expandedKeys.value, ['b', 'b1']);
  await controller.toggle('b');
  assert.equal(nodes.get('b').expanded, false);
  await controller.refresh();
  assert.equal(nodes.get('b').expanded, false);
});

test('creating and selecting a node preserves existing expansion and reveals its path', async t => {
  const { controller, source, current, selected } = setup(t);
  await tick();
  source.value = [...source.value, { id: 'c', children: [{ id: 'c1' }] }];
  current.value = 'c1';
  await tick();
  assert.deepEqual(controller.expandedKeys.value, ['a', 'c', 'c1']);
  assert.equal(selected(), 'c1');
});

test('selection arriving before data is revealed once data arrives', async t => {
  const { controller, source, current } = setup(t);
  current.value = 'c1';
  await tick();
  source.value = [...source.value, { id: 'c', children: [{ id: 'c1' }] }];
  await tick();
  assert.ok(controller.expandedKeys.value.includes('c'));
});

test('clicking to collapse a parent is not undone by selecting a synthetic child', async t => {
  const { controller, current, nodes } = setup(t);
  await tick();
  controller.onCollapse({ id: 'a' });
  controller.onClick({ id: 'a' });
  current.value = 'a1';
  await tick();
  await controller.refresh();
  assert.equal(nodes.get('a').expanded, false);
});

test('ElTree structural mutations do not mutate business tree arrays', async t => {
  const { controller, source } = setup(t);
  const moved = controller.data.value[0].children.pop();
  controller.data.value[1].children.push(moved);
  assert.equal(source.value[0].children?.length, 1);
  assert.equal(source.value[1].children?.length, 1);
  await controller.refresh();
  assert.equal(controller.data.value[0].children.length, 1);
});

test('cross-parent drop waits for async data, keeps source open and opens destination', async t => {
  let release!: () => void;
  let received: any;
  const { controller, source, nodes } = setup(t, async original => {
    received = original;
    await new Promise<void>(resolve => { release = resolve; });
    source.value = [{ id: 'a', children: [] }, { id: 'b', children: [{ id: 'b1' }, { id: 'a1' }] }];
    return true;
  });
  await tick();
  const original = { data: { id: 'a1' }, parent: { data: { id: 'a' } } };
  controller.startDrag(original);
  original.parent = { data: { id: 'b' } };
  controller.endDrag();
  const pending = controller.drop(original, { data: { id: 'b' } }, 'inner');
  assert.equal(controller.busy.value, true);
  assert.equal(received.parent.data.id, 'a');
  release();
  assert.equal(await pending, true);
  assert.equal(controller.busy.value, false);
  assert.equal(nodes.get('a').expanded, true);
  assert.equal(nodes.get('b').expanded, true);
});

for (const failure of ['reject', 'throw'] as const) {
  test(`failed drop (${failure}) restores structure and expansion`, async t => {
    const { controller } = setup(t, () => {
      if (failure === 'throw') throw new Error('save failed');
      return false;
    });
    await tick();
    controller.startDrag({ data: { id: 'a1' }, parent: { data: { id: 'a' } } });
    controller.data.value[0].children.pop();
    controller.onExpand({ id: 'b' });
    const operation = controller.drop({ data: { id: 'a1' } }, { data: { id: 'b' } }, 'inner');
    if (failure === 'throw') await assert.rejects(operation, /save failed/);
    else assert.equal(await operation, false);
    assert.deepEqual(controller.expandedKeys.value, ['a']);
    assert.equal(controller.data.value[0].children.length, 1);
    assert.equal(controller.busy.value, false);
  });
}

test('cancelled drag restores snapshot without calling business handler', async t => {
  const { controller } = setup(t, () => { throw new Error('must not run'); });
  await tick();
  controller.startDrag({ data: { id: 'a' } });
  controller.onExpand({ id: 'b' });
  controller.endDrag();
  await tick();
  assert.deepEqual(controller.expandedKeys.value, ['a']);
});

test('clearing search restores normal expansion and refresh prunes deleted nodes', async t => {
  const { controller, source, filter, nodes } = setup(t);
  await tick();
  filter.value = 'b';
  await tick();
  assert.equal(nodes.get('b').expanded, true);
  filter.value = '';
  await tick();
  assert.equal(nodes.get('b').expanded, false);
  source.value = [{ id: 'b' }];
  await tick();
  assert.deepEqual(controller.expandedKeys.value, []);
});
