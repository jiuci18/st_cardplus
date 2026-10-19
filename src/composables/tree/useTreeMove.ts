import {
  computed,
  getCurrentScope,
  nextTick,
  onScopeDispose,
  ref,
  shallowRef,
} from "vue";
import type { TreeKey, TreeMoveType } from "../../utils/treeMove.ts";

/** Select → collect → release → insert. Mouse and touch share the same session. */
export function useTreeMove(options: {
  nodes: () => any[];
  key: (node: any) => TreeKey;
  ancestors: (key: TreeKey) => TreeKey[];
  visible: (node: any) => boolean;
  canDrag: (node: any) => boolean;
  canDrop: (source: any, target: any, type: TreeMoveType) => boolean;
  commit: (
    source: any,
    target: any,
    type: TreeMoveType,
  ) => boolean | Promise<boolean>;
  innerPosition?: () => "start" | "end";
  root?: () => HTMLElement | undefined;
  settled?: (
    target: any,
    type: TreeMoveType,
    moved: boolean,
  ) => void | Promise<void>;
}) {
  const selectedKeys = ref<TreeKey[]>([]);
  const collected = shallowRef<any[]>([]);
  const dragging = computed(() => collected.value.length > 0);
  const busy = ref(false);
  const dropHint = ref<{ key: TreeKey; type: TreeMoveType }>();
  let anchor: TreeKey | undefined;
  let pointer:
    { id: number; node: any; x: number; y: number; touch: boolean } | undefined;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressClick = false;
  const snapshot = (node: any) => ({ data: node.data, parent: node.parent });
  const canDrag = (node: any) => !busy.value && options.canDrag(node);
  const cancel = () => {
    clearTimeout(holdTimer);
    pointer = undefined;
    collected.value = [];
    dropHint.value = undefined;
  };
  const select = (
    node: any,
    event?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
  ) => {
    if (busy.value || dragging.value) return;
    if (!canDrag(node)) {
      selectedKeys.value = [];
      return;
    }
    const key = options.key(node);
    const additive = event?.ctrlKey || event?.metaKey;
    const visible =
      event?.shiftKey && anchor !== undefined
        ? options
            .nodes()
            .filter((node) => options.visible(node) && canDrag(node))
            .map(options.key)
        : [];
    const from = anchor === undefined ? -1 : visible.indexOf(anchor);
    const to = visible.indexOf(key);
    if (from >= 0 && to >= 0) {
      const range = visible.slice(Math.min(from, to), Math.max(from, to) + 1);
      selectedKeys.value = [
        ...new Set([...(additive ? selectedKeys.value : []), ...range]),
      ];
      return;
    }
    anchor = key;
    if (!additive) {
      selectedKeys.value = [key];
      return;
    }
    const selected = new Set(selectedKeys.value);
    if (!selected.delete(key)) selected.add(key);
    selectedKeys.value = [...selected];
  };
  const startDrag = (node: any, additive = false) => {
    if (!canDrag(node) || dragging.value) return false;
    if (!selectedKeys.value.includes(options.key(node)))
      select(node, { ctrlKey: additive });
    const selected = new Set(selectedKeys.value);
    collected.value = options
      .nodes()
      .map((candidate) =>
        options.key(candidate) === options.key(node) ? node : candidate,
      )
      .filter(
        (candidate) =>
          selected.has(options.key(candidate)) &&
          canDrag(candidate) &&
          !options
            .ancestors(options.key(candidate))
            .some((key) => selected.has(key)),
      )
      .map(snapshot);
    suppressClick = dragging.value;
    return dragging.value;
  };
  const accepts = (sources: any[], target: any, type: TreeMoveType) => {
    const targetPath = [
      options.key(target),
      ...options.ancestors(options.key(target)),
    ];
    return (
      sources.length > 0 &&
      sources.every(
        (source) =>
          !targetPath.includes(options.key(source)) &&
          options.canDrag(source) &&
          options.canDrop(source, target, type),
      )
    );
  };
  const canDrop = (source: any, target: any, type: TreeMoveType) =>
    !busy.value &&
    accepts(dragging.value ? collected.value : [source], target, type);
  const dropTypeAt = (
    source: any,
    target: any,
    ratio: number,
  ): TreeMoveType | undefined => {
    const before = canDrop(source, target, "before");
    const inner = canDrop(source, target, "inner");
    const after = canDrop(source, target, "after");
    const beforeEdge = inner ? 0.25 : after ? 0.5 : 1;
    const afterEdge = inner ? 0.75 : before ? 0.5 : 0;
    if (before && ratio < beforeEdge) return "before";
    if (after && ratio > afterEdge) return "after";
    if (inner) return "inner";
  };
  const insert = async (
    sources: any[],
    target: any,
    type: TreeMoveType,
  ): Promise<boolean> => {
    if (busy.value) return false;
    cancel();
    busy.value = true;
    let moved = false;
    try {
      if (!accepts(sources, target, type)) return false;
      // Reuse the original anchor: persistence can replace moved IDs.
      // Reverse traversal preserves display order for repeated after/start insertions.
      const reverse =
        type === "after" ||
        (type === "inner" && options.innerPosition?.() !== "end");
      for (const source of reverse ? [...sources].reverse() : sources) {
        if (!(await options.commit(source, target, type))) return false;
        moved = true;
        await nextTick();
      }
      return true;
    } finally {
      try {
        await options.settled?.(target, type, moved);
      } finally {
        busy.value = false;
      }
    }
  };
  const drop = (source: any, target: any, type: TreeMoveType) =>
    insert(
      dragging.value ? collected.value : [snapshot(source)],
      snapshot(target),
      type,
    );
  // Menu commands use the same insertion path, but move only the requested item.
  const move = (source: any, target: any, type: TreeMoveType) =>
    insert([snapshot(source)], snapshot(target), type);
  const prune = (keys: ReadonlySet<TreeKey>) => {
    selectedKeys.value = selectedKeys.value.filter((key) => keys.has(key));
    if (anchor !== undefined && !keys.has(anchor)) anchor = undefined;
  };
  const pointerDown = (node: any, event: PointerEvent) => {
    if (event.button !== 0 || !canDrag(node)) return;
    const touch = event.pointerType === "touch";
    const handle = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-tree-select]",
    );
    if (touch && !handle) return;
    cancel();
    suppressClick = false;
    pointer = {
      id: event.pointerId,
      node,
      x: event.clientX,
      y: event.clientY,
      touch,
    };
    (handle ?? (event.currentTarget as HTMLElement)).setPointerCapture(
      event.pointerId,
    );
    if (touch) holdTimer = setTimeout(() => startDrag(node, true), 350);
  };
  const updateDrop = (x: number, y: number) => {
    dropHint.value = undefined;
    if (!pointer || !dragging.value) return;
    const row = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-tree-key]");
    if (!row || !options.root?.()?.contains(row)) return;
    const target = options
      .nodes()
      .find((node) => String(options.key(node)) === row.dataset.treeKey);
    if (!target) return;
    const rect = row.getBoundingClientRect();
    const type = dropTypeAt(pointer.node, target, (y - rect.top) / rect.height);
    if (type) dropHint.value = { key: options.key(target), type };
    const scroller = row.closest<HTMLElement>(".el-scrollbar__wrap");
    if (!scroller) return;
    const bounds = scroller.getBoundingClientRect();
    if (y < bounds.top + 32) scroller.scrollTop -= 12;
    if (y > bounds.bottom - 32) scroller.scrollTop += 12;
  };
  const pointerMove = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const pending = !dragging.value;
    if (
      pending &&
      Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) <= 8
    )
      return;
    if (pending && pointer.touch) {
      cancel();
      suppressClick = true;
      return;
    }
    if (pending && !startDrag(pointer.node)) return;
    event.preventDefault();
    updateDrop(event.clientX, event.clientY);
  };
  const pointerUp = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (!dragging.value) return cancel();
    event.preventDefault();
    updateDrop(event.clientX, event.clientY);
    const hint = dropHint.value;
    const target =
      hint && options.nodes().find((node) => options.key(node) === hint.key);
    if (!target || !hint) return cancel();
    return drop(pointer.node, target, hint.type);
  };
  const selectionClick = (node: any, event: MouseEvent) => {
    const checkbox = (event.target as HTMLElement).closest(
      "[data-tree-select]",
    );
    const modified = event.ctrlKey || event.metaKey || event.shiftKey;
    if (suppressClick || busy.value || checkbox || modified) {
      event.stopPropagation();
      event.preventDefault();
    }
    const suppressed = suppressClick;
    suppressClick = false;
    if (suppressed) return;
    select(node, checkbox ? { ctrlKey: true } : event);
  };
  if (getCurrentScope()) onScopeDispose(cancel);
  return {
    selectedKeys,
    busy,
    dragging,
    dropHint,
    select,
    canDrag,
    canDrop,
    dropTypeAt,
    startDrag,
    drop,
    move,
    cancel,
    prune,
    pointerDown,
    pointerMove,
    pointerUp,
    selectionClick,
  };
}
