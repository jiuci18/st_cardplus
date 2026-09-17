import { nextTick, ref, shallowRef, watch } from 'vue';

export type TreeKey = string | number;
export type TreeDropType = 'before' | 'after' | 'inner';

interface Options {
  data: () => any[];
  key: () => string;
  children: () => string;
  defaults: () => TreeKey[];
  current: () => TreeKey | undefined;
  filter: () => string;
  autoExpandFirst: () => boolean;
  tree: () => any;
  drop: (source: any, target: any, type: TreeDropType) => boolean | Promise<boolean>;
}

/** Sole owner of sidebar expansion and refresh. Business data is never passed to ElTree for mutation. */
export function useSidebarTree(options: Options) {
  const data = shallowRef<any[]>([]);
  const expandedKeys = ref<TreeKey[]>([]);
  const busy = ref(false);
  let parents = new Map<TreeKey, TreeKey | undefined>();
  const appliedDefaults = new Set<TreeKey>();
  let initialized = false;
  let selectionPath = '';
  let clickedKey: TreeKey | undefined;
  let dragSource: any;
  let dragExpansion: TreeKey[] | undefined;

  const pathTo = (key: TreeKey): TreeKey[] => {
    const path: TreeKey[] = [];
    let current: TreeKey | undefined = key;
    while (current !== undefined && parents.has(current)) {
      path.unshift(current);
      current = parents.get(current);
    }
    return path;
  };

  const apply = async () => {
    await nextTick();
    const tree = options.tree();
    if (!tree) return;
    const expanded = new Set(expandedKeys.value);
    for (const key of parents.keys()) {
      const node = tree.getNode(key);
      if (!node) continue;
      if (expanded.has(key)) node.expand(undefined, false);
      else node.collapse();
    }
    tree.setCurrentKey(options.current(), false);
    if (options.filter()) tree.filter(options.filter());
  };

  const open = (key: TreeKey) => {
    expandedKeys.value = [...new Set([...expandedKeys.value, ...pathTo(key)])];
    return apply();
  };
  const close = (key: TreeKey) => {
    expandedKeys.value = expandedKeys.value.filter(value => value !== key);
    return apply();
  };
  const toggle = (key: TreeKey) => expandedKeys.value.includes(key) ? close(key) : open(key);

  const revealSelection = () => {
    const key = options.current();
    const path = key === undefined ? [] : pathTo(key);
    const signature = JSON.stringify(path);
    if (signature !== selectionPath) {
      selectionPath = signature;
      // A click may select a synthetic child (e.g. a preset's regex folder).
      // Do not undo that same click's collapse by revealing its selection.
      if (clickedKey !== undefined && path.includes(clickedKey)) return;
      expandedKeys.value = [...new Set([...expandedKeys.value, ...path])];
    }
  };

  const refresh = async () => {
    const nextParents = new Map<TreeKey, TreeKey | undefined>();
    const clone = (nodes: any[], parent?: TreeKey): any[] => nodes.map(node => {
      const key = node[options.key()] as TreeKey;
      nextParents.set(key, parent);
      const children = node[options.children()];
      return { ...node, ...(Array.isArray(children) ? { [options.children()]: clone(children, key) } : {}) };
    });
    data.value = clone(options.data());
    parents = nextParents;
    expandedKeys.value = expandedKeys.value.filter(key => parents.has(key));
    for (const key of options.defaults()) {
      if (parents.has(key) && !appliedDefaults.has(key)) {
        appliedDefaults.add(key);
        expandedKeys.value = [...new Set([...expandedKeys.value, ...pathTo(key)])];
      }
    }
    if (!initialized && data.value.length) {
      initialized = true;
      if (options.autoExpandFirst()) {
        expandedKeys.value = [...new Set([...expandedKeys.value, data.value[0][options.key()]])];
      }
    }
    revealSelection();
    await apply();
  };

  const onExpand = (node: any) => {
    const key = node[options.key()];
    if (!expandedKeys.value.includes(key)) expandedKeys.value.push(key);
  };
  const onCollapse = (node: any) => {
    expandedKeys.value = expandedKeys.value.filter(key => key !== node[options.key()]);
  };
  const onClick = (node: any) => {
    clickedKey = node[options.key()];
    // Parent selection updates are queued after the node-click emit.
    void nextTick().then(() => nextTick()).then(() => { clickedKey = undefined; });
  };
  const startDrag = (node: any) => {
    // ElTree replaces nodes before node-drop; keep the original source parent and UI state.
    dragSource = { data: node.data, parent: node.parent };
    dragExpansion = [...expandedKeys.value];
  };
  const move = async (sourceKey: TreeKey, targetKey: TreeKey, type: TreeDropType) => {
    const tree = options.tree();
    const source = tree?.getNode(sourceKey);
    const target = tree?.getNode(targetKey);
    if (!source || !target) return false;
    return drop(source, target, type);
  };
  const drop = async (source: any, target: any, type: TreeDropType): Promise<boolean> => {
    if (busy.value) return false;
    busy.value = true;
    const targetKey = target.data[options.key()] as TreeKey;
    const destination = type === 'inner' ? targetKey : parents.get(targetKey);
    const preserved = dragExpansion ?? [...expandedKeys.value];
    const originalSource = dragSource ?? source;
    dragSource = undefined;
    dragExpansion = undefined;
    let success = false;
    try {
      success = await options.drop(originalSource, target, type);
      return success;
    } finally {
      try {
        expandedKeys.value = preserved;
        await refresh();
        if (success && destination !== undefined) await open(destination);
      } finally {
        busy.value = false;
      }
    }
  };
  const endDrag = () => {
    // node-drop runs synchronously after node-drag-end in Element Plus.
    void nextTick(async () => {
      if (busy.value || !dragExpansion) return;
      expandedKeys.value = dragExpansion;
      dragSource = undefined;
      dragExpansion = undefined;
      await refresh();
    });
  };

  watch([options.data, options.defaults], () => { void refresh(); }, { immediate: true });
  watch(options.current, () => { revealSelection(); void apply(); }, { flush: 'post' });
  watch(options.filter, async value => {
    await nextTick();
    options.tree()?.filter(value);
    if (!value) await apply();
  });

  return { data, expandedKeys, busy, open, close, toggle, refresh, move, drop, startDrag, endDrag, onExpand, onCollapse, onClick };
}
