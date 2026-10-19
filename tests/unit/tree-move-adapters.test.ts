import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { ref } from 'vue';
import type { TreeMoveHandlers } from '../../src/utils/treeMove.ts';
import { useTreeMove } from '../../src/composables/tree/useTreeMove.ts';

const bookServiceStub =
  'data:text/javascript,' +
  encodeURIComponent(`
  const saved = new Map();
  export const worldBookService = {
    async replaceEntriesForBook(id, entries) { saved.set(id, JSON.parse(JSON.stringify(entries))); },
    async getEntriesForBook(id) { return saved.get(id); },
    async updateBook() {},
  };
`);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    // Test data movement without mounting Element Plus notifications.
    if (specifier === 'element-plus')
      return {
        url: 'data:text/javascript,export const ElMessage = { success() {}, error() {} }; export const ElMessageBox = {};',
        shortCircuit: true,
      };
    if (specifier.endsWith('/worldBookService')) return { url: bookServiceStub, shortCircuit: true };
    if (specifier.endsWith('/useWorldBookEntryData'))
      return { url: 'data:text/javascript,export const processImportedWorldBookData = () => {};', shortCircuit: true };
    return nextResolve(
      specifier.startsWith('@/') ? new URL(`../../src/${specifier.slice(2)}.ts`, import.meta.url).href : specifier,
      context,
    );
  },
});
const { useWorldBookDragDrop } = await import('../../src/composables/worldbook/useWorldBookDragDrop.ts');
const { useRegexDragDrop } = await import('../../src/composables/regex/useRegexDragDrop.ts');
const { useCharacterProjectTree } = await import('../../src/composables/characterInfo/useCharacterProjectTree.ts');
const { usePresetTreeMove } = await import('../../src/composables/preset/usePresetTreeMove.ts');
const { useDragAndDrop } = await import('../../src/composables/worldeditor/useDragAndDrop.ts');
const { useWorldBookCollection } = await import('../../src/composables/worldbook/useWorldBookCollection.ts');
hooks.deregister();

const node = (data: any) => ({ data });

test('books reorder down one slot and cross-book moves pass final arrays to persistence', async () => {
  const books: any = {
    a: { id: 'a', order: 0, entries: [{ uid: 0 }, { uid: 1 }] },
    b: { id: 'b', order: 1, entries: [{ uid: 0 }] },
    c: { id: 'c', order: 2, entries: [] },
  };
  let order: string[] = [];
  let saved: any[] = [];
  const handlers = useWorldBookDragDrop(
    { value: { books } } as any,
    async (...args) => {
      saved = args;
      return true;
    },
    () => {},
    (ids) => {
      order = ids;
    },
  );
  assert.equal(await handlers.handleNodeDrop(node({ id: 'a' }), node({ id: 'b' }), 'after'), true);
  assert.deepEqual(order, ['b', 'a', 'c']);
  const entry = node({ isEntry: true, bookId: 'a', raw: books.a.entries[0] });
  assert.equal(await handlers.handleNodeDrop(entry, node({ id: 'b' }), 'inner'), true);
  assert.equal(saved[0], 'a');
  assert.deepEqual(saved[1], [books.a.entries[1]]);
  assert.equal(saved[2], 'b');
  assert.equal(saved[3][0], books.a.entries[0]);
  assert.equal(saved[3][1], books.b.entries[0]);
  assert.equal(books.a.entries.length, 2, 'planning does not mutate data before persistence');
  assert.equal(handlers.allowDrop(entry, node({ id: 'b-batch', isUtility: true }), 'inner'), false);
});

test('cross-book save remaps colliding book-local UIDs without overwriting target entries', async (t) => {
  t.mock.method(console, 'warn', () => {}); // The collection's onMounted load is unused outside a component.
  const collection = useWorldBookCollection();
  collection.worldBookCollection.value.books = {
    a: {
      id: 'a',
      order: 0,
      entries: [
        { uid: 0, content: 'moved' },
        { uid: 1, content: 'kept' },
      ],
    },
    b: { id: 'b', order: 1, entries: [{ uid: 0, content: 'target' }] },
  } as any;
  const handlers = useWorldBookDragDrop(
    collection.worldBookCollection,
    collection.moveEntryBetweenBooks,
    collection.updateBookEntries,
    collection.updateBookOrder,
  );
  const entry = collection.worldBookCollection.value.books.a.entries[0];
  assert.equal(
    await handlers.handleNodeDrop(node({ isEntry: true, bookId: 'a', raw: entry }), node({ id: 'b' }), 'inner'),
    true,
  );
  const books = collection.worldBookCollection.value.books;
  assert.deepEqual(
    books.a.entries.map((entry) => entry.content),
    ['kept'],
  );
  assert.deepEqual(
    books.b.entries.map((entry) => entry.content),
    ['moved', 'target'],
  );
  assert.deepEqual(
    books.b.entries.map((entry) => entry.uid),
    [1, 0],
  );
  assert.equal(entry.uid, 0, 'save must not mutate the previous source object');
});

test('book persistence rejection propagates instead of reporting success', async () => {
  const books: any = { a: { id: 'a', order: 0, entries: [{ uid: 1 }] }, b: { id: 'b', order: 1, entries: [] } };
  const handlers = useWorldBookDragDrop(
    { value: { books } } as any,
    async () => false,
    () => {},
    () => {},
  );
  assert.equal(
    await handlers.handleNodeDrop(
      node({ isEntry: true, bookId: 'a', raw: books.a.entries[0] }),
      node({ id: 'b' }),
      'inner',
    ),
    false,
  );
});

test('regex shares container/entry planning and persists exactly the planned arrays', () => {
  const categories: any = {
    a: { id: 'a', order: 0, scripts: [{ id: 's1' }, { id: 's2' }] },
    b: { id: 'b', order: 1, scripts: [{ id: 's3' }] },
  };
  let saved: any[] = [];
  const handlers = useRegexDragDrop(
    { value: { categories } } as any,
    (...args) => {
      saved = args;
      return false;
    },
    (id, scripts) => {
      categories[id].scripts = scripts;
    },
  );
  const script = (categoryId: string, scriptId: string) => node({ isScript: true, categoryId, scriptId });
  assert.equal(handlers.handleNodeDrop(script('a', 's1'), script('a', 's2'), 'after'), true);
  assert.deepEqual(
    categories.a.scripts.map((s: any) => s.id),
    ['s2', 's1'],
  );
  assert.equal(handlers.handleNodeDrop(script('a', 's1'), script('b', 's3'), 'before'), false);
  assert.deepEqual(
    saved.map((value: any) => (Array.isArray(value) ? value.map((s: any) => s.id) : value)),
    ['a', ['s2'], 'b', ['s1', 's3']],
  );
});

test('character moves keep star buckets separate and emit only affected project patches', () => {
  const characters: any = ref([
    { meta: { id: 'a', projectId: 'p::one', starred: true, order: 0 }, data: {} },
    { meta: { id: 'b', projectId: 'p2', starred: true, order: 0 }, data: {} },
    { meta: { id: 'c', projectId: 'p2', starred: false, order: 0 }, data: {} },
  ]);
  let patches: any[] = [];
  const handlers = useCharacterProjectTree({
    characters,
    projects: ref([{ id: 'p::one' }, { id: 'p2' }]) as any,
    onReorderCharacters: (value) => {
      patches = value;
    },
    onReorderProjects: () => {},
    onSelectCharacter: () => {},
  });
  const character = (index: number) =>
    node({ nodeType: 'character', id: characters.value[index].meta.id, raw: characters.value[index] });
  assert.equal(handlers.allowDrop(character(0), character(2), 'before'), false);
  assert.equal(handlers.handleNodeDrop(character(0), node({ nodeType: 'project', projectId: 'p2' }), 'inner'), true);
  assert.deepEqual(patches, [
    { id: 'b', order: 0, projectId: 'p2' },
    { id: 'a', order: 1, projectId: 'p2' },
  ]);
  assert.equal(
    handlers.handleNodeDrop(character(1), node({ nodeType: 'project', projectId: 'p::one' }), 'inner'),
    true,
  );
  assert.deepEqual(patches, [
    { id: 'a', order: 0, projectId: 'p::one' },
    { id: 'b', order: 1, projectId: 'p::one' },
  ]);
});

function session(handlers: TreeMoveHandlers, nodes: any[]) {
  return useTreeMove({
    nodes: () => nodes, key: node => node.data.id, ancestors: () => [], visible: () => true,
    canDrag: handlers.allowDrag,
    canDrop: handlers.allowDrop,
    commit: handlers.handleNodeDrop, innerPosition: () => handlers.innerPosition,
  });
}

test('worldbook batch moves from multiple books with colliding local UIDs', async t => {
  t.mock.method(console, 'warn', () => {});
  const collection = useWorldBookCollection();
  collection.worldBookCollection.value.books = {
    a: { id: 'a', order: 0, entries: [{ uid: 0, content: 'a0' }] },
    b: { id: 'b', order: 1, entries: [{ uid: 0, content: 'b0' }] },
    c: { id: 'c', order: 2, entries: [{ uid: 0, content: 'c0' }] },
  } as any;
  const handlers = useWorldBookDragDrop(collection.worldBookCollection, collection.moveEntryBetweenBooks,
    collection.updateBookEntries, collection.updateBookOrder);
  const nodes = ['a', 'b'].map(bookId => node({ id: bookId + ':0', isEntry: true, bookId,
    raw: collection.worldBookCollection.value.books[bookId].entries[0] }));
  const drag = session(handlers, nodes);
  drag.select(nodes[1]);
  drag.select(nodes[0], { ctrlKey: true });
  drag.startDrag(nodes[0]);
  assert.equal(await drag.drop(nodes[0], node({ id: 'c' }), 'inner'), true);
  const books = collection.worldBookCollection.value.books;
  assert.deepEqual(books.a.entries, []);
  assert.deepEqual(books.b.entries, []);
  assert.deepEqual(books.c.entries.map(entry => entry.content), ['a0', 'b0', 'c0']);
  assert.equal(new Set(books.c.entries.map(entry => entry.uid)).size, 3);
});

test('regex batch persists each script move against the latest category contents', async () => {
  const categories: any = {
    a: { id: 'a', order: 0, scripts: [{ id: 's1' }, { id: 's2' }] },
    b: { id: 'b', order: 1, scripts: [{ id: 's3' }] },
  };
  const handlers = useRegexDragDrop({ value: { categories } } as any,
    (from, source, to, target) => { categories[from].scripts = source; categories[to].scripts = target; return true; },
    (id, scripts) => { categories[id].scripts = scripts; });
  const nodes = ['s1', 's2'].map(id => node({ id, isScript: true, scriptId: id, categoryId: 'a' }));
  const drag = session(handlers, nodes);
  nodes.forEach(item => drag.select(item, { ctrlKey: true }));
  drag.startDrag(nodes[0]);
  assert.equal(await drag.drop(nodes[0], node({ id: 'b' }), 'inner'), true);
  assert.deepEqual(categories.a.scripts, []);
  assert.deepEqual(categories.b.scripts.map((script: any) => script.id), ['s1', 's2', 's3']);
});

test('character batch appends in order and preserves star buckets', async () => {
  const characters: any = ref(['a', 'b', 'c'].map((id, order) => ({
    meta: { id, order, projectId: id === 'c' ? 'p2' : 'p1', starred: true }, data: {},
  })));
  const handlers = useCharacterProjectTree({
    characters, projects: ref([{ id: 'p1' }, { id: 'p2' }]) as any,
    onReorderCharacters: patches => patches.forEach(patch => Object.assign(
      characters.value.find((item: any) => item.meta.id === patch.id).meta, patch)),
    onReorderProjects: () => {}, onSelectCharacter: () => {},
  });
  const nodes = characters.value.slice(0, 2).map((raw: any) => node({ id: raw.meta.id, nodeType: 'character', raw }));
  const drag = session(handlers, nodes);
  nodes.forEach((item: any) => drag.select(item, { ctrlKey: true }));
  drag.startDrag(nodes[0]);
  assert.equal(await drag.drop(nodes[0], node({ id: 'project:p2', nodeType: 'project', projectId: 'p2' }), 'inner'), true);
  const destination = handlers.treeData.value[1];
  assert.ok('children' in destination);
  assert.deepEqual(destination.children.map(item => item.id), ['c', 'a', 'b']);
});

test('world editor batch moves subtrees sequentially to the destination project', async () => {
  const landmarks: any = ref([
    { id: 'a', projectId: 'p1', parentLandmarkIds: [], childLandmarkIds: ['child'] },
    { id: 'child', projectId: 'p1', parentLandmarkIds: ['a'], childLandmarkIds: [] },
    { id: 'b', projectId: 'p1', parentLandmarkIds: [], childLandmarkIds: [] },
    { id: 'c', projectId: 'p2', parentLandmarkIds: [], childLandmarkIds: [] },
  ]);
  const handlers = useDragAndDrop(landmarks, ref([]), ref([]));
  const nodes = ['a', 'b'].map(id => node({ id, type: 'landmark' }));
  const drag = session(handlers, nodes);
  nodes.forEach(item => drag.select(item, { ctrlKey: true }));
  drag.startDrag(nodes[0]);
  assert.equal(await drag.drop(nodes[0], node({ id: 'p2', type: 'project' }), 'inner'), true);
  assert.ok(landmarks.value.every((item: any) => item.projectId === 'p2'));
  assert.deepEqual(landmarks.value.filter((item: any) => item.id !== 'child').map((item: any) => item.id), ['c', 'a', 'b']);
});

function presetSetup() {
  const presets: any = ref(
    ['p1', 'p2', 'p3'].map((id, order) => ({
      id,
      order,
      data: {
        prompts: ['a', 'b', 'c', 'd'].map((identifier) => ({ identifier })),
        prompt_order: [
          { character_id: 100001, order: ['a', 'b', 'c'].map((identifier) => ({ identifier, enabled: true })) },
        ],
      },
    })),
  );
  let saved: string[] = [];
  const handlers = usePresetTreeMove({
      presets,
      reorderPresets: async (ids) => {
        saved = ids;
        ids.forEach((id, order) => { presets.value.find((preset: any) => preset.id === id).order = order; });
      },
      updatePromptOrder: async (presetId, ids) => {
        saved = ids;
        presets.value.find((preset: any) => preset.id === presetId).data.prompt_order[0].order =
          ids.map(identifier => ({ identifier, enabled: true }));
      },
    });
  const presetNodes = ['p1', 'p2', 'p3'].map(id => node({ id, isPreset: true }));
  const prompts = ['a', 'b', 'c', 'd'].map(id => node({ id, isPrompt: true, presetId: 'p1', raw: { identifier: id } }));
  return { handlers, presetNodes, prompts, saved: () => saved };
}

test('preset multi-selection uses the shared drag session and sequential persistence', async () => {
  const api = presetSetup();
  const [a, b, c] = api.presetNodes;
  const drag = session(api.handlers, api.presetNodes);
  drag.select(c, { ctrlKey: true });
  drag.select(a, { ctrlKey: true });
  drag.startDrag(a);
  assert.equal(await drag.drop(a, b, 'after'), true);
  assert.deepEqual(api.saved(), ['p2', 'p1', 'p3']);
});

test('prompt batches preserve insertion and uninserted membership semantics', async () => {
  const api = presetSetup();
  const [a, b, c, d] = api.prompts;
  const drag = session(api.handlers, api.prompts);
  drag.select(c, { ctrlKey: true });
  drag.select(a, { ctrlKey: true });
  drag.startDrag(a);
  assert.equal(await drag.drop(a, b, 'after'), true);
  assert.deepEqual(api.saved(), ['b', 'a', 'c']);
  assert.equal(await drag.move(c, d, 'before'), true);
  assert.deepEqual(api.saved(), ['b', 'a']);
  assert.equal(await drag.move(d, a, 'before'), true);
  assert.deepEqual(api.saved(), ['b', 'd', 'a']);
});
