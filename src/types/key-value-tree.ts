//! Node data used by the tree-shaped key-value filler.

/** One editable key-value node; nodes with `children` export as objects. */
export interface KeyValueNode {
  id: string;
  key: string;
  value: string;
  children?: KeyValueNode[];
}
