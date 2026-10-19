export type TreeMoveType = "before" | "after" | "inner";
export type TreeKey = string | number;

export interface TreeMoveHandlers {
  innerPosition: "start" | "end";
  allowDrag: (node: any) => boolean;
  allowDrop: (source: any, target: any, type: TreeMoveType) => boolean;
  handleNodeDrop: (
    source: any,
    target: any,
    type: TreeMoveType,
  ) => boolean | Promise<boolean>;
}
export interface MoveBucket<C> {
  id: string;
  keys: readonly string[];
  context: C;
}
export interface MoveLocation<C> {
  key: string;
  bucket: MoveBucket<C>;
}
export interface TreeMove<C> {
  key: string;
  source: MoveBucket<C>;
  target: MoveBucket<C>;
  sourceKeys: string[];
  targetKeys: string[];
  sameBucket: boolean;
}

/** Plan one insertion against the latest business order. The drag session owns the batch. */
export function planTreeMove<C>(
  source: MoveBucket<C>,
  target: MoveBucket<C>,
  key: string,
  anchor: string | undefined,
  type: TreeMoveType,
  innerPosition: "start" | "end" = "start",
): TreeMove<C> | null {
  if (!source.keys.includes(key) || anchor === key) return null;
  const sameBucket = source.id === target.id;
  if (!sameBucket && target.keys.includes(key)) return null;
  const sourceKeys = source.keys.filter((value) => value !== key);
  const targetKeys = sameBucket ? [...sourceKeys] : [...target.keys];
  const anchorIndex = anchor === undefined ? -1 : targetKeys.indexOf(anchor);
  if (type !== "inner" && anchorIndex < 0) return null;
  let insertIndex = anchorIndex + (type === 'after' ? 1 : 0);
  if (type === 'inner') insertIndex = innerPosition === 'start' ? 0 : targetKeys.length;
  targetKeys.splice(insertIndex, 0, key);
  return { key, source, target, sourceKeys, targetKeys, sameBucket };
}

/** Reorder participating slots in flat storage without disturbing unrelated tree branches. */
export function applyKeyOrder<T>(
  items: readonly T[],
  keys: readonly string[],
  keyOf: (item: T) => string,
): T[] {
  const byKey = new Map(items.map((item) => [keyOf(item), item]));
  const included = new Set(keys);
  let index = 0;
  return items.map((item) =>
    included.has(keyOf(item)) ? byKey.get(keys[index++])! : item,
  );
}

/** Modules describe buckets and permissions, then persist the computed result. */
export function createTreeMoveHandlers<C>(options: {
  locate: (node: any) => MoveLocation<C> | undefined;
  container?: (node: any, source: MoveLocation<C>) => MoveBucket<C> | undefined;
  canDrag: (node: any) => boolean;
  canDrop: (source: any, target: any, type: TreeMoveType) => boolean;
  innerPosition?: "start" | "end";
  allowUnchanged?: boolean;
  commit: (
    move: TreeMove<C>,
    source: any,
    target: any,
    type: TreeMoveType,
  ) => boolean | Promise<boolean>;
}): TreeMoveHandlers {
  const plan = (sourceNode: any, targetNode: any, type: TreeMoveType) => {
    const source = options.locate(sourceNode);
    if (!source) return null;
    const anchor = type === "inner" ? undefined : options.locate(targetNode);
    const target =
      type === "inner"
        ? options.container?.(targetNode, source)
        : anchor?.bucket;
    if (!target) return null;
    return planTreeMove(source.bucket, target, source.key, anchor?.key, type, options.innerPosition);
  };
  return {
    innerPosition: options.innerPosition ?? "start",
    allowDrag: options.canDrag,
    allowDrop: (source, target, type) =>
      options.canDrop(source, target, type) &&
      Boolean(plan(source, target, type)),
    handleNodeDrop: (source, target, type) => {
      if (!options.canDrag(source) || !options.canDrop(source, target, type))
        return false;
      const move = plan(source, target, type);
      if (!move) return false;
      // Already-positioned items must not block the rest of a drag batch.
      if (
        !options.allowUnchanged &&
        move.sameBucket &&
        move.targetKeys.every((key, index) => key === move.source.keys[index])
      )
        return true;
      return options.commit(move, source, target, type);
    },
  };
}

/** Books/categories are the same two-level tree: reorder containers or move their entries. */
export function collectionMoveLocations<T>(options: {
  containers: () => readonly T[];
  id: (container: T) => string;
  children: (container: T) => readonly string[];
  childId: (node: any) => string | undefined;
  parentId: (node: any) => string;
}) {
  const bucket = (id: string): MoveBucket<T | null> | undefined => {
    const container = options
      .containers()
      .find((item) => options.id(item) === id);
    return container
      ? { id, keys: options.children(container), context: container }
      : undefined;
  };
  return {
    locate: (node: any): MoveLocation<T | null> | undefined => {
      const key = options.childId(node);
      if (key !== undefined) {
        const parent = bucket(options.parentId(node));
        return parent ? { key, bucket: parent } : undefined;
      }
      return {
        key: node.data.id,
        bucket: {
          id: "$root",
          keys: options.containers().map(options.id),
          context: null,
        },
      };
    },
    container: (node: any) => bucket(node.data.id),
    canDrag: (node: any) => Boolean(node?.data && !node.data.isUtility),
    canDrop: (source: any, target: any, type: TreeMoveType) => {
      if (
        !source?.data ||
        !target?.data ||
        source.data.isUtility ||
        target.data.isUtility
      )
        return false;
      const sourceChild = options.childId(source) !== undefined;
      const targetChild = options.childId(target) !== undefined;
      if (!sourceChild) return !targetChild && type !== 'inner';
      if (!targetChild) return type === 'inner';
      return type !== 'inner';
    },
  };
}
