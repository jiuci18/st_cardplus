<template>
  <SidebarTreePanel
    title="正则脚本库"
    :tree-data="treeData"
    :tree-props="treeProps"
    :current-node-key="currentNodeKey"
    :draggable="true"
    :allow-drag="props.dragDropHandlers.allowDrag"
    :allow-drop="props.dragDropHandlers.allowDrop"
    :handle-node-drop="props.dragDropHandlers.handleNodeDrop"
    :auto-expand-first="true"
    @node-click="handleNodeClick"
  >
    <template #header-actions>
      <el-tooltip
        content="创建新类别"
        placement="top"
        :show-arrow="false"
        :offset="8"
        :hide-after="0"
      >
        <button
          @click="emit('create-category')"
          class="btn-adv btn-primary-adv sidebar-header-button"
          aria-label="创建新类别"
        >
          <Icon icon="ph:plus-bold" />
        </button>
      </el-tooltip>
    </template>

    <template #node="{ node, data }">
      <div
        class="sidebar-tree-node"
        :class="{ 'is-disabled': data.isScript && data.raw.disabled }"
      >
        <div class="sidebar-tree-node-main">
          <Icon
            :icon="data.icon"
            class="sidebar-tree-node-icon"
          />
          <span class="sidebar-tree-node-label">{{ node.label }}</span>
          <el-tooltip
            v-if="!data.isScript && data.raw.metadata?.source === 'character-card'"
            :content="`来自角色卡: ${data.raw.metadata.characterName || '未知角色'}`"
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
          v-if="!data.isScript"
        >
          <el-tooltip
            content="新增脚本"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="emit('add-script', data.id)"
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
              @click.stop="emit('rename-category', data.id)"
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
              @click.stop="emit('delete-category', data.id)"
              class="sidebar-tree-node-action-button is-danger"
            >
              <Icon icon="ph:trash-duotone" />
            </button>
          </el-tooltip>
        </div>
        <div
          class="sidebar-tree-node-actions"
          v-else
        >
          <el-tooltip
            content="导出"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="emit('export-script', data.scriptId)"
              class="sidebar-tree-node-action-button"
            >
              <Icon icon="ph:export-duotone" />
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
              @click.stop="emit('rename-script', data.scriptId)"
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
              @click.stop="emit('delete-script', data.scriptId)"
              class="sidebar-tree-node-action-button is-danger"
            >
              <Icon icon="ph:trash-duotone" />
            </button>
          </el-tooltip>
        </div>
      </div>
    </template>
  </SidebarTreePanel>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElTooltip } from 'element-plus';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';
import { Icon } from '@iconify/vue';
import SidebarTreePanel from '@/components/ui/layout/common/SidebarTreePanel.vue';
import type { RegexScriptCollection, SillyTavernRegexScript } from '@/composables/regex/types';

interface Props {
  collection: RegexScriptCollection;
  activeCategoryId: string | null;
  selectedScript: SillyTavernRegexScript | null;
  dragDropHandlers: {
    allowDrag: (draggingNode: any) => boolean;
    allowDrop: (draggingNode: any, dropNode: any, type: AllowDropType) => boolean;
    handleNodeDrop: (draggingNode: any, dropNode: any, type: Exclude<NodeDropType, 'none'>) => boolean;
  };
}

const props = withDefaults(defineProps<Props>(), {});

const emit = defineEmits<{
  (e: 'select-category', id: string): void;
  (e: 'select-script', categoryId: string, scriptIndex: number): void;
  (e: 'create-category'): void;
  (e: 'rename-category', id: string): void;
  (e: 'delete-category', id: string): void;
  (e: 'add-script', categoryId: string): void;
  (e: 'export-script', id: string): void;
  (e: 'rename-script', id: string): void;
  (e: 'delete-script', id: string): void;
}>();

const treeProps = {
  children: 'children',
  label: 'label',
};

const treeData = computed(() => {
  return Object.values(props.collection.categories)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((category) => ({
      id: category.id,
      label: category.name,
      icon: 'ph:folder-duotone',
      isScript: false,
      raw: category,
      children: category.scripts.map((script, index) => ({
        id: `${category.id}-${script.id}`,
        label: script.scriptName,
        icon: 'ph:file-code-duotone',
        isScript: true,
        categoryId: category.id,
        scriptIndex: index,
        scriptId: script.id,
        raw: script,
      })),
    }));
});

const currentNodeKey = computed(() => {
  if (props.selectedScript && props.activeCategoryId) {
    return `${props.activeCategoryId}-${props.selectedScript.id}`;
  }
  return props.activeCategoryId ?? undefined;
});

const handleNodeClick = (data: any) => {
  if (data.isScript) {
    emit('select-script', data.categoryId, data.scriptIndex);
  } else {
    emit('select-category', data.id);
  }
};
</script>
