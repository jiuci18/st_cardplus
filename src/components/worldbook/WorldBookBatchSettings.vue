<template>
  <div class="worldbook-batch-settings">
    <div v-if="!book" class="worldbook-editor-empty-state">
      <el-empty description="请先选择一个世界书进行批量设置" :image-size="80" />
    </div>

    <template v-else>
      <div class="worldbook-batch-toolbar">
        <h3 class="worldbook-batch-title">
          <Icon icon="ph:sliders-horizontal-duotone" class="form-section-icon" />
          批量设置
        </h3>
        <div class="worldbook-batch-toolbar-actions">
          <el-button @click="resetDraft">重置</el-button>
          <el-button type="primary" :disabled="!canApply" @click="applyBatchSettings">
            应用到 {{ checkedEntryKeys.length }} 个条目
          </el-button>
        </div>
      </div>

      <Splitpanes class="default-theme worldbook-batch-panes" push-other-panes>
        <Pane size="64" min-size="42">
          <el-scrollbar class="worldbook-batch-scrollbar">
            <div class="worldbook-batch-left">
              <section class="form-section">
                <h3 class="form-section-title">
                  <Icon icon="ph:check-square-duotone" class="form-section-icon" />
                  选择要覆盖的组件
                </h3>
                <div class="worldbook-batch-overwrite-groups">
                  <div v-for="section in fieldSections" :key="section.title" class="worldbook-batch-overwrite-group">
                    <div class="worldbook-batch-overwrite-group-title">
                      <Icon :icon="section.icon" />
                      {{ section.title }}
                    </div>
                    <el-checkbox v-for="field in section.fields" :key="field.key" v-model="enabledFields[field.key]"
                      class="worldbook-batch-overwrite-checkbox">
                      {{ field.label }}
                    </el-checkbox>
                  </div>
                </div>
              </section>

              <WorldBookEditor :entry="draftEntry" v-model="draftEntry" :all-keywords="allKeywords"
                :current-entry-index="0" :total-entries="1" :is-next-entry-in-different-book="false"
                :is-previous-entry-in-different-book="false" hide-content hide-navigation />
            </div>
          </el-scrollbar>
        </Pane>

        <Pane size="36" min-size="28">
          <div class="worldbook-batch-right">
            <div class="worldbook-batch-right-header">
              <h3 class="form-section-title">
                <Icon icon="ph:tree-structure-duotone" class="form-section-icon" />
                目标条目
              </h3>
              <div class="worldbook-batch-selection-actions">
                <el-button size="small" @click="checkAllEntries">全选</el-button>
                <el-button size="small" @click="clearCheckedEntries">清空</el-button>
              </div>
            </div>
            <el-scrollbar class="worldbook-batch-tree-scrollbar">
              <el-tree ref="entryTreeRef" :data="entryTreeData" :props="treeProps" node-key="id" show-checkbox
                default-expand-all :empty-text="book.entries.length === 0 ? '当前世界书没有条目' : '无条目'"
                @check="syncCheckedEntries">
                <template #default="{ node, data }">
                  <div class="worldbook-batch-tree-node" :class="{ 'is-disabled': data.raw?.disable }">
                    <Icon :icon="data.icon" class="sidebar-tree-node-icon" />
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
import { ElButton, ElCheckbox, ElEmpty, ElMessage, ElScrollbar, ElTree } from 'element-plus';
import { Pane, Splitpanes } from 'splitpanes';
import type { WorldBook, WorldBookEntry } from '@/types/worldbook';
import { createDefaultEntryData } from '@/composables/worldbook/entry/useWorldBookEntryData';
import WorldBookEditor from './WorldBookEditor.vue';

type BatchField = {
  key: keyof WorldBookEntry | 'scanScope';
  label: string;
};

const SCAN_SCOPE_FIELDS = [
  'matchPersonaDescription',
  'matchCharacterDescription',
  'matchCharacterPersonality',
  'matchCharacterDepthPrompt',
  'matchScenario',
  'matchCreatorNotes',
] as const satisfies ReadonlyArray<keyof WorldBookEntry>;

const props = defineProps<{
  book: WorldBook | null;
  allKeywords?: string[];
}>();

const emit = defineEmits<{
  (e: 'apply', entries: WorldBookEntry[]): void;
}>();

const fieldSections: Array<{ title: string; icon: string; fields: BatchField[] }> = [
  {
    title: '基本信息',
    icon: 'ph:info-duotone',
    fields: [
      { key: 'comment', label: '标题/备注' },
      { key: 'key', label: '主要关键词' },
      { key: 'addMemo', label: '插入时附带备注' },
    ],
  },
  {
    title: '触发, 激活, 插入与顺序',
    icon: 'ph:radio-button-duotone',
    fields: [
      { key: 'constant', label: '常驻' },
      { key: 'disable', label: '禁用' },
      { key: 'useProbability', label: '启用概率' },
      { key: 'probability', label: '触发概率' },
      { key: 'order', label: '顺序' },
      { key: 'position', label: '插入位置' },
      { key: 'outletName', label: '出口名称' },
      { key: 'depth', label: '插入深度' },
      { key: 'excludeRecursion', label: '不可递归' },
      { key: 'preventRecursion', label: '阻止后续递归' },
      { key: 'delayUntilRecursion', label: '仅在递归时激活' },
      { key: 'ignoreBudget', label: '无视回复限额' },
    ],
  },
  {
    title: '扫描与匹配',
    icon: 'ph:scan-duotone',
    fields: [
      { key: 'caseSensitive', label: '大小写敏感' },
      { key: 'matchWholeWords', label: '匹配整个单词' },
      { key: 'vectorized', label: '启用向量匹配' },
      { key: 'scanDepth', label: '扫描深度' },
      { key: 'keysecondary', label: '次要关键词' },
      { key: 'selectiveLogic', label: '次要关键词逻辑' },
      { key: 'selective', label: '启用次要逻辑' },
      { key: 'scanScope', label: '扫描配置' },
    ],
  },
  {
    title: '递归与分组',
    icon: 'ph:graph-duotone',
    fields: [
      { key: 'group', label: '所属收录组' },
      { key: 'groupPriority', label: '组内优先级/权重' },
      { key: 'groupOverride', label: '优先组内选择' },
      { key: 'useGroupScoring', label: '启用组内评分' },
    ],
  },
  {
    title: '定时效果',
    icon: 'ph:timer-duotone',
    fields: [
      { key: 'sticky', label: '粘滞回合数' },
      { key: 'cooldown', label: '冷却回合数' },
      { key: 'delay', label: '延迟激活' },
    ],
  },
  {
    title: '其他',
    icon: 'ph:puzzle-piece-duotone',
    fields: [{ key: 'automationId', label: '自动化ID' }],
  },
];

const fields = fieldSections.flatMap((section) => section.fields);
const enabledFields = ref<Record<string, boolean>>(Object.fromEntries(fields.map((field) => [field.key, false])));
const draftEntry = ref<WorldBookEntry>(createDefaultEntryData(Date.now()));
const entryTreeRef = ref<InstanceType<typeof ElTree> | null>(null);
const checkedEntryKeys = ref<string[]>([]);

const treeProps = {
  children: 'children',
  label: 'label',
};

const entryKeyOf = (entry: WorldBookEntry, index: number) => `entry-${entry.uid ?? entry.id ?? index}`;

const entryTreeData = computed(() => {
  if (!props.book) return [];
  return [
    {
      id: `book-${props.book.id}`,
      label: props.book.name,
      icon: 'ph:book-duotone',
      children: props.book.entries.map((entry, index) => ({
        id: entryKeyOf(entry, index),
        label: entry.comment || `条目 ${index + 1}`,
        icon: 'ph:note-duotone',
        entryIndex: index,
        raw: entry,
      })),
    },
  ];
});

const enabledFieldKeys = computed(
  () => fields.map((field) => field.key).filter((key) => enabledFields.value[key]) as Array<keyof WorldBookEntry | 'scanScope'>
);
const canApply = computed(() => enabledFieldKeys.value.length > 0 && checkedEntryKeys.value.length > 0);

const syncCheckedEntries = () => {
  const keys = entryTreeRef.value?.getCheckedKeys(true) ?? [];
  checkedEntryKeys.value = keys.map(String);
};

const checkAllEntries = () => {
  const keys = props.book?.entries.map((entry, index) => entryKeyOf(entry, index)) ?? [];
  entryTreeRef.value?.setCheckedKeys(keys, false);
  checkedEntryKeys.value = keys;
};

const clearCheckedEntries = () => {
  entryTreeRef.value?.setCheckedKeys([], false);
  checkedEntryKeys.value = [];
};

const resetDraft = () => {
  draftEntry.value = createDefaultEntryData(Date.now());
  enabledFields.value = Object.fromEntries(fields.map((field) => [field.key, false]));
};

const copyFieldValue = (fieldKey: keyof WorldBookEntry) => {
  const value = draftEntry.value[fieldKey];
  return Array.isArray(value) ? [...value] : value;
};

const applyBatchSettings = () => {
  if (!props.book || !canApply.value) return;

  const checked = new Set(checkedEntryKeys.value);
  const nextEntries = props.book.entries.map((entry, index) => {
    if (!checked.has(entryKeyOf(entry, index))) return entry;

    const nextEntry = { ...entry } as WorldBookEntry;
    enabledFieldKeys.value.forEach((fieldKey) => {
      if (fieldKey === 'scanScope') {
        SCAN_SCOPE_FIELDS.forEach((scopeKey) => {
          (nextEntry as any)[scopeKey] = draftEntry.value[scopeKey];
        });
        return;
      }
      (nextEntry as any)[fieldKey] = copyFieldValue(fieldKey);
      if (fieldKey === 'position' && draftEntry.value.position === 4) {
        nextEntry.role = draftEntry.value.role;
      }
      if (fieldKey === 'position' && draftEntry.value.position !== 4) {
        nextEntry.role = null;
      }
    });
    return nextEntry;
  });

  emit('apply', nextEntries);
  ElMessage.success(`已批量更新 ${checkedEntryKeys.value.length} 个条目`);
};

watch(
  () => props.book?.id,
  () => {
    clearCheckedEntries();
  }
);
</script>

<style scoped>
.worldbook-batch-settings {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.worldbook-batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.worldbook-batch-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.worldbook-batch-toolbar-actions,
.worldbook-batch-selection-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.worldbook-batch-panes {
  flex: 1;
  min-height: 0;
}

.worldbook-batch-scrollbar,
.worldbook-batch-tree-scrollbar {
  height: 100%;
}

.worldbook-batch-left {
  min-height: 100%;
}

.worldbook-batch-overwrite-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.worldbook-batch-overwrite-group {
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color-page);
}

.worldbook-batch-overwrite-group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
  font-weight: 600;
  font-size: 13px;
}

.worldbook-batch-overwrite-checkbox {
  display: inline-flex;
  margin-right: 12px;
  margin-bottom: 4px;
}

.worldbook-batch-right {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-page);
}

.worldbook-batch-right-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.worldbook-batch-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.worldbook-batch-tree-node.is-disabled {
  color: var(--el-text-color-disabled);
}

@media (max-width: 768px) {
  .worldbook-batch-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
