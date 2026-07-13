<template>
  <div class="preset-batch-target-selector">
    <div class="preset-batch-target-header">
      <h3>目标条目</h3>
      <div>
        <el-button size="small" @click="checkAllPrompts">全选</el-button>
        <el-button size="small" @click="clearCheckedPrompts">清空</el-button>
      </div>
    </div>
    <el-scrollbar class="preset-batch-target-scrollbar">
      <el-tree ref="treeRef" :data="treeData" :props="treeProps" node-key="id" show-checkbox default-expand-all
        empty-text="当前预设没有条目" @check="syncCheckedPrompts">
        <template #default="{ node, data }">
          <div class="preset-batch-target-node" :class="{ 'is-disabled': data.disabled }">
            <Icon :icon="data.icon" />
            <span>{{ node.label }}</span>
          </div>
        </template>
      </el-tree>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { ElButton, ElScrollbar, ElTree } from 'element-plus';
import type { StoredPresetFile } from '@/database/db';
import { getPresetPromptSidebarEntries } from '@/composables/preset/utils/presetTree';
import { getPromptOrderIdentifiers } from '@/composables/preset/utils/presetPromptOrder';

const props = defineProps<{
  preset: StoredPresetFile | null;
  checkedPromptIndexes: number[];
}>();

const emit = defineEmits<{
  (e: 'update:checkedPromptIndexes', indexes: number[]): void;
}>();

const treeRef = ref<InstanceType<typeof ElTree> | null>(null);
const treeProps = { children: 'children', label: 'label', disabled: 'disabled' };

const treeData = computed(() => {
  if (!props.preset) return [];
  const inserted = new Set(getPromptOrderIdentifiers(props.preset.data.prompt_order));
  const entries = getPresetPromptSidebarEntries(props.preset);
  const toNode = (entry: (typeof entries)[number]) => {
    const identifier = String(entry.prompt.identifier || '');
    return {
      id: `prompt-${entry.promptIndex}`,
      label: entry.prompt.name || entry.identifier || `条目 ${entry.promptIndex + 1}`,
      icon: 'ph:note-duotone',
      disabled: identifier === 'dialogueExamples' || identifier === 'chatHistory',
    };
  };
  const insertedNodes = entries.filter((entry) => inserted.has(entry.identifier)).map(toNode);
  const remainingNodes = entries.filter((entry) => !inserted.has(entry.identifier)).map(toNode);
  return [{
    id: `preset-${props.preset.id}`,
    label: props.preset.name,
    icon: 'ph:folder-duotone',
    children: [
      ...insertedNodes,
      ...(remainingNodes.length ? [{ id: 'uninserted', label: '未插入条目', icon: 'ph:folder-dashed-duotone', children: remainingNodes }] : []),
    ],
  }];
});

const syncCheckedPrompts = () => {
  const indexes = (treeRef.value?.getCheckedKeys(true) ?? [])
    .map(String)
    .filter((key) => key.startsWith('prompt-'))
    .map((key) => Number(key.slice('prompt-'.length)))
    .filter(Number.isInteger);
  emit('update:checkedPromptIndexes', indexes);
};

const checkAllPrompts = () => {
  const keys = getPresetPromptSidebarEntries(props.preset as StoredPresetFile)
    .filter((entry) => !['dialogueExamples', 'chatHistory'].includes(String(entry.prompt.identifier || '')))
    .map((entry) => `prompt-${entry.promptIndex}`);
  treeRef.value?.setCheckedKeys(keys, false);
  syncCheckedPrompts();
};

const clearCheckedPrompts = () => {
  treeRef.value?.setCheckedKeys([], false);
  emit('update:checkedPromptIndexes', []);
};

watch(
  () => props.checkedPromptIndexes,
  (indexes) => treeRef.value?.setCheckedKeys(indexes.map((index) => `prompt-${index}`), false),
  { deep: true, immediate: true }
);
</script>

<style scoped>
.preset-batch-target-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color-page);
}

.preset-batch-target-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.preset-batch-target-header h3 {
  margin: 0;
  font-size: 16px;
}

.preset-batch-target-header>div {
  display: inline-flex;
  gap: 8px;
}

.preset-batch-target-scrollbar {
  flex: 1;
  min-height: 0;
}

.preset-batch-target-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.preset-batch-target-node.is-disabled {
  color: var(--el-text-color-disabled);
}
</style>
