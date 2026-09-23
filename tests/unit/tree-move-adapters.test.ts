import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { effectScope, ref } from 'vue';

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
const { usePresetTreeSelectionDnD } = await import('../../src/composables/preset/usePresetTreeSelectionDnD.ts');
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
  assert.equal(handlers.allowDrop(character(0), character(2), 'prev'), false);
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

function presetSetup(t: { after: (fn: () => void) => void }) {
  const scope = effectScope();
  t.after(() => scope.stop());
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
  let release: (() => void) | undefined;
  const api = scope.run(() =>
    usePresetTreeSelectionDnD({
      presets,
      reorderPresets: async (ids) => {
        saved = ids;
      },
      updatePromptOrder: async (_id, ids) => {
        saved = ids;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    }),
  )!;
  const prompt = (id: string) => node({ isPrompt: true, presetId: 'p1', raw: { identifier: id } });
  return { ...api, prompt, saved: () => saved, release: () => release?.() };
}

test('preset multi-selection moves in display order rather than click order', async (t) => {
  const api = presetSetup(t);
  api.handleToggleNodeSelection({ isPreset: true, id: 'p3' }, true);
  api.handleToggleNodeSelection({ isPreset: true, id: 'p1' }, true);
  assert.equal(
    await api.dragDropHandlers.handleNodeDrop(
      node({ isPreset: true, id: 'p1' }),
      node({ isPreset: true, id: 'p2' }),
      'after',
    ),
    true,
  );
  assert.deepEqual(api.saved(), ['p2', 'p1', 'p3']);
});

test('prompt multi-selection, insertion and uninserted boundary preserve membership semantics', async (t) => {
  const api = presetSetup(t);
  api.handleToggleNodeSelection(api.prompt('c').data, true);
  api.handleToggleNodeSelection(api.prompt('a').data, true);
  let pending = api.dragDropHandlers.handleNodeDrop(api.prompt('a'), api.prompt('b'), 'after');
  assert.deepEqual(api.saved(), ['b', 'a', 'c']);
  api.release();
  assert.equal(await pending, true);
  api.handleToggleNodeSelection(api.prompt('d').data, false);
  pending = api.dragDropHandlers.handleNodeDrop(api.prompt('d'), api.prompt('a'), 'before');
  assert.deepEqual(api.saved(), ['d', 'a', 'b', 'c']);
  api.release();
  assert.equal(await pending, true);
  // C already precedes D visually, but dropping it onto uninserted D removes C from prompt_order.
  pending = api.dragDropHandlers.handleNodeDrop(api.prompt('c'), api.prompt('d'), 'before');
  assert.deepEqual(api.saved(), ['a', 'b']);
  api.release();
  assert.equal(await pending, true);
});
