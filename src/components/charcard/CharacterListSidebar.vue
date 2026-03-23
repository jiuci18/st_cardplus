<template>
  <SidebarTreePanel
    title="角色列表"
    :tree-data="treeData"
    :tree-props="treeProps"
    :default-expanded-keys="defaultExpandedKeys"
    :current-node-key="activeCharacterId ?? undefined"
    :draggable="true"
    :allow-drag="allowDrag"
    :allow-drop="allowDrop"
    :handle-node-drop="handleNodeDrop"
    @node-click="handleNodeClick"
  >
    <template #header-actions>
      <div class="split-create-actions">
        <el-tooltip
          content="创建新角色"
          placement="top"
        >
          <button
            @click="emit('create')"
            class="btn-adv btn-primary-adv sidebar-header-button split-create-main"
          >
            <Icon icon="ph:user-plus-duotone" />
          </button>
        </el-tooltip>
        <el-dropdown
          trigger="click"
          placement="bottom-end"
          @command="handleHeaderCommand"
        >
          <button class="btn-adv btn-primary-adv sidebar-header-button split-create-toggle">
            <Icon icon="ph:caret-down-duotone" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="character">
                <Icon
                  icon="ph:user-plus-duotone"
                  class="split-create-item-icon"
                />
                创建新角色
              </el-dropdown-item>
              <el-dropdown-item command="project">
                <Icon
                  icon="ph:folder-plus-duotone"
                  class="split-create-item-icon"
                />
                创建新项目
              </el-dropdown-item>
              <el-dropdown-item command="import">
                <Icon
                  icon="ph:upload-simple-duotone"
                  class="split-create-item-icon"
                />
                从文件导入角色
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <BrowserFilePicker
        ref="filePickerRef"
        accept=".json"
        :trigger-on-click="false"
        @select-first="handleFileImport"
      />
    </template>

    <template #node="{ node, data }">
      <div class="sidebar-tree-node">
        <div class="sidebar-tree-node-main">
          <Icon
            :icon="data.icon"
            class="sidebar-tree-node-icon"
          />
          <span class="sidebar-tree-node-label">{{ node.label }}</span>
        </div>
        <div
          v-if="data.nodeType === 'character'"
          class="sidebar-tree-node-star"
        >
          <el-tooltip
            :content="data.raw.meta.starred ? '取消星标' : '设为星标'"
            placement="top"
          >
            <button
              @click.stop="emit('toggle-star', data.id, !data.raw.meta.starred)"
              class="sidebar-tree-node-action-button"
              :class="{ 'is-active': data.raw.meta.starred }"
            >
              <Icon :icon="data.raw.meta.starred ? 'ph:star-fill' : 'ph:star'" />
            </button>
          </el-tooltip>
        </div>
        <div
          v-if="data.nodeType === 'character'"
          class="sidebar-tree-node-actions"
        >
          <el-tooltip
            content="删除角色"
            placement="top"
          >
            <button
              @click.stop="emit('delete', data.id)"
              class="sidebar-tree-node-action-button is-danger"
            >
              <Icon icon="ph:trash-duotone" />
            </button>
          </el-tooltip>
        </div>
        <div
          v-if="data.nodeType === 'project'"
          class="sidebar-tree-node-actions"
        >
          <el-tooltip
            content="重命名项目"
            placement="top"
          >
            <button
              @click.stop="emit('rename-project', data.raw.id)"
              class="sidebar-tree-node-action-button"
            >
              <Icon icon="ph:pencil-duotone" />
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
import BrowserFilePicker from '@/components/common/BrowserFilePicker.vue';
import SidebarTreePanel from '@/components/layout/common/SidebarTreePanel.vue';
import type { CharacterCard, CharacterProject } from '../../types/character';
import { useCharacterProjectTree, type CharacterOrderPatch } from '../../composables/characterInfo/useCharacterProjectTree';

interface Props {
  characters: CharacterCard[];
  projects: CharacterProject[];
  activeCharacterId: string | null;
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
}>();

const filePickerRef = ref<InstanceType<typeof BrowserFilePicker> | null>(null);
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

const triggerFileInput = () => {
  filePickerRef.value?.open();
};

const handleFileImport = (file: File) => {
  emit('import', file);
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
