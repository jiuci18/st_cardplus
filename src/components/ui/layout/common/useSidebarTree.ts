import { nextTick, ref, shallowRef, watch } from "vue";
import { useTreeMove } from '../../../../composables/tree/useTreeMove.ts';
import type { TreeKey, TreeMoveType } from '../../../../utils/treeMove.ts';

interface Options {
  data: () => any[];
  key: () => string;
  children: () => string;
  defaults: () => TreeKey[];
  current: () => TreeKey | undefined;
  filter: () => string;
  autoExpandFirst: () => boolean;
  tree: () => any;
  drop: (
    source: any,
    target: any,
    type: TreeMoveType,
  ) => boolean | Promise<boolean>;
  canDrag?: (node: any) => boolean;
  canDrop?: (source: any, target: any, type: TreeMoveType) => boolean;
  innerPosition?: () => "start" | "end";
}

/** Owns expansion/rendering only; selection and movement belong to the move library. */
export function useSidebarTree(options: Options) {
  const data = shallowRef<any[]>([]);
  const expandedKeys = ref<TreeKey[]>([]);
  let parents = new Map<TreeKey, TreeKey | undefined>();
  const appliedDefaults = new Set<TreeKey>();
  let initialized = false;
  let selectionPath = "";
  let clickedKey: TreeKey | undefined;

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
    expandedKeys.value = expandedKeys.value.filter((value) => value !== key);
    return apply();
  };
  const toggle = (key: TreeKey) =>
    expandedKeys.value.includes(key) ? close(key) : open(key);
  const revealSelection = () => {
    const key = options.current();
    const path = key === undefined ? [] : pathTo(key);
    const signature = JSON.stringify(path);
    if (signature === selectionPath) return;
    selectionPath = signature;
    // A click selecting a synthetic child must not undo that click's collapse.
    if (clickedKey !== undefined && path.includes(clickedKey)) return;
    expandedKeys.value = [...new Set([...expandedKeys.value, ...path])];
  };
  const refresh = async () => {
    const nextParents = new Map<TreeKey, TreeKey | undefined>();
    const index = (nodes: any[], parent?: TreeKey) => {
      for (const node of nodes) {
        const key = node[options.key()] as TreeKey;
        nextParents.set(key, parent);
        const children = node[options.children()];
        if (Array.isArray(children)) index(children, key);
      }
    };
    data.value = options.data();
    index(data.value);
    parents = nextParents;
    movement.prune(new Set(parents.keys()));
    expandedKeys.value = expandedKeys.value.filter((key) => parents.has(key));
    for (const key of options.defaults()) {
      if (!parents.has(key) || appliedDefaults.has(key)) continue;
      appliedDefaults.add(key);
      expandedKeys.value = [...new Set([...expandedKeys.value, ...pathTo(key)])];
    }
    if (!initialized && data.value.length && options.autoExpandFirst()) {
      expandedKeys.value = [...new Set([...expandedKeys.value, data.value[0][options.key()]])];
    }
    initialized ||= data.value.length > 0;
    revealSelection();
    await apply();
  };
  const movement = useTreeMove({
    nodes: () =>
      [...parents.keys()]
        .map((key) => options.tree()?.getNode(key))
        .filter(Boolean),
    key: (node) => node.data[options.key()],
    ancestors: (key) => pathTo(key).slice(0, -1),
    visible: (node) =>
      node.visible !== false &&
      pathTo(node.data[options.key()])
        .slice(0, -1)
        .every((key) => expandedKeys.value.includes(key)),
    canDrag: (node) => options.canDrag?.(node) ?? true,
    canDrop: (source, target, type) =>
      options.canDrop?.(source, target, type) ?? true,
    commit: options.drop,
    innerPosition: options.innerPosition,
    root: () => options.tree()?.$el,
    settled: async (target, type, moved) => {
      const targetKey = target.data[options.key()];
      const destination = type === "inner" ? targetKey : parents.get(targetKey);
      await refresh();
      if (moved && destination !== undefined) await open(destination);
    },
  });
  const { busy } = movement;
  const move = (sourceKey: TreeKey, targetKey: TreeKey, type: TreeMoveType) => {
    const tree = options.tree();
    const source = tree?.getNode(sourceKey);
    const target = tree?.getNode(targetKey);
    return source && target
      ? movement.move(source, target, type)
      : Promise.resolve(false);
  };
  const onExpand = (node: any) => {
    const key = node[options.key()];
    if (!expandedKeys.value.includes(key)) expandedKeys.value.push(key);
  };
  const onCollapse = (node: any) => {
    expandedKeys.value = expandedKeys.value.filter(
      (key) => key !== node[options.key()],
    );
  };
  const onClick = (node: any) => {
    clickedKey = node[options.key()];
    void nextTick()
      .then(() => nextTick())
      .then(() => {
        clickedKey = undefined;
      });
  };

  watch(
    [options.data, options.defaults],
    () => {
      if (!busy.value) void refresh();
    },
    { immediate: true },
  );
  watch(
    options.current,
    () => {
      revealSelection();
      void apply();
    },
    { flush: "post" },
  );
  watch(options.filter, async (value) => {
    await nextTick();
    options.tree()?.filter(value);
    if (!value) await apply();
  });

  return {
    data,
    expandedKeys,
    movement,
    open,
    close,
    toggle,
    refresh,
    move,
    onExpand,
    onCollapse,
    onClick,
  };
}
