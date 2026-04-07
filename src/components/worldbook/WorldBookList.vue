<template>
  <SidebarTreePanel
    title="世界书"
    :tree-data="treeData"
    :tree-props="treeProps"
    :current-node-key="currentNodeKey"
    :draggable="true"
    :allow-drag="props.dragDropHandlers.allowDrag"
    :allow-drop="props.dragDropHandlers.allowDrop"
    :handle-node-drop="props.dragDropHandlers.handleNodeDrop"
    @node-click="handleNodeClick"
  >
    <template #header-actions>
      <el-tooltip
        content="创建新世界书"
        placement="top"
        :show-arrow="false"
        :offset="8"
        :hide-after="0"
      >
        <button
          @click="emit('create-book')"
          class="btn-adv btn-primary-adv sidebar-header-button"
          aria-label="创建新世界书"
        >
          <Icon icon="ph:plus-bold" />
        </button>
      </el-tooltip>
    </template>

    <template #node="{ node, data }">
      <div
        class="sidebar-tree-node"
        :class="{ 'is-disabled': data.isEntry && data.raw.disable, 'is-constant': data.isEntry && data.raw.constant }"
      >
        <div class="sidebar-tree-node-main">
          <Icon
            :icon="data.icon"
            class="sidebar-tree-node-icon"
          />
          <span class="sidebar-tree-node-label">{{ node.label }}</span>
          <el-tooltip
            v-if="!data.isEntry && data.raw.sourceCharacterName"
            :content="`来自: ${data.raw.sourceCharacterName}`"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <Icon
              icon="ph:user-circle-duotone"
              class="sidebar-tree-node-source-icon"
            />
          </el-tooltip>
        </div>
        <div
          class="sidebar-tree-node-actions"
          v-if="!data.isEntry"
        >
          <el-tooltip
            content="新增条目"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="emit('add-entry', data.id)"
              class="sidebar-tree-node-action-button"
            >
              <Icon icon="ph:plus-circle-duotone" />
            </button>
          </el-tooltip>
          <el-tooltip
            content="重命名"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="emit('rename-book', data.id)"
              class="sidebar-tree-node-action-button"
            >
              <Icon icon="ph:pencil-simple-duotone" />
            </button>
          </el-tooltip>
          <el-tooltip
            content="删除"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="emit('delete-book', data.id)"
              class="sidebar-tree-node-action-button is-danger"
            >
              <Icon icon="ph:trash-duotone" />
            </button>
          </el-tooltip>
        </div>
        <div
          class="sidebar-tree-node-actions"
          v-if="data.isEntry"
        >
          <el-tooltip
            content="复制条目"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="emit('duplicate-entry', data.bookId, data.entryIndex)"
              class="sidebar-tree-node-action-button"
            >
              <Icon icon="ph:copy-duotone" />
            </button>
          </el-tooltip>
          <el-tooltip
            content="删除条目"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="emit('delete-entry', data.bookId, data.entryIndex)"
              class="sidebar-tree-node-action-button is-danger"
            >
              <Icon icon="ph:trash-duotone" />
            </button>
          </el-tooltip>
        </div>
      </div>
    </template>

    <template #footer>
      <WorldBookActions
        context="list"
        :sidebar-width="sidebarWidth"
        @copy-book="$emit('copy-book')"
        @export-json="$emit('export-json')"
        @import-book-file="(file) => $emit('import-book-file', file)"
        @clear-all="$emit('clear-all')"
      />
    </template>
  </SidebarTreePanel>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElTooltip } from 'element-plus';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';
import { Icon } from '@iconify/vue';
import SidebarTreePanel from '@/components/ui/layout/common/SidebarTreePanel.vue';
import WorldBookActions from './WorldBookActions.vue';
import type { WorldBookCollection, WorldBookEntry } from '../../types/types';

interface Props {
  collection: WorldBookCollection;
  activeBookId: string | null;
  selectedEntry: WorldBookEntry | null;
  dragDropHandlers: {
    allowDrag: (draggingNode: any) => boolean;
    allowDrop: (draggingNode: any, dropNode: any, type: AllowDropType) => boolean;
    handleNodeDrop: (draggingNode: any, dropNode: any, type: Exclude<NodeDropType, 'none'>) => boolean;
  };
  sidebarWidth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  sidebarWidth: Infinity,
});

const emit = defineEmits<{
  (e: 'select-book', id: string): void;
  (e: 'select-entry', bookId: string, entryIndex: number): void;
  (e: 'create-book'): void;
  (e: 'rename-book', id: string): void;
  (e: 'delete-book', id: string): void;
  (e: 'add-entry', bookId: string): void;
  (e: 'duplicate-entry', bookId: string, entryIndex: number): void;
  (e: 'delete-entry', bookId: string, entryIndex: number): void;
  (e: 'copy-book'): void;
  (e: 'export-json'): void;
  (e: 'import-book-file', file: File): void;
  (e: 'clear-all'): void;
}>();

const treeProps = {
  children: 'children',
  label: 'label',
};

const treeData = computed(() => {
  return Object.values(props.collection.books)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((book) => ({
      id: book.id,
      label: book.name,
      icon: 'ph:book-duotone',
      isEntry: false,
      raw: book,
      children: book.entries.map((entry, index) => ({
        id: `${book.id}-${entry.uid}`,
        label: entry.comment || `条目 ${index + 1}`,
        icon: 'ph:note-duotone',
        isEntry: true,
        bookId: book.id,
        entryIndex: index,
        raw: entry,
      })),
    }));
});

const currentNodeKey = computed(() => {
  if (props.selectedEntry && props.activeBookId) {
    return `${props.activeBookId}-${props.selectedEntry.uid}`;
  }
  return props.activeBookId ?? undefined;
});

const handleNodeClick = (data: any) => {
  if (data.isEntry) {
    emit('select-entry', data.bookId, data.entryIndex);
  } else {
    emit('select-book', data.id);
  }
};
</script>

<style scoped>
.sidebar-tree-node.is-constant .sidebar-tree-node-label,
.sidebar-tree-node.is-constant .sidebar-tree-node-icon {
  color: var(--el-color-primary);
}

html.dark .sidebar-tree-node.is-constant .sidebar-tree-node-label,
html.dark .sidebar-tree-node.is-constant .sidebar-tree-node-icon {
  color: var(--el-color-primary-dark-2);
}

.sidebar-tree-node.is-constant.is-disabled .sidebar-tree-node-label,
.sidebar-tree-node.is-constant.is-disabled .sidebar-tree-node-icon {
  color: var(--el-color-primary-light-5);
}

html.dark .sidebar-tree-node.is-constant.is-disabled .sidebar-tree-node-label,
html.dark .sidebar-tree-node.is-constant.is-disabled .sidebar-tree-node-icon {
  color: var(--el-color-primary-light-5);
}
</style>
