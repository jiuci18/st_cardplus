import type { AllowDropType } from 'element-plus/es/components/tree/src/tree.type';

export type TreeMoveType = 'before' | 'after' | 'inner';
export interface TreeMoveHandlers<R extends boolean | Promise<boolean> = boolean | Promise<boolean>> {
  allowDrag: (node: any) => boolean;
  allowDrop: (source: any, target: any, type: AllowDropType) => boolean;
  handleNodeDrop: (source: any, target: any, type: TreeMoveType) => R | false;
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
  source: MoveBucket<C>;
  target: MoveBucket<C>;
  movingKeys: string[];
  sourceKeys: string[];
  targetKeys: string[];
  insertIndex: number;
  sameBucket: boolean;
}

/** Calculate against business order, never Element Plus's already-mutated childNodes. */
export function planTreeMove<C>(
  source: MoveBucket<C>,
  target: MoveBucket<C>,
  moving: readonly string[],
  anchor: string | undefined,
  type: TreeMoveType,
  innerPosition: 'start' | 'end' = 'start',
  allowUnchanged = false,
): TreeMove<C> | null {
  const selected = new Set(moving);
  const movingKeys = source.keys.filter((key) => selected.has(key));
  if (!movingKeys.length || movingKeys.length !== selected.size) return null;
  if (anchor !== undefined && selected.has(anchor)) return null;
  const sameBucket = source.id === target.id;
  if (!sameBucket && target.keys.some((key) => selected.has(key))) return null;
  const sourceKeys = source.keys.filter((key) => !selected.has(key));
  const targetKeys = sameBucket ? [...sourceKeys] : [...target.keys];
  const anchorIndex = anchor === undefined ? -1 : targetKeys.indexOf(anchor);
  if (type !== 'inner' && anchorIndex < 0) return null;
  const insertIndex =
    type === 'inner' ? (innerPosition === 'start' ? 0 : targetKeys.length) : anchorIndex + (type === 'after' ? 1 : 0);
  targetKeys.splice(insertIndex, 0, ...movingKeys);
  if (!allowUnchanged && sameBucket && targetKeys.every((key, index) => key === source.keys[index])) return null;
  return { source, target, movingKeys, sourceKeys, targetKeys, insertIndex, sameBucket };
}

/** Reorder participating slots in flat storage without disturbing unrelated tree branches. */
export function applyKeyOrder<T>(items: readonly T[], keys: readonly string[], keyOf: (item: T) => string): T[] {
  const byKey = new Map(items.map((item) => [keyOf(item), item]));
  const included = new Set(keys);
  let index = 0;
  return items.map((item) => (included.has(keyOf(item)) ? byKey.get(keys[index++])! : item));
}

/** Modules describe buckets and permissions, then persist the computed result. */
export function createTreeMoveHandlers<C, R extends boolean | Promise<boolean>>(options: {
  locate: (node: any) => MoveLocation<C> | undefined;
  container?: (node: any, source: MoveLocation<C>) => MoveBucket<C> | undefined;
  canDrag: (node: any) => boolean;
  canDrop: (source: any, target: any, type: AllowDropType) => boolean;
  movingKeys?: (source: any) => readonly string[];
  innerPosition?: 'start' | 'end';
  allowUnchanged?: boolean;
  commit: (move: TreeMove<C>, source: any, target: any, type: TreeMoveType) => R;
}): TreeMoveHandlers<R> {
  const plan = (sourceNode: any, targetNode: any, type: TreeMoveType) => {
    const source = options.locate(sourceNode);
    if (!source) return null;
    const anchor = type === 'inner' ? undefined : options.locate(targetNode);
    const target = type === 'inner' ? options.container?.(targetNode, source) : anchor?.bucket;
    if (!target) return null;
    const moving = options.movingKeys?.(sourceNode) ?? [source.key];
    if (!moving.includes(source.key)) return null;
    return planTreeMove(
      source.bucket,
      target,
      moving,
      anchor?.key,
      type,
      options.innerPosition,
      options.allowUnchanged,
    );
  };
  return {
    allowDrag: options.canDrag,
    allowDrop: (source: any, target: any, type: AllowDropType) =>
      options.canDrop(source, target, type) &&
      Boolean(plan(source, target, type === 'prev' ? 'before' : type === 'next' ? 'after' : 'inner')),
    handleNodeDrop: (source: any, target: any, type: TreeMoveType): R | false => {
      const allowedType = type === 'before' ? 'prev' : type === 'after' ? 'next' : 'inner';
      if (!options.canDrag(source) || !options.canDrop(source, target, allowedType)) return false;
      const move = plan(source, target, type);
      return move ? options.commit(move, source, target, type) : false;
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
    const container = options.containers().find((item) => options.id(item) === id);
    return container ? { id, keys: options.children(container), context: container } : undefined;
  };
  return {
    locate: (node: any): MoveLocation<T | null> | undefined => {
      const key = options.childId(node);
      if (key !== undefined) {
        const parent = bucket(options.parentId(node));
        return parent ? { key, bucket: parent } : undefined;
      }
      return { key: node.data.id, bucket: { id: '$root', keys: options.containers().map(options.id), context: null } };
    },
    container: (node: any) => bucket(node.data.id),
    canDrag: (node: any) => Boolean(node?.data && !node.data.isUtility),
    canDrop: (source: any, target: any, type: AllowDropType) => {
      if (!source?.data || !target?.data || source.data.isUtility || target.data.isUtility) return false;
      const sourceChild = options.childId(source) !== undefined;
      const targetChild = options.childId(target) !== undefined;
      return sourceChild ? (targetChild ? type !== 'inner' : type === 'inner') : !targetChild && type !== 'inner';
    },
  };
}
