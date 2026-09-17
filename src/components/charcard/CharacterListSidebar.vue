<template>
  <SidebarTreePanel ref="sidebarRef" title="角色列表" :tree-data="treeData" :tree-props="treeProps"
    :default-expanded-keys="defaultExpandedKeys" :current-node-key="activeCharacterId ?? undefined" :draggable="true"
    :allow-drag="allowDrag" :allow-drop="allowDrop" :handle-node-drop="handleNodeDrop"
    :node-menu-items="getNodeMenuItems" @node-menu-select="handleNodeMenuSelect" @node-click="handleNodeClick">
    <template #header-actions>
      <div class="split-create-actions">
        <el-tooltip content="创建新角色" placement="top">
          <button @click="emit('create')" class="btn-adv btn-primary-adv sidebar-header-button split-create-main">
            <Icon icon="ph:user-plus-duotone" />
          </button>
        </el-tooltip>
        <el-dropdown trigger="click" placement="bottom-end" @command="handleHeaderCommand">
          <button class="btn-adv btn-primary-adv sidebar-header-button split-create-toggle">
            <Icon icon="ph:caret-down-duotone" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="character">
                <Icon icon="ph:user-plus-duotone" class="split-create-item-icon" />
                创建新角色
              </el-dropdown-item>
              <el-dropdown-item command="project">
                <Icon icon="ph:folder-plus-duotone" class="split-create-item-icon" />
                创建新项目
              </el-dropdown-item>
              <el-dropdown-item command="import">
                <Icon icon="ph:upload-simple-duotone" class="split-create-item-icon" />
                从文件导入角色
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <BrowserFilePicker ref="filePickerRef" accept=".json" :trigger-on-click="false"
        @select-first="file => emit('import', file)" />
    </template>

    <template #node="{ node, data }">
      <div class="sidebar-tree-node">
        <div class="sidebar-tree-node-main">
          <Icon :icon="data.icon" class="sidebar-tree-node-icon" />
          <span class="sidebar-tree-node-label">{{ node.label }}</span>
        </div>
        <div v-if="data.nodeType === 'character'" class="sidebar-tree-node-star">
          <el-tooltip :content="data.raw.meta.starred ? '取消星标' : '设为星标'" placement="top">
            <button @click.stop="emit('toggle-star', data.id, !data.raw.meta.starred)"
              class="sidebar-tree-node-action-button" :class="{ 'is-active': data.raw.meta.starred }">
              <Icon :icon="data.raw.meta.starred ? 'ph:star-fill' : 'ph:star'" />
            </button>
          </el-tooltip>
        </div>
      </div>
    </template>
  </SidebarTreePanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElTooltip, ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';
import { Icon } from '@iconify/vue';
import BrowserFilePicker from '@/components/ui/common/BrowserFilePicker.vue';
import SidebarTreePanel from '@/components/ui/layout/common/SidebarTreePanel.vue';
import type { TreeMenuItem } from '@/components/ui/layout/common/treeMenu';
import type { CharacterCard, CharacterProject } from '@/types/character/character';
import { useCharacterProjectTree, type CharacterOrderPatch } from '../../composables/characterInfo/useCharacterProjectTree';

interface Props {
  characters: CharacterCard[];
  projects: CharacterProject[];
  activeCharacterId: string | null;
}

interface BrowserFilePickerExposed {
  open: () => void;
  reset: () => void;
}

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'create-project'): void;
  (e: 'create'): void;
  (e: 'delete', id: string): void;
  (e: 'import', file: File): void;
  (e: 'reorder', patches: CharacterOrderPatch[]): void;
  (e: 'reorder-projects', orderedIds: string[]): void;
  (e: 'toggle-star', id: string, starred: boolean): void;
  (e: 'rename-project', id: string): void;
  (e: 'delete-project', id: string): void;
}>();

const sidebarRef = ref<InstanceType<typeof SidebarTreePanel> | null>(null);
const filePickerRef = ref<BrowserFilePickerExposed | null>(null);
const props = defineProps<Props>();
const defaultExpandedKeys = computed<Array<string | number>>(() =>
  props.projects.map((project) => `project:${project.id}`)
);

const {
  treeProps,
  treeData,
  allowDrag,
  allowDrop,
  handleNodeDrop,
  handleNodeClick,
} = useCharacterProjectTree({
  characters: computed(() => props.characters),
  projects: computed(() => props.projects),
  onReorderCharacters: (patches) => emit('reorder', patches),
  onReorderProjects: (orderedIds) => emit('reorder-projects', orderedIds),
  onSelectCharacter: (id) => emit('select', id),
});

type MenuNode = (typeof treeData.value)[number] | NonNullable<Extract<(typeof treeData.value)[number], { children: unknown }>['children']>[number];

const getSortableSiblings = (data: MenuNode): MenuNode[] => {
  if (data.nodeType === 'project') {
    return treeData.value.filter(node => node.nodeType === 'project');
  }
  const project = treeData.value.find(node => node.nodeType === 'project' && node.projectId === data.projectId);
  const siblings = project && 'children' in project ? project.children : treeData.value;
  return siblings.filter(node => node.nodeType === 'character' && 'raw' in node && 'raw' in data
    && !!node.raw.meta.starred === !!data.raw.meta.starred);
};

const getNodeMenuItems = (data: MenuNode): TreeMenuItem[] => {
  const siblings = getSortableSiblings(data);
  const index = siblings.findIndex(node => node.id === data.id);
  const first = index <= 0;
  const last = index < 0 || index === siblings.length - 1;
  return [
    ...(data.nodeType === 'project'
      ? [{ key: 'rename-project', label: '重命名项目', icon: 'ph:pencil-simple-duotone' }]
      : []),
    { key: 'up', label: '上移', divided: data.nodeType === 'project', disabled: first },
    { key: 'down', label: '下移', disabled: last },
    { key: 'top', label: '移至顶端', disabled: first },
    { key: 'bottom', label: '移至末尾', disabled: last },
    ...(data.nodeType === 'character'
      ? [{ key: 'delete', label: '删除角色', icon: 'ph:trash-duotone', divided: true, danger: true }]
      : [{ key: 'delete-project', label: '删除文件夹', icon: 'ph:trash-duotone', divided: true, danger: true }]),
  ];
};

const handleNodeMenuSelect = (key: string, data: MenuNode) => {
  const item = getNodeMenuItems(data).find(item => item.key === key);
  if (!item || item.disabled) return;
  if (key === 'rename-project' && data.projectId) return emit('rename-project', data.projectId);
  if (key === 'delete-project' && data.projectId) return emit('delete-project', data.projectId);
  if (key === 'delete') return emit('delete', data.id);
  const siblings = getSortableSiblings(data);
  const index = siblings.findIndex(node => node.id === data.id);
  const target = key === 'top' ? 0 : key === 'bottom' ? siblings.length - 1 : index + (key === 'up' ? -1 : 1);
  if (index < 0 || !siblings[target]) return;
  void sidebarRef.value?.move(data.id, siblings[target].id, target < index ? 'before' : 'after');
};

const triggerFileInput = () => {
  filePickerRef.value?.open();
};


const handleHeaderCommand = (command: string) => {
  if (command === 'character') {
    emit('create');
    return;
  }
  if (command === 'project') {
    emit('create-project');
    return;
  }
  if (command === 'import') {
    triggerFileInput();
  }
};
</script>

<style scoped>
@import '@/css/split-create-actions.css';

.sidebar-tree-node-star {
  display: flex;
  align-items: center;
  margin-right: 4px;
}

.sidebar-tree-node-action-button.is-active {
  color: var(--el-color-warning);
}
</style>
