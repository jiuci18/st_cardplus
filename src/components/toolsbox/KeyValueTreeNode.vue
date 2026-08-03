<script setup lang="ts">
import type { KeyValueNode } from '@/types/key-value-tree';
import { ArrowDown, ArrowRight, Delete, Document, Folder, Plus } from '@element-plus/icons-vue';
import { computed, ref } from 'vue';

interface Props {
  node: KeyValueNode;
  depth?: number;
  errors?: Readonly<Record<string, string>>;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  errors: () => ({}),
});

const emit = defineEmits<{
  updateKey: [nodeId: string, key: string];
  updateValue: [nodeId: string, value: string];
  addChild: [nodeId: string];
  remove: [nodeId: string];
}>();

const isExpanded = ref(props.depth < 2);
const isGroup = computed(() => props.node.children !== undefined);
const errorMessage = computed(() => props.errors[props.node.id] ?? '');

function toggleExpanded(): void {
  if (isGroup.value) isExpanded.value = !isExpanded.value;
}

function addChild(): void {
  emit('addChild', props.node.id);
  isExpanded.value = true;
}
</script>

<template>
  <div class="key-value-tree-node">
    <div class="node-row" :class="{ 'has-error': errorMessage }">
      <button v-if="isGroup" class="expand-button" type="button" :aria-label="isExpanded ? '折叠节点' : '展开节点'"
        @click="toggleExpanded">
        <ArrowDown v-if="isExpanded" />
        <ArrowRight v-else />
      </button>
      <span v-else class="expand-placeholder" />

      <Folder v-if="isGroup" class="node-type-icon" />
      <Document v-else class="node-type-icon" />

      <div class="node-editor">
        <el-input class="key-input" :model-value="node.key" placeholder="键（留空表示数组项）" size="small" :validate-event="false"
          @update:model-value="emit('updateKey', node.id, $event)" />

        <span class="separator">:</span>

        <span v-if="isGroup" class="group-label">对象</span>
        <el-input v-else class="value-input" :model-value="node.value" type="textarea"
          :autosize="{ minRows: 2, maxRows: 8 }" resize="none" placeholder="值（支持多行文本）"
          @update:model-value="emit('updateValue', node.id, $event)" />
      </div>

      <div class="node-actions">
        <el-tooltip content="添加子节点" placement="top">
          <el-button :icon="Plus" size="small" circle @click="addChild" />
        </el-tooltip>
        <el-tooltip content="删除节点" placement="top">
          <el-button :icon="Delete" size="small" circle type="danger" plain @click="emit('remove', node.id)" />
        </el-tooltip>
      </div>
    </div>

    <p v-if="errorMessage" class="node-error">{{ errorMessage }}</p>

    <div v-if="isGroup && isExpanded" class="children">
      <KeyValueTreeNode v-for="child in node.children ?? []" :key="child.id" :node="child" :depth="depth + 1"
        :errors="errors" @update-key="(nodeId, key) => emit('updateKey', nodeId, key)"
        @update-value="(nodeId, value) => emit('updateValue', nodeId, value)" @add-child="emit('addChild', $event)"
        @remove="emit('remove', $event)" />
      <div v-if="node.children?.length === 0" class="empty-group">空对象 · 点击当前节点的“＋”添加内容</div>
    </div>
  </div>
</template>

<style scoped>
.key-value-tree-node {
  font-size: 13px;
}

.node-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 5px;
  border: 1px solid transparent;
  border-radius: 6px;
}

.node-row:hover {
  background: var(--el-fill-color-light);
}

.node-row.has-error {
  border-color: var(--el-color-danger-light-5);
  background: var(--el-color-danger-light-9);
}

.expand-button,
.expand-placeholder {
  width: 18px;
  height: 24px;
  flex: 0 0 18px;
}

.expand-button {
  display: flex;
  align-items: center;
  padding: 2px;
  border: 0;
  color: var(--el-text-color-secondary);
  background: transparent;
  cursor: pointer;
}

.node-type-icon {
  width: 16px;
  height: 24px;
  flex: 0 0 16px;
  color: var(--el-text-color-secondary);
}

.node-editor {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.key-input {
  width: 150px;
  flex: 0 1 150px;
}

.separator,
.group-label {
  line-height: 24px;
  color: var(--el-text-color-secondary);
}

.group-label {
  font-size: 12px;
}

.value-input {
  min-width: 140px;
  flex: 1;
}

.node-actions {
  display: flex;
  gap: 4px;
  flex: 0 0 auto;
}

.node-error {
  margin: 0 0 2px 64px;
  color: var(--el-color-danger);
  font-size: 12px;
}

.children {
  margin-left: 26px;
  padding-left: 8px;
  border-left: 1px dashed var(--el-border-color);
}

.empty-group {
  padding: 6px 12px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

@media (max-width: 768px) {
  .node-row {
    flex-wrap: wrap;
  }

  .node-editor {
    flex-basis: calc(100% - 52px);
    flex-wrap: wrap;
  }

  .key-input {
    width: 120px;
    flex-basis: 120px;
  }

  .value-input {
    flex-basis: 100%;
    margin-left: 0;
  }

  .node-actions {
    margin-left: 58px;
  }

  .children {
    margin-left: 14px;
  }
}
</style>
