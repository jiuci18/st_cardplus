<template>
  <div class="sidebar-panel">
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
        :expand-on-click-node="expandOnClickNode" :auto-expand-parent="false" :draggable="draggable && !busy" :filter-node-method="filterNodeMethod"
        :allow-drag="allowDrag" :allow-drop="allowDrop" class="sidebar-tree" @node-click="handleNodeClick"
        @node-drop="handleNodeDrop" @node-drag-start="startDrag" @node-drag-end="endDrag"
        @node-expand="handleNodeExpand" @node-collapse="handleNodeCollapse">
        <template #default="{ node, data }">
          <div class="sidebar-tree-node-slot" @dblclick.stop="handleNodeDblClick(data, node, $event)">
            <button v-if="draggable" class="sidebar-tree-node-drag-handle" type="button" aria-label="拖拽排序" @click.stop>
              <Icon icon="ph:dots-six-vertical-bold" class="sidebar-tree-node-drag-handle-icon" />
            </button>
            <TreeNodeMenu :items="nodeMenuItems?.(data, node) ?? []" @select="emit('node-menu-select', $event, data, node)">
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
import { Icon } from '@iconify/vue';
import TreeNodeMenu from './TreeNodeMenu.vue';
import type { TreeMenuItem } from './treeMenu';
import { ElScrollbar, ElTree } from 'element-plus';
import { ref } from 'vue';
import { useSidebarTree } from './useSidebarTree';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';

type ActualNodeDropType = Exclude<NodeDropType, 'none'>;

interface Props {
  title: string;
  nodeMenuItems?: (data: any, node: any) => TreeMenuItem[];
  treeData: any[];
  treeProps?: Record<string, any>;
  nodeKey?: string;
  currentNodeKey?: string | number;
  highlightCurrent?: boolean;
  expandOnClickNode?: boolean;
  draggable?: boolean;
  allowDrag?: (draggingNode: any) => boolean;
  allowDrop?: (draggingNode: any, dropNode: any, type: AllowDropType) => boolean;
  handleNodeDrop?: (draggingNode: any, dropNode: any, type: ActualNodeDropType) => boolean | Promise<boolean>;
  filterNodeMethod?: (value: string, data: any, node: any) => boolean;
  filterValue?: string;
  autoExpandFirst?: boolean;
  defaultExpandedKeys?: Array<string | number>;
}

const props = withDefaults(defineProps<Props>(), {
  treeProps: () => ({ children: 'children', label: 'label' }),
  nodeKey: 'id',
  highlightCurrent: true,
  expandOnClickNode: false,
  draggable: false,
  filterValue: '',
  autoExpandFirst: false,
  defaultExpandedKeys: () => [],
});

const emit = defineEmits<{
  (e: 'node-menu-select', key: string, data: any, node: any): void;
  (e: 'node-click', data: any, context?: { node: any; component: any; event: MouseEvent | undefined }): void;
  (e: 'node-dblclick', data: any, context?: { node: any; event: MouseEvent | undefined }): void;
}>();

const treeRef = ref<InstanceType<typeof ElTree> | null>(null);
const controller = useSidebarTree({
  data: () => props.treeData,
  key: () => props.nodeKey,
  children: () => typeof props.treeProps.children === 'string' ? props.treeProps.children : 'children',
  defaults: () => props.defaultExpandedKeys,
  current: () => props.currentNodeKey,
  filter: () => props.filterValue,
  autoExpandFirst: () => props.autoExpandFirst,
  tree: () => treeRef.value,
  drop: (source, target, type) => {
    const allowedType = type === 'before' ? 'prev' : type === 'after' ? 'next' : 'inner';
    if (props.allowDrag && !props.allowDrag(source)) return false;
    if (props.allowDrop && !props.allowDrop(source, target, allowedType)) return false;
    return props.handleNodeDrop?.(source, target, type) ?? false;
  },
});
const { data: renderData, expandedKeys, busy, startDrag, endDrag,
  onExpand: handleNodeExpand, onCollapse: handleNodeCollapse } = controller;
defineExpose({ open: controller.open, close: controller.close, toggle: controller.toggle,
  refresh: controller.refresh, move: controller.move });

const handleNodeDrop = (draggingNode: any, dropNode: any, dropType: ActualNodeDropType) =>
  controller.drop(draggingNode, dropNode, dropType);

const handleNodeClick = (data: any, node: any, component: any, event: MouseEvent) => {
  if (shouldIgnoreTreeNodeEvent(event)) return;
  controller.onClick(data);
  emit('node-click', data, { node, component, event });
};

const handleNodeDblClick = (data: any, node: any, event: MouseEvent) => {
  if (shouldIgnoreTreeNodeEvent(event)) return;
  emit('node-dblclick', data, { node, event });
};

const shouldIgnoreTreeNodeEvent = (event?: MouseEvent) => {
  if (!event) return false;
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  return Boolean(
    target.closest('.sidebar-tree-node-action-button') ||
    target.closest('.sidebar-tree-node-actions') ||
    target.closest('.el-upload')
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
  transition: color 0.15s ease, opacity 0.15s ease, background-color 0.15s ease;
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

.sidebar-tree-node-drag-handle-icon {
  font-size: 14px;
}
</style>
