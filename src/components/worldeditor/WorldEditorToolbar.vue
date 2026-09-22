<template>
  <div class="toolbar-container">
    <SidebarTreePanel
      ref="sidebarRef"
      title="世界编辑器"
      :tree-data="treeData"
      :tree-props="treeProps"
      node-key="id"
      :default-expanded-keys="expandedKeys"
      :current-node-key="currentNodeKey"
      :draggable="true"
      :filter-node-method="filterNode"
      :filter-value="searchQuery"
      :allow-drag="props.dragDropHandlers.allowDrag"
      :allow-drop="props.dragDropHandlers.allowDrop"
      :handle-node-drop="handleNodeDrop"
      :node-menu-items="getNodeMenuItems"
      @node-menu-select="handleNodeMenuSelect"
      @node-click="handleNodeClick"
    >
      <template #header-actions>
        <div class="split-create-actions">
          <el-tooltip content="新增地标" placement="top" :show-arrow="false" :offset="8" :hide-after="0">
            <button
              @click="emit('add', 'landmark')"
              class="btn-adv btn-primary-adv sidebar-header-button split-create-main"
            >
              <Icon icon="ph:map-pin-duotone" />
            </button>
          </el-tooltip>
          <el-dropdown trigger="click" placement="bottom-end" @command="handleAddCommand">
            <button class="btn-adv btn-primary-adv sidebar-header-button split-create-toggle">
              <Icon icon="ph:caret-down-duotone" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="project">
                  <Icon icon="ph:folder-plus-duotone" class="split-create-item-icon" />
                  新增项目
                </el-dropdown-item>
                <el-dropdown-item command="landmark">
                  <Icon icon="ph:map-pin-duotone" class="split-create-item-icon" />
                  新增地标
                </el-dropdown-item>
                <el-dropdown-item command="region">
                  <Icon icon="ph:squares-four-duotone" class="split-create-item-icon" />
                  新增区域
                </el-dropdown-item>
                <el-dropdown-item command="force">
                  <Icon icon="ph:flag-duotone" class="split-create-item-icon" />
                  新增势力
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>

      <template #header-extra>
        <div class="controls-section">
          <div class="search-controls">
            <el-input v-model="searchQuery" placeholder="搜索地标、势力或区域..." clearable :prefix-icon="Search" />
          </div>
        </div>
      </template>

      <template #node="{ node, data }">
        <div class="custom-tree-node">
          <div class="node-main">
            <Icon :icon="data.icon" class="node-icon" :color="data.iconColor" />
            <span class="node-label">{{ node.label }}</span>
          </div>
        </div>
      </template>
    </SidebarTreePanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElTooltip, ElInput, ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';
import type { TreeMoveHandlers } from '@/utils/treeMove';
import { Icon } from '@iconify/vue';
import { Search } from '@element-plus/icons-vue';
import SidebarTreePanel from '@/components/ui/layout/common/SidebarTreePanel.vue';
import type { TreeMenuItem } from '@/components/ui/layout/common/treeMenu';
import type {
  Project,
  EnhancedLandmark,
  EnhancedForce,
  EnhancedRegion,
  ProjectIntegration,
} from '@/types/worldeditor/world-editor';
import { getLandmarkTypeIcon } from '@/utils/worldeditor/typeMeta';
import { getParentLandmarkId } from '@/utils/worldeditor/landmarkHierarchy';

type SelectableItem = Project | EnhancedLandmark | EnhancedForce | EnhancedRegion | ProjectIntegration;
type ActualNodeDropType = Exclude<import('element-plus/es/components/tree/src/tree.type').NodeDropType, 'none'>;

interface Props {
  projects: Project[];
  landmarks: EnhancedLandmark[];
  forces: EnhancedForce[];
  regions: EnhancedRegion[];
  selectedItem: SelectableItem | null;
  dragDropHandlers: TreeMoveHandlers;
}

const props = defineProps<Props>();
const sidebarRef = ref<InstanceType<typeof SidebarTreePanel> | null>(null);
const emit = defineEmits<{
  (e: 'select', item: SelectableItem): void;
  (e: 'open-graph', projectId: string): void;
  (e: 'add', type: 'project' | 'landmark' | 'force' | 'region'): void;
  (e: 'edit', item: Project | EnhancedLandmark | EnhancedForce | EnhancedRegion): void;
  (e: 'copy', item: EnhancedLandmark | EnhancedForce | EnhancedRegion): void;
  (e: 'delete', item: SelectableItem): void;
  (e: 'node-drop'): void;
}>();

const getSiblingNodes = (data: any, node: any): any[] =>
  (node?.parent?.childNodes ?? []).filter((sibling: any) => sibling.data.type === data.type);

const getNodeMenuItems = (data: any, node: any): TreeMenuItem[] => {
  if (!data.isEntry || !['project', 'landmark', 'force', 'region'].includes(data.type)) {
    return [];
  }
  const siblings = getSiblingNodes(data, node);
  const index = siblings.findIndex((sibling) => sibling.data.id === data.id);
  const canMove = data.type !== 'project';
  return [
    ...(data.type !== 'project' ? [{ key: 'copy', label: '复制', icon: 'ph:copy-duotone' }] : []),
    { key: 'edit', label: '编辑', icon: 'ph:pencil-duotone' },
    ...(canMove
      ? [
          { key: 'up', label: '上移', icon: 'ph:arrow-up-duotone', divided: true, disabled: index <= 0 },
          {
            key: 'down',
            label: '下移',
            icon: 'ph:arrow-down-duotone',
            disabled: index < 0 || index >= siblings.length - 1,
          },
          { key: 'top', label: '移至顶端', icon: 'ph:arrow-line-up-duotone', disabled: index <= 0 },
          {
            key: 'bottom',
            label: '移至末尾',
            icon: 'ph:arrow-line-down-duotone',
            disabled: index < 0 || index >= siblings.length - 1,
          },
        ]
      : []),
    ...(data.type === 'landmark'
      ? [
          { key: 'indent', label: '移动到', icon: 'ph:caret-right-duotone', divided: true, disabled: index <= 0 },
          {
            key: 'outdent',
            label: '移出',
            icon: 'ph:caret-left-duotone',
            disabled: node?.parent?.data.type !== 'landmark',
          },
        ]
      : []),
    { key: 'delete', label: '删除', icon: 'ph:trash-duotone', divided: true, danger: true },
  ];
};

const handleNodeMenuSelect = (key: string, data: any, node: any) => {
  const item = getNodeMenuItems(data, node).find((item) => item.key === key);
  if (!item || item.disabled) return;
  if (key === 'copy') return emit('copy', data.raw);
  if (key === 'edit') return emit('edit', data.raw);
  if (key === 'delete') return emit('delete', data.raw);

  const siblings = getSiblingNodes(data, node);
  const index = siblings.findIndex((sibling) => sibling.data.id === data.id);
  const target =
    key === 'outdent'
      ? node.parent
      : key === 'top'
        ? siblings[0]
        : key === 'bottom'
          ? siblings[siblings.length - 1]
          : siblings[index + (key === 'down' ? 1 : -1)];
  if (!target) return;
  const dropType = key === 'indent' ? 'inner' : key === 'up' || key === 'top' ? 'before' : 'after';
  if (
    !props.dragDropHandlers.allowDrop(
      node,
      target,
      dropType === 'before' ? 'prev' : dropType === 'after' ? 'next' : 'inner',
    )
  )
    return;
  void sidebarRef.value?.move(data.id, target.data.id, dropType);
};

const searchQuery = ref('');

const filterNode = (value: string, data: any): boolean => {
  if (!value) return true;
  if (!data.isEntry) return true; // Always show root nodes
  return data.label.toLowerCase().includes(value.toLowerCase());
};

const treeProps = {
  children: 'children',
  label: 'label',
};

const DEFAULT_ICON_COLORS = {
  region: 'var(--el-color-warning)',
} as const;

const normalizeColor = (value?: string) => {
  const normalized = value?.trim();
  return normalized || undefined;
};

const buildLandmarkTree = (projectLandmarks: EnhancedLandmark[], regionColorMap: Map<string, string>) => {
  const nodeMap = new Map<string, any>();
  const parentMap = new Map<string, string | null>();

  projectLandmarks.forEach((landmark) => {
    const regionColor = landmark.regionId ? regionColorMap.get(landmark.regionId) : undefined;
    parentMap.set(landmark.id, getParentLandmarkId(landmark));
    nodeMap.set(landmark.id, {
      id: landmark.id,
      label: landmark.name,
      icon: getLandmarkTypeIcon(landmark.type),
      isEntry: true,
      type: 'landmark',
      raw: landmark,
      iconColor: normalizeColor(regionColor),
      children: [] as any[],
    });
  });

  const isCycle = (childId: string, parentId: string | null) => {
    if (!parentId) return false;
    const seen = new Set<string>();
    let current: string | null | undefined = parentId;
    while (current) {
      if (current === childId) return true;
      if (seen.has(current)) return true;
      seen.add(current);
      current = parentMap.get(current);
    }
    return false;
  };

  const roots: any[] = [];
  projectLandmarks.forEach((landmark) => {
    const node = nodeMap.get(landmark.id);
    const parentId = parentMap.get(landmark.id);
    if (!parentId || !nodeMap.has(parentId) || isCycle(landmark.id, parentId)) {
      roots.push(node);
      return;
    }
    nodeMap.get(parentId).children.push(node);
  });

  return roots;
};

const treeData = computed(() => {
  return props.projects.map((project) => {
    const projectLandmarks = props.landmarks.filter((l) => l.projectId === project.id);
    const projectRegions = props.regions.filter((r) => r.projectId === project.id);
    const projectForces = props.forces.filter((f) => f.projectId === project.id);
    const regionColorMap = new Map(projectRegions.map((region) => [region.id, region.color]));

    // 创建整合节点数据
    const integrationNode: ProjectIntegration = {
      id: `${project.id}-integration`,
      projectId: project.id,
      type: 'integration',
      name: '整合',
    };

    return {
      id: project.id,
      label: project.name,
      icon: 'ph:folder-duotone',
      isEntry: true,
      type: 'project',
      raw: project,
      children: [
        {
          id: `${project.id}-landmarks`,
          label: `地标 (${projectLandmarks.length})`,
          icon: 'ph:map-trifold-duotone',
          isEntry: false,
          children: buildLandmarkTree(projectLandmarks, regionColorMap),
        },
        {
          id: `${project.id}-regions`,
          label: `区域 (${projectRegions.length})`,
          icon: 'ph:squares-four-duotone',
          isEntry: false,
          children: projectRegions.map((region) => ({
            id: region.id,
            label: region.name,
            icon: 'ph:square-duotone',
            isEntry: true,
            type: 'region',
            raw: region,
            iconColor: normalizeColor(region.color) || DEFAULT_ICON_COLORS.region,
          })),
        },
        {
          id: `${project.id}-forces`,
          label: `势力 (${projectForces.length})`,
          icon: 'ph:users-three-duotone',
          isEntry: false,
          children: projectForces.map((force) => ({
            id: force.id,
            label: force.name,
            icon: 'ph:flag-duotone',
            isEntry: true,
            type: 'force',
            raw: force,
          })),
        },
        {
          id: `${project.id}-integration`,
          label: '整合',
          icon: 'ph:circles-four-duotone',
          isEntry: true,
          type: 'integration',
          raw: integrationNode,
        },
        {
          id: `${project.id}-graph`,
          label: '节点图',
          icon: 'ph:share-network-duotone',
          isEntry: true,
          type: 'graph',
          raw: { projectId: project.id },
        },
      ],
    };
  });
});

// Only declares initial defaults; the shared controller owns live expansion state.
const expandedKeys = computed(() => props.projects.map((project) => project.id));

const currentNodeKey = computed(() => {
  return props.selectedItem?.id;
});

const handleNodeClick = (data: any) => {
  if (data.isEntry) {
    if (data.type === 'graph') {
      emit('open-graph', data.raw.projectId);
      return;
    }
    emit('select', data.raw);
  }
};

const handleNodeDrop = (draggingNode: any, dropNode: any, dropType: ActualNodeDropType) => {
  const success = props.dragDropHandlers.handleNodeDrop(draggingNode, dropNode, dropType);
  if (success) {
    emit('node-drop');
  }
  return success;
};

const handleAddCommand = (command: 'project' | 'landmark' | 'region' | 'force') => {
  emit('add', command);
};
</script>

<style scoped>
@import '@/css/split-create-actions.css';

.toolbar-container {
  height: 100%;
}

.controls-section {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.toolbar-container :deep(.sidebar-tree .el-tree-node__content) {
  padding: 4px 0;
  height: auto;
  min-height: 36px;
}

.toolbar-container :deep(.sidebar-tree .el-tree-node.is-current > .el-tree-node__content) {
  background-color: var(--el-color-primary-light-9);
}

.toolbar-container :deep(.sidebar-tree .el-tree-node:focus > .el-tree-node__content) {
  background-color: var(--el-color-primary-light-9);
}

.custom-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  padding-right: 8px;
}

.node-main {
  display: flex;
  align-items: center;
  overflow: hidden;
}

.node-icon {
  font-size: 18px;
  margin-right: 8px;
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.node-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}
</style>
