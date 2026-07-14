<template>
  <div class="preset-page">
    <div v-if="isMobileOrTablet" class="preset-mobile-layout">
      <PresetBatchSettings v-if="activeView === 'batch'" :preset="activePreset"
        v-model:checked-prompt-indexes="batchCheckedPromptIndexes" @apply="handleApplyBatchSettings" />
      <PresetEditor v-else v-model:active-tab="activeEditorTab" v-model:editor-state="editorState"
        :active-preset="activePreset" :selected-prompt="selectedPrompt" :selected-regex-index="selectedRegexIndex"
        :has-previous-preset="hasPreviousPreset" :has-next-preset="hasNextPreset"
        :has-previous-prompt="hasPreviousPrompt" :has-next-prompt="hasNextPrompt"
        :save-status="presetAutoSave.saveStatus.value" :auto-save-mode="presetAutoSave.autoSaveMode.value"
        @save="handleManualSave" @toggle-mode="presetAutoSave.toggleAutoSaveMode" @add-clipboard="addEditorToClipboard"
        @open-first-prompt="handleOpenFirstPrompt" @select-regex="selectRegex" @add-regex="handleAddRegexFromEditor"
        @delete-regex="handleDeleteRegexFromEditor" @go-previous="goToPrevious" @go-next="goToNext" />

      <MobileBookmarkDrawer v-model:visible="mobileDrawerVisible" v-model:active-tab="mobilePanelTab"
        :items="mobileBookmarkItems">
        <template #pane-list>
          <PresetList :presets="presets" :active-preset-id="activePresetId" :selected-prompt-index="selectedPromptIndex"
            :selected-regex-index="selectedRegexIndex" :selected-is-header="selectedIsHeader"
            :multi-selected-node-keys="multiSelectedNodeKeys" :drag-drop-handlers="dragDropHandlers"
            :is-batch-settings-active="activeView === 'batch'" @create-preset="createPreset"
            @rename-preset="handleRenamePreset" @delete-preset="handleDeletePreset" @select-preset="handleSelectPreset"
            @select-header="handleSelectHeader" @select-batch-settings="handleSelectBatchSettings"
            @select-prompt="handleSelectPrompt" @select-regex="handleSelectRegex"
            @toggle-prompt-enabled="togglePromptEnabled" @toggle-node-selection="handleToggleNodeSelection"
            @add-prompt="addPrompt" @add-regex="addRegexScript" @duplicate-prompt="duplicatePrompt"
            @delete-prompt="removePrompt" @delete-regex="removeRegexScript" @export-preset="handleExportPreset"
            @import-preset="handleImportPreset" />
        </template>

        <template #pane-clipboard>
          <PresetClipboardPanel :items="clipboardItems" :has-items="hasItems" :can-edit="Boolean(selectedPrompt)"
            @clear-all="clearAll" @move-up="moveUp" @move-down="moveDown" @remove="removeClipboardItem"
            @insert="insertToEditor" @replace="replaceEditor" />
        </template>

        <template #pane-preview>
          <PresetPreviewPanel :active-preset="activePreset" />
        </template>
      </MobileBookmarkDrawer>
    </div>

    <splitpanes v-else class="default-theme preset-split" :horizontal="false">
      <pane min-size="18" size="22">
        <PresetList :presets="presets" :active-preset-id="activePresetId" :selected-prompt-index="selectedPromptIndex"
          :selected-regex-index="selectedRegexIndex" :selected-is-header="selectedIsHeader"
          :multi-selected-node-keys="multiSelectedNodeKeys" :drag-drop-handlers="dragDropHandlers"
          :is-batch-settings-active="activeView === 'batch'" @create-preset="createPreset"
          @rename-preset="handleRenamePreset" @delete-preset="handleDeletePreset" @select-preset="handleSelectPreset"
          @select-header="handleSelectHeader" @select-batch-settings="handleSelectBatchSettings"
          @select-prompt="handleSelectPrompt" @select-regex="handleSelectRegex"
          @toggle-prompt-enabled="togglePromptEnabled" @toggle-node-selection="handleToggleNodeSelection"
          @add-prompt="addPrompt" @add-regex="addRegexScript" @duplicate-prompt="duplicatePrompt"
          @delete-prompt="removePrompt" @delete-regex="removeRegexScript" @export-preset="handleExportPreset"
          @import-preset="handleImportPreset" />
      </pane>

      <pane min-size="35" size="50">
        <PresetBatchSettings v-if="activeView === 'batch'" :preset="activePreset" hide-targets
          v-model:checked-prompt-indexes="batchCheckedPromptIndexes" @apply="handleApplyBatchSettings" />
        <PresetEditor v-else v-model:active-tab="activeEditorTab" v-model:editor-state="editorState"
          :active-preset="activePreset" :selected-prompt="selectedPrompt" :selected-regex-index="selectedRegexIndex"
          :has-previous-preset="hasPreviousPreset" :has-next-preset="hasNextPreset"
          :has-previous-prompt="hasPreviousPrompt" :has-next-prompt="hasNextPrompt"
          :save-status="presetAutoSave.saveStatus.value" :auto-save-mode="presetAutoSave.autoSaveMode.value"
          @save="handleManualSave" @toggle-mode="presetAutoSave.toggleAutoSaveMode"
          @add-clipboard="addEditorToClipboard" @open-first-prompt="handleOpenFirstPrompt" @select-regex="selectRegex"
          @add-regex="handleAddRegexFromEditor" @delete-regex="handleDeleteRegexFromEditor" @go-previous="goToPrevious"
          @go-next="goToNext" />
      </pane>

      <pane min-size="20" size="28">
        <PresetBatchTargetSelector v-if="activeView === 'batch'" :preset="activePreset"
          v-model:checked-prompt-indexes="batchCheckedPromptIndexes" />
        <el-tabs v-else v-model="rightPanelTab" class="right-panel-tabs">
          <el-tab-pane label="剪贴板" name="clipboard">
            <PresetClipboardPanel :items="clipboardItems" :has-items="hasItems" :can-edit="Boolean(selectedPrompt)"
              @clear-all="clearAll" @move-up="moveUp" @move-down="moveDown" @remove="removeClipboardItem"
              @insert="insertToEditor" @replace="replaceEditor" />
          </el-tab-pane>
          <el-tab-pane label="预设预览" name="preview">
            <PresetPreviewPanel :active-preset="activePreset" />
          </el-tab-pane>
        </el-tabs>
      </pane>
    </splitpanes>
  </div>
</template>

<script setup lang="ts">
import PresetEditor from '@/components/preset/PresetEditor.vue';
import PresetBatchSettings from '@/components/preset/PresetBatchSettings.vue';
import PresetBatchTargetSelector from '@/components/preset/PresetBatchTargetSelector.vue';
import PresetClipboardPanel from '@/components/preset/PresetClipboardPanel.vue';
import PresetList from '@/components/preset/PresetList.vue';
import PresetPreviewPanel from '@/components/preset/PresetPreviewPanel.vue';
import MobileBookmarkDrawer from '@/components/ui/common/MobileBookmarkDrawer.vue';
import { usePresetClipboard } from '@/composables/preset/usePresetClipboard';
import { usePresetEditorState } from '@/composables/preset/usePresetEditorState';
import { usePresetPageNavigation } from '@/composables/preset/usePresetPageNavigation';
import { usePresetStore } from '@/composables/preset/usePresetStore';
import type { PresetPromptBatchDraft, PresetPromptBatchField } from '@/composables/preset/usePresetStore';
import { usePresetTreeSelectionDnD } from '@/composables/preset/usePresetTreeSelectionDnD';
import {
  buildPromptOrderList,
  getPromptOrderIdentifiers,
  upsertPromptOrderEntry,
} from '@/composables/preset/utils/presetPromptOrder';
import { getPresetPromptSidebarEntries } from '@/composables/preset/utils/presetTree';
import { useDevice } from '@/composables/useDevice';
import { ElMessage } from 'element-plus';
import { saveFile } from '@/utils/system/fileSave';
import { Pane, Splitpanes } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { v4 as uuidv4 } from 'uuid';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const { isMobileOrTablet } = useDevice();
const mobileBookmarkItems = [
  { key: 'list', label: '预设', icon: 'ph:tree-structure-duotone' },
  { key: 'clipboard', label: '剪贴', icon: 'ph:clipboard-text-duotone' },
  { key: 'preview', label: '预览', icon: 'ph:eye-duotone' },
];
const {
  presets,
  activePresetId,
  activePreset,
  selected,
  selectedPrompt,
  selectRegex,
  selectPreset,
  selectHeader,
  selectPrompt,
  createPreset,
  renamePreset,
  removePreset,
  addPrompt,
  addRegexScript,
  removeRegexScript,
  importPreset,
  duplicatePrompt,
  removePrompt,
  updateHeader,
  updatePrompt,
  togglePromptEnabled,
  reorderPresets,
  updatePromptOrder,
  batchUpdatePrompts,
} = usePresetStore();

const activeView = ref<'editor' | 'batch'>('editor');
const batchCheckedPromptIndexes = ref<number[]>([]);

const {
  clipboardItems,
  hasItems,
  addItem,
  removeItem: removeClipboardItem,
  moveUp,
  moveDown,
  clearAll,
} = usePresetClipboard();

const rightPanelTab = ref<'clipboard' | 'preview'>('clipboard');
const selectedIsHeader = computed(() => selected.value?.type === 'header');
const selectedPromptIndex = computed(() => selected.value?.promptIndex ?? null);
const selectedRegexIndex = computed(() =>
  selected.value?.type === 'regex' ? (selected.value.regexIndex ?? null) : null
);

const { activeEditorTab, editorState, presetAutoSave, handleManualSave } = usePresetEditorState({
  activePreset,
  activePresetId,
  selected,
  selectedPrompt,
  selectedPromptIndex,
  updateHeader,
  updatePrompt,
});

const { multiSelectedNodeKeys, handleToggleNodeSelection, dragDropHandlers } = usePresetTreeSelectionDnD({
  presets,
  reorderPresets,
  updatePromptOrder,
});

const {
  mobileDrawerVisible,
  mobilePanelTab,
  handleRenamePreset,
  handleDeletePreset,
  handleSelectPreset: navigateSelectPreset,
  handleSelectHeader: navigateSelectHeader,
  handleSelectPrompt: navigateSelectPrompt,
  handleSelectRegex: navigateSelectRegex,
  hasPreviousPreset,
  hasNextPreset,
  hasPreviousPrompt,
  hasNextPrompt,
  goToPrevious,
  goToNext,
} = usePresetPageNavigation({
  presets,
  activePresetId,
  activePreset,
  selectedPromptIndex,
  activeEditorTab,
  isMobileOrTablet,
  selectPreset,
  selectHeader,
  selectPrompt,
  selectRegex,
  renamePreset,
  removePreset,
});

const handleSelectPreset = (presetId: string) => {
  activeView.value = 'editor';
  navigateSelectPreset(presetId);
};

const handleSelectHeader = (presetId: string) => {
  activeView.value = 'editor';
  navigateSelectHeader(presetId);
};

const handleSelectPrompt = (presetId: string, promptIndex: number) => {
  activeView.value = 'editor';
  navigateSelectPrompt(presetId, promptIndex);
};

const handleSelectRegex = (presetId: string, regexIndex?: number) => {
  activeView.value = 'editor';
  navigateSelectRegex(presetId, regexIndex);
};

const handleSelectBatchSettings = (presetId: string) => {
  navigateSelectPreset(presetId);
  batchCheckedPromptIndexes.value = [];
  activeView.value = 'batch';
};

const handleApplyBatchSettings = async (
  promptIndexes: number[],
  fields: PresetPromptBatchField[],
  draft: PresetPromptBatchDraft
) => {
  if (!activePreset.value) return;
  const updatedCount = await batchUpdatePrompts(activePreset.value.id, promptIndexes, fields, draft);
  if (updatedCount > 0) {
    ElMessage.success(`已批量更新 ${updatedCount} 个条目`);
  } else {
    ElMessage.warning('没有可更新的条目');
  }
};

const handleExportPreset = async () => {
  if (!activePreset.value) {
    ElMessage.warning('请先选择一个预设');
    return;
  }
  const filename = `${activePreset.value.name || 'preset'}.json`;
  const prompts = (activePreset.value.data.prompts as Record<string, any>[]) || [];
  const existingOrder = getPromptOrderIdentifiers(activePreset.value.data.prompt_order);
  const promptOrder =
    existingOrder.length > 0
      ? JSON.parse(JSON.stringify(activePreset.value.data.prompt_order))
      : upsertPromptOrderEntry(activePreset.value.data.prompt_order, buildPromptOrderList(prompts));
  const exportData = {
    ...activePreset.value.data,
    prompt_order: promptOrder,
  };
  const data = JSON.stringify(exportData, null, 2);
  await saveFile({
    data: new TextEncoder().encode(data),
    fileName: filename,
    mimeType: 'application/json;charset=utf-8',
  });
  ElMessage.success('预设已导出');
};

const handleImportPreset = async (file: File) => {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const nameFromFile = file.name.replace(/\.json$/i, '');
    const presetName =
      parsed && typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : nameFromFile || '导入预设';
    await importPreset(presetName, parsed);
    ElMessage.success('预设导入成功');
  } catch (error) {
    ElMessage.error('导入失败：JSON 无效');
  }
};

const addEditorToClipboard = () => {
  if (!selectedPrompt.value) return;
  addItem({
    id: uuidv4(),
    title: editorState.value.promptName || editorState.value.promptIdentifier || '未命名条目',
    content: editorState.value.promptContent || '',
  });
  ElMessage.success('已加入剪贴板');
};

const insertToEditor = (content: string) => {
  if (!selectedPrompt.value) return;
  if (!editorState.value.promptContent) {
    editorState.value = { ...editorState.value, promptContent: content };
    return;
  }
  editorState.value = { ...editorState.value, promptContent: `${editorState.value.promptContent}\n${content}` };
};

const replaceEditor = (content: string) => {
  if (!selectedPrompt.value) return;
  editorState.value = { ...editorState.value, promptContent: content };
};

const handleAddRegexFromEditor = () => {
  if (!activePresetId.value) return;
  addRegexScript(activePresetId.value);
};

const handleDeleteRegexFromEditor = (regexIndex: number) => {
  if (!activePresetId.value) return;
  removeRegexScript(activePresetId.value, regexIndex);
};

const handleOpenFirstPrompt = () => {
  if (!activePresetId.value || !activePreset.value) return;
  const firstPrompt = getPresetPromptSidebarEntries(activePreset.value)[0];
  if (!firstPrompt) return;
  selectPrompt(activePresetId.value, firstPrompt.promptIndex);
};

watch(
  [activePresetId, selected, activePreset],
  ([presetId, currentSelected, preset]) => {
    if (!presetId || currentSelected) return;
    const prompts = (preset?.data?.prompts as Record<string, any>[]) || [];
    if (prompts.length === 0) return;
    selected.value = { type: 'header' };
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  presetAutoSave.cleanup();
});
</script>

<style scoped>
.preset-page {
  width: 100%;
  height: 100%;
}

.preset-split {
  height: 100%;
}

.right-panel-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 8px;
}

.right-panel-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.right-panel-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.preset-mobile-layout {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
