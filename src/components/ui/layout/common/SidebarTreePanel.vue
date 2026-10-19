<template>
  <div class="sidebar-panel" :class="{ 'is-dragging': dragging }">
    <div class="sidebar-panel-header">
      <h3 class="sidebar-panel-title">{{ title }}</h3>
      <div class="sidebar-panel-actions">
        <slot name="header-actions" />
      </div>
    </div>
    <div v-if="$slots['header-extra']" class="sidebar-panel-header-extra">
      <slot name="header-extra" />
    </div>

    <el-scrollbar class="sidebar-panel-scrollbar">
      <el-tree ref="treeRef" :data="renderData" :props="treeProps" :node-key="nodeKey"
        :default-expanded-keys="expandedKeys" :current-node-key="currentNodeKey" :highlight-current="highlightCurrent"
        :expand-on-click-node="true" :auto-expand-parent="false" :filter-node-method="filterNodeMethod"
        class="sidebar-tree" @node-click="handleNodeClick" @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse">
        <template #default="{ node, data }">
          <div class="sidebar-tree-node-slot" :data-tree-key="data[nodeKey]" :class="{
            'has-touch-checkbox': isMobileOrTablet && draggable,
            'is-multi-selected': selectedKeys.includes(data[nodeKey]),
            'drop-before':
              dropHint?.key === data[nodeKey] && dropHint?.type === 'before',
            'drop-after':
              dropHint?.key === data[nodeKey] && dropHint?.type === 'after',
            'drop-inner':
              dropHint?.key === data[nodeKey] && dropHint?.type === 'inner',
          }" :draggable="false"
            @click.capture="handleSelectionClick(node, $event)"
            @pointerdown="handlePointerDown(node, $event)"
            @pointermove="movement.pointerMove" @pointerup="movement.pointerUp"
            @pointercancel="movement.cancel()" @lostpointercapture="movement.cancel()"
            @dblclick.stop="handleNodeDblClick(data, node, $event)">
            <button v-if="draggable && isMobileOrTablet" class="sidebar-tree-node-checkbox" type="button"
              role="checkbox" :aria-checked="selectedKeys.includes(data[nodeKey])" aria-label="选择条目，长按拖动"
              data-tree-select :disabled="!movement.canDrag(node)" @contextmenu.stop.prevent>
              <Icon :icon="selectedKeys.includes(data[nodeKey])
                  ? 'ph:check-square-fill'
                  : 'ph:square'
                " />
            </button>
            <button v-else-if="draggable" class="sidebar-tree-node-drag-handle" type="button" aria-label="拖拽排序"
              @click.stop>
              <Icon icon="ph:dots-six-vertical-bold" class="sidebar-tree-node-drag-handle-icon" />
            </button>
            <TreeNodeMenu :items="nodeMenuItems?.(data, node) ?? []"
              @select="emit('node-menu-select', $event, data, node)">
              <slot name="node" :node="node" :data="data" />
            </TreeNodeMenu>
          </div>
        </template>
      </el-tree>
    </el-scrollbar>

    <div v-if="$slots.footer" class="sidebar-panel-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import TreeNodeMenu from "./TreeNodeMenu.vue";
import type { TreeMenuItem } from "./treeMenu";
import { ElScrollbar, ElTree } from "element-plus";
import { computed, ref } from "vue";
import type { TreeMoveHandlers } from '@/utils/treeMove';
import { useDevice } from "@/composables/useDevice";
import { useSidebarTree } from "./useSidebarTree";

interface Props {
  title: string;
  nodeMenuItems?: (data: any, node: any) => TreeMenuItem[];
  treeData: any[];
  treeProps?: Record<string, any>;
  nodeKey?: string;
  currentNodeKey?: string | number;
  highlightCurrent?: boolean;
  moveHandlers?: TreeMoveHandlers;
  filterNodeMethod?: (value: string, data: any, node: any) => boolean;
  filterValue?: string;
  autoExpandFirst?: boolean;
  defaultExpandedKeys?: Array<string | number>;
}

const props = withDefaults(defineProps<Props>(), {
  treeProps: () => ({ children: "children", label: "label" }),
  nodeKey: "id",
  highlightCurrent: true,
  filterValue: "",
  autoExpandFirst: false,
  defaultExpandedKeys: () => [],
});

const emit = defineEmits<{
  (e: "node-menu-select", key: string, data: any, node: any): void;
  (
    e: "node-click",
    data: any,
    context?: { node: any; component: any; event: MouseEvent | undefined },
  ): void;
  (
    e: "node-dblclick",
    data: any,
    context?: { node: any; event: MouseEvent | undefined },
  ): void;
}>();

const draggable = computed(() => Boolean(props.moveHandlers));
const { isMobileOrTablet } = useDevice();
const treeRef = ref<InstanceType<typeof ElTree> | null>(null);
const controller = useSidebarTree({
  data: () => props.treeData,
  key: () => props.nodeKey,
  children: () =>
    typeof props.treeProps.children === "string"
      ? props.treeProps.children
      : "children",
  defaults: () => props.defaultExpandedKeys,
  current: () => props.currentNodeKey,
  filter: () => props.filterValue,
  autoExpandFirst: () => props.autoExpandFirst,
  tree: () => treeRef.value,
  canDrag: (node) => props.moveHandlers?.allowDrag(node) ?? false,
  canDrop: (source, target, type) => props.moveHandlers?.allowDrop(source, target, type) ?? false,
  innerPosition: () => props.moveHandlers?.innerPosition ?? 'start',
  drop: (source, target, type) => props.moveHandlers?.handleNodeDrop(source, target, type) ?? false,
});
const {
  data: renderData,
  expandedKeys,
  movement,
  onExpand: handleNodeExpand,
  onCollapse: handleNodeCollapse,
} = controller;
const { selectedKeys, dragging, dropHint } = movement;
defineExpose({
  open: controller.open,
  close: controller.close,
  toggle: controller.toggle,
  refresh: controller.refresh,
  move: controller.move,
});

const handlePointerDown = (node: any, event: PointerEvent) => {
  if (!shouldIgnoreTreeNodeEvent(event)) movement.pointerDown(node, event);
};
const handleSelectionClick = (node: any, event: MouseEvent) => {
  if (!shouldIgnoreTreeNodeEvent(event) && draggable.value) movement.selectionClick(node, event);
};

const handleNodeClick = (
  data: any,
  node: any,
  component: any,
  event: MouseEvent,
) => {
  if (shouldIgnoreTreeNodeEvent(event)) return;
  controller.onClick(data);
  emit("node-click", data, { node, component, event });
};

const handleNodeDblClick = (data: any, node: any, event: MouseEvent) => {
  if (shouldIgnoreTreeNodeEvent(event)) return;
  emit("node-dblclick", data, { node, event });
};

const shouldIgnoreTreeNodeEvent = (event?: MouseEvent) => {
  if (!event) return false;
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  return Boolean(
    target.closest(".sidebar-tree-node-action-button") ||
    target.closest(".sidebar-tree-node-actions") ||
    target.closest(".el-upload"),
  );
};
</script>

<style>
.sidebar-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
}

.sidebar-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 10px 12px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.sidebar-panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sidebar-panel-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sidebar-panel-header-extra {
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.sidebar-header-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  font-size: 16px;
}

.sidebar-panel-scrollbar {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.sidebar-panel-scrollbar .el-scrollbar__wrap {
  overflow-x: hidden !important;
}

.sidebar-panel-scrollbar .el-scrollbar__view {
  overflow-x: hidden;
}

.sidebar-panel-footer {
  padding: 8px;
  border-top: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.sidebar-tree {
  background-color: transparent;
  padding: 8px;
  width: 100%;
}

.sidebar-tree-node-slot {
  position: relative;
  display: flex;
  align-items: center;
  padding-left: 22px;
  width: 100%;
}

.sidebar-tree-node-slot.is-multi-selected {
  background-color: var(--el-color-primary-light-9);
  box-shadow: inset 3px 0 var(--el-color-primary);
}

.sidebar-tree-node-slot.drop-before {
  box-shadow: 0 -2px var(--el-color-primary);
}

.sidebar-tree-node-slot.drop-after {
  box-shadow: 0 2px var(--el-color-primary);
}

.sidebar-tree-node-slot.drop-inner {
  outline: 2px solid var(--el-color-primary);
}

.sidebar-tree .el-tree-node__content {
  padding: 4px 0;
  height: auto;
  min-height: 32px;
}

.sidebar-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;
  min-width: 0;
}

.sidebar-tree-node-main {
  display: flex;
  align-items: center;
  overflow: hidden;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.sidebar-tree-node-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.sidebar-tree-node-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.sidebar-tree-node-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  gap: 4px;
}

.sidebar-tree .el-tree-node__content:hover .sidebar-tree-node-actions {
  opacity: 1;
}

.sidebar-tree-node-action-button {
  background: none;
  border: none;
  padding: 4px;
  margin-left: 2px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.sidebar-tree-node-action-button:hover {
  background-color: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.sidebar-tree-node-action-button.is-danger:hover {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.sidebar-tree-node.is-disabled {
  color: var(--el-text-color-disabled);
  cursor: not-allowed;
}

.sidebar-tree-node-source-icon {
  margin-left: 8px;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.sidebar-tree-node-drag-handle {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  border: none;
  background: transparent;
  width: 20px;
  height: 24px;
  padding: 0;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--el-text-color-secondary);
  opacity: 0.55;
  flex-shrink: 0;
  border-radius: 4px;
  transition:
    color 0.15s ease,
    opacity 0.15s ease,
    background-color 0.15s ease;
}

.sidebar-tree-node-drag-handle:active {
  cursor: grabbing;
  opacity: 0.95;
}

.sidebar-tree-node-drag-handle:hover {
  opacity: 0.95;
  color: var(--el-text-color-primary);
  background-color: var(--el-fill-color-light);
}

.sidebar-tree-node-slot.has-touch-checkbox {
  padding-left: 36px;
}

.sidebar-tree-node-checkbox {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 32px;
  height: 36px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 22px;
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;
}

.sidebar-tree-node-checkbox[aria-checked="true"] {
  color: var(--el-color-primary);
}

.sidebar-tree-node-checkbox:disabled {
  opacity: 0.3;
}

.is-dragging .sidebar-tree-node-slot.is-multi-selected {
  opacity: 0.65;
}

.sidebar-tree-node-drag-handle-icon {
  font-size: 14px;
}
</style>
