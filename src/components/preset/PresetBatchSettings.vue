<template>
  <div class="preset-batch-settings">
    <div v-if="!preset" class="preset-batch-empty-state">
      <el-empty description="请先选择一个预设进行批量设置" :image-size="80" />
    </div>

    <template v-else>
      <div class="preset-batch-toolbar">
        <h3 class="preset-batch-title">
          <Icon icon="ph:sliders-horizontal-duotone" />
          批量设置
        </h3>
        <div class="preset-batch-toolbar-actions">
          <el-button @click="resetDraft">重置</el-button>
          <el-button type="primary" :disabled="!canApply" @click="applySettings">
            应用到 {{ checkedPromptIndexes.length }} 个条目
          </el-button>
        </div>
      </div>

      <Splitpanes class="default-theme preset-batch-panes" push-other-panes>
        <Pane :size="hideTargets ? 100 : 64" min-size="42">
          <el-scrollbar class="preset-batch-scrollbar">
            <div class="preset-batch-left">
              <section class="preset-batch-section">
                <h4>选择要覆盖的设置</h4>
                <el-checkbox v-for="field in fields" :key="field.key" v-model="enabledFields[field.key]">
                  {{ field.label }}
                </el-checkbox>
              </section>

              <el-form label-position="top" class="preset-batch-form">
                <div class="preset-batch-grid">
                  <el-form-item label="激活">
                    <el-switch v-model="draft.enabled" active-text="激活" />
                  </el-form-item>
                  <el-form-item label="Marker">
                    <el-switch v-model="draft.marker" active-text="marker" />
                  </el-form-item>
                  <el-form-item label="Role">
                    <el-select v-model="draft.role">
                      <el-option label="系统（system）" value="system" />
                      <el-option label="用户（user）" value="user" />
                      <el-option label="助手（assistant）" value="assistant" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="注入位置">
                    <el-select v-model="draft.injection_position">
                      <el-option label="0（相对）" :value="0" />
                      <el-option label="1（聊天中）" :value="1" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="注入深度">
                    <el-input-number v-model="draft.injection_depth" :min="0" controls-position="right" />
                  </el-form-item>
                  <el-form-item label="注入顺序">
                    <el-input-number v-model="draft.injection_order" :min="0" controls-position="right" />
                  </el-form-item>
                  <el-form-item label="禁止覆盖">
                    <el-switch v-model="draft.forbid_overrides" />
                  </el-form-item>
                </div>
                <el-form-item label="触发器列表">
                  <el-input v-model="injectionTriggerText" type="textarea" :rows="4" placeholder="每行一个触发词" />
                </el-form-item>
              </el-form>
            </div>
          </el-scrollbar>
        </Pane>

        <Pane v-if="!hideTargets" size="36" min-size="28">
          <div class="preset-batch-right">
            <div class="preset-batch-target-header">
              <h4>目标条目</h4>
              <div>
                <el-button size="small" @click="checkAllPrompts">全选</el-button>
                <el-button size="small" @click="clearCheckedPrompts">清空</el-button>
              </div>
            </div>
            <el-scrollbar class="preset-batch-tree-scrollbar">
              <el-tree ref="promptTreeRef" :data="promptTreeData" :props="treeProps" node-key="id" show-checkbox
                default-expand-all :empty-text="'当前预设没有条目'" @check="syncCheckedPrompts">
                <template #default="{ node, data }">
                  <div class="preset-batch-tree-node" :class="{ 'is-disabled': data.disabled }">
                    <Icon :icon="data.icon" />
                    <span>{{ node.label }}</span>
                  </div>
                </template>
              </el-tree>
            </el-scrollbar>
          </div>
        </Pane>
      </Splitpanes>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { ElButton, ElCheckbox, ElEmpty, ElForm, ElFormItem, ElInput, ElInputNumber, ElOption, ElScrollbar, ElSelect, ElSwitch, ElTree } from 'element-plus';
import { Pane, Splitpanes } from 'splitpanes';
import type { StoredPresetFile } from '@/database/db';
import type { PresetPromptBatchDraft, PresetPromptBatchField } from '@/composables/preset/usePresetStore';
import { getPresetPromptSidebarEntries } from '@/composables/preset/utils/presetTree';
import { getPromptOrderIdentifiers } from '@/composables/preset/utils/presetPromptOrder';

type BatchField = { key: PresetPromptBatchField; label: string };

const props = withDefaults(defineProps<{
  preset: StoredPresetFile | null;
  hideTargets?: boolean;
  checkedPromptIndexes?: number[];
}>(), {
  hideTargets: false,
  checkedPromptIndexes: () => [],
});

const emit = defineEmits<{
  (e: 'apply', promptIndexes: number[], fields: PresetPromptBatchField[], draft: PresetPromptBatchDraft): void;
  (e: 'update:checkedPromptIndexes', indexes: number[]): void;
}>();

const fields: BatchField[] = [
  { key: 'enabled', label: '激活' },
  { key: 'marker', label: 'Marker' },
  { key: 'role', label: 'Role' },
  { key: 'injection_position', label: '注入位置' },
  { key: 'injection_depth', label: '注入深度' },
  { key: 'injection_order', label: '注入顺序' },
  { key: 'forbid_overrides', label: '禁止覆盖' },
  { key: 'injection_trigger', label: '触发器列表' },
];

const createDraft = (): PresetPromptBatchDraft => ({
  enabled: true,
  marker: false,
  role: 'system',
  injection_position: 0,
  injection_depth: 4,
  injection_order: 100,
  forbid_overrides: false,
  injection_trigger: [],
});

const enabledFields = ref<Record<PresetPromptBatchField, boolean>>(
  Object.fromEntries(fields.map((field) => [field.key, false])) as Record<PresetPromptBatchField, boolean>
);
const draft = ref<PresetPromptBatchDraft>(createDraft());
const promptTreeRef = ref<InstanceType<typeof ElTree> | null>(null);
const checkedPromptIndexes = ref<number[]>([]);
const treeProps = { children: 'children', label: 'label', disabled: 'disabled' };

const injectionTriggerText = computed({
  get: () => (draft.value.injection_trigger || []).join('\n'),
  set: (value: string) => {
    draft.value.injection_trigger = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  },
});

const promptTreeData = computed(() => {
  if (!props.preset) return [];
  const inserted = new Set(getPromptOrderIdentifiers(props.preset.data.prompt_order));
  const entries = getPresetPromptSidebarEntries(props.preset);
  const toNode = (entry: (typeof entries)[number]) => {
    const identifier = typeof entry.prompt.identifier === 'string' ? entry.prompt.identifier : '';
    const disabled = identifier === 'dialogueExamples' || identifier === 'chatHistory';
    return {
      id: `prompt-${entry.promptIndex}`,
      label: entry.prompt.name || entry.identifier || `条目 ${entry.promptIndex + 1}`,
      icon: 'ph:note-duotone',
      promptIndex: entry.promptIndex,
      disabled,
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
      ...(remainingNodes.length > 0
        ? [{ id: 'uninserted', label: '未插入条目', icon: 'ph:folder-dashed-duotone', children: remainingNodes }]
        : []),
    ],
  }];
});

const enabledFieldKeys = computed(() => fields.filter((field) => enabledFields.value[field.key]).map((field) => field.key));
const canApply = computed(() => enabledFieldKeys.value.length > 0 && checkedPromptIndexes.value.length > 0);

const syncCheckedPrompts = () => {
  const keys = promptTreeRef.value?.getCheckedKeys(true) ?? [];
  checkedPromptIndexes.value = keys
    .map(String)
    .filter((key) => key.startsWith('prompt-'))
    .map((key) => Number(key.slice('prompt-'.length)))
    .filter(Number.isInteger);
  emit('update:checkedPromptIndexes', checkedPromptIndexes.value);
};

const checkAllPrompts = () => {
  const keys = getPresetPromptSidebarEntries(props.preset as StoredPresetFile)
    .filter((entry) => !['dialogueExamples', 'chatHistory'].includes(String(entry.prompt.identifier || '')))
    .map((entry) => `prompt-${entry.promptIndex}`);
  promptTreeRef.value?.setCheckedKeys(keys, false);
  syncCheckedPrompts();
};

const clearCheckedPrompts = () => {
  promptTreeRef.value?.setCheckedKeys([], false);
  checkedPromptIndexes.value = [];
  emit('update:checkedPromptIndexes', []);
};

const resetDraft = () => {
  draft.value = createDraft();
  enabledFields.value = Object.fromEntries(fields.map((field) => [field.key, false])) as Record<PresetPromptBatchField, boolean>;
};

const applySettings = () => {
  if (!canApply.value) return;
  emit('apply', checkedPromptIndexes.value, enabledFieldKeys.value, {
    ...draft.value,
    injection_trigger: [...(draft.value.injection_trigger || [])],
  });
};

watch(
  () => props.preset?.id,
  () => clearCheckedPrompts()
);

watch(
  () => props.checkedPromptIndexes,
  (indexes) => {
    if (indexes.join(',') === checkedPromptIndexes.value.join(',')) return;
    checkedPromptIndexes.value = [...indexes];
    if (!props.hideTargets) {
      promptTreeRef.value?.setCheckedKeys(indexes.map((index) => `prompt-${index}`), false);
    }
  },
  { deep: true }
);
</script>

<style scoped>
.preset-batch-settings,
.preset-batch-empty-state {
  height: 100%;
  min-height: 0;
}

.preset-batch-settings {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.preset-batch-empty-state {
  display: grid;
  place-items: center;
}

.preset-batch-toolbar,
.preset-batch-target-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.preset-batch-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
}

.preset-batch-toolbar-actions {
  display: inline-flex;
  gap: 8px;
}

.preset-batch-panes,
.preset-batch-scrollbar,
.preset-batch-tree-scrollbar {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.preset-batch-left {
  padding: 16px;
}

.preset-batch-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.preset-batch-section h4 {
  width: 100%;
  margin: 0 0 4px;
}

.preset-batch-form {
  padding: 4px;
}

.preset-batch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0 16px;
}

.preset-batch-right {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-page);
}

.preset-batch-target-header h4 {
  margin: 0;
}

.preset-batch-target-header>div {
  display: inline-flex;
  gap: 8px;
}

.preset-batch-tree-node {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.preset-batch-tree-node.is-disabled {
  color: var(--el-text-color-disabled);
}

@media (max-width: 768px) {
  .preset-batch-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
