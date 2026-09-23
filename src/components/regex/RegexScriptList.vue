<template>
  <SidebarTreePanel
    ref="sidebarRef"
    title="正则脚本库"
    :tree-data="treeData"
    :tree-props="treeProps"
    :current-node-key="currentNodeKey"
    :draggable="true"
    :allow-drag="props.dragDropHandlers.allowDrag"
    :allow-drop="props.dragDropHandlers.allowDrop"
    :handle-node-drop="props.dragDropHandlers.handleNodeDrop"
    :auto-expand-first="true"
    :node-menu-items="getNodeMenuItems"
    @node-menu-select="handleNodeMenuSelect"
    @node-click="handleNodeClick"
  >
    <template #header-actions>
      <el-tooltip content="创建新类别" placement="top" :show-arrow="false" :offset="8" :hide-after="0">
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
      <div class="sidebar-tree-node" :class="{ 'is-disabled': data.isScript && data.raw.disabled }">
        <div class="sidebar-tree-node-main">
          <Icon :icon="data.icon" class="sidebar-tree-node-icon" />
          <span class="sidebar-tree-node-label">{{ node.label }}</span>
          <el-tooltip
            v-if="!data.isScript && data.raw.metadata?.source === 'character-card'"
            :content="`来自角色卡: ${data.raw.metadata.characterName || '未知角色'}`"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <Icon icon="ph:user-circle-duotone" class="sidebar-tree-node-source-icon" />
          </el-tooltip>
        </div>
      </div>
    </template>
  </SidebarTreePanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElTooltip } from 'element-plus';
import type { TreeMoveHandlers } from '@/utils/treeMove';
import { Icon } from '@iconify/vue';
import SidebarTreePanel from '@/components/ui/layout/common/SidebarTreePanel.vue';
import type { TreeMenuItem } from '@/components/ui/layout/common/treeMenu';
import type { RegexScriptCollection, SillyTavernRegexScript } from '@/composables/regex/types';

interface Props {
  collection: RegexScriptCollection;
  activeCategoryId: string | null;
  selectedScript: SillyTavernRegexScript | null;
  dragDropHandlers: TreeMoveHandlers;
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

const sidebarRef = ref<InstanceType<typeof SidebarTreePanel> | null>(null);

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
      isScript: false as const,
      raw: category,
      children: category.scripts.map((script, index) => ({
        id: `${category.id}-${script.id}`,
        label: script.scriptName,
        icon: 'ph:file-code-duotone',
        isScript: true as const,
        categoryId: category.id,
        scriptIndex: index,
        scriptId: script.id,
        raw: script,
      })),
    }));
});

type CategoryNode = (typeof treeData.value)[number];
type MenuNode = CategoryNode | CategoryNode['children'][number];

const getSortableSiblings = (data: MenuNode): MenuNode[] =>
  data.isScript ? (treeData.value.find((category) => category.id === data.categoryId)?.children ?? []) : treeData.value;

const getNodeMenuItems = (data: MenuNode): TreeMenuItem[] => {
  const siblings = getSortableSiblings(data);
  const index = siblings.findIndex((node) => node.id === data.id);
  const first = index <= 0;
  const last = index < 0 || index === siblings.length - 1;
  return [
    ...(data.isScript
      ? [
          { key: 'export-script', label: '导出', icon: 'ph:export-duotone' },
          { key: 'rename-script', label: '重命名', icon: 'ph:pencil-simple-duotone' },
        ]
      : [
          { key: 'add-script', label: '新增脚本', icon: 'ph:plus-circle-duotone' },
          { key: 'rename-category', label: '重命名', icon: 'ph:pencil-simple-duotone' },
        ]),
    { key: 'up', label: '上移', divided: true, disabled: first },
    { key: 'down', label: '下移', disabled: last },
    { key: 'top', label: '移至顶端', disabled: first },
    { key: 'bottom', label: '移至末尾', disabled: last },
    {
      key: data.isScript ? 'delete-script' : 'delete-category',
      label: data.isScript ? '删除脚本' : '删除类别',
      icon: 'ph:trash-duotone',
      divided: true,
      danger: true,
    },
  ];
};

const handleNodeMenuSelect = (key: string, data: MenuNode) => {
  const item = getNodeMenuItems(data).find((item) => item.key === key);
  if (!item || item.disabled) return;
  if (data.isScript) {
    if (key === 'export-script') return emit('export-script', data.scriptId);
    if (key === 'rename-script') return emit('rename-script', data.scriptId);
    if (key === 'delete-script') return emit('delete-script', data.scriptId);
  } else {
    if (key === 'add-script') return emit('add-script', data.id);
    if (key === 'rename-category') return emit('rename-category', data.id);
    if (key === 'delete-category') return emit('delete-category', data.id);
  }
  const siblings = getSortableSiblings(data);
  const index = siblings.findIndex((node) => node.id === data.id);
  const target = key === 'top' ? 0 : key === 'bottom' ? siblings.length - 1 : index + (key === 'up' ? -1 : 1);
  if (index < 0 || !siblings[target]) return;
  void sidebarRef.value?.move(data.id, siblings[target].id, target < index ? 'before' : 'after');
};

const currentNodeKey = computed(() => {
  if (props.selectedScript && props.activeCategoryId) {
    return `${props.activeCategoryId}-${props.selectedScript.id}`;
  }
  return props.activeCategoryId ?? undefined;
});

const handleNodeClick = (data: MenuNode) => {
  if (data.isScript) {
    emit('select-script', data.categoryId, data.scriptIndex);
  } else {
    emit('select-category', data.id);
  }
};
</script>
