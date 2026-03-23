<template>
  <div class="preset-page">
    <div v-if="isMobileOrTablet" class="preset-mobile-layout">
      <PresetEditor v-model:active-tab="activeEditorTab" v-model:editor-state="editorState"
        :active-preset="activePreset" :selected-prompt="selectedPrompt" :selected-regex-index="selectedRegexIndex"
        :has-previous-preset="hasPreviousPreset" :has-next-preset="hasNextPreset"
        :has-previous-prompt="hasPreviousPrompt" :has-next-prompt="hasNextPrompt"
        :save-status="presetAutoSave.saveStatus.value" :auto-save-mode="presetAutoSave.autoSaveMode.value"
        @save="handleManualSave" @toggle-mode="presetAutoSave.toggleAutoSaveMode" @add-clipboard="addEditorToClipboard"
        @open-first-prompt="handleOpenFirstPrompt" @select-regex="selectRegex" @add-regex="handleAddRegexFromEditor"
        @delete-regex="handleDeleteRegexFromEditor" @go-previous="goToPrevious" @go-next="goToNext" />

      <div class="mobile-bookmark-group">
        <button type="button" class="mobile-bookmark-btn"
          :class="{ active: mobilePanelTab === 'list' && mobileDrawerVisible }" @click="openMobilePanel('list')">
          <Icon icon="ph:tree-structure-duotone" class="bookmark-icon" />
          预设
        </button>
        <button type="button" class="mobile-bookmark-btn"
          :class="{ active: mobilePanelTab === 'clipboard' && mobileDrawerVisible }"
          @click="openMobilePanel('clipboard')">
          <Icon icon="ph:clipboard-text-duotone" class="bookmark-icon" />
          剪贴
        </button>
        <button type="button" class="mobile-bookmark-btn"
          :class="{ active: mobilePanelTab === 'preview' && mobileDrawerVisible }" @click="openMobilePanel('preview')">
          <Icon icon="ph:eye-duotone" class="bookmark-icon" />
          预览
        </button>
      </div>

      <el-drawer v-model="mobileDrawerVisible" direction="rtl" :with-header="false" size="86%" append-to-body
        class="preset-mobile-drawer">
        <div class="mobile-drawer-inner">
          <div class="mobile-drawer-header">
            <div class="mobile-drawer-title">{{ mobilePanelTitle }}</div>
            <el-button size="small" text @click="mobileDrawerVisible = false">
              关闭
            </el-button>
          </div>
          <div class="mobile-drawer-tabs">
            <button type="button" class="mobile-drawer-tab" :class="{ active: mobilePanelTab === 'list' }"
              @click="mobilePanelTab = 'list'">
              预设
            </button>
            <button type="button" class="mobile-drawer-tab" :class="{ active: mobilePanelTab === 'clipboard' }"
              @click="mobilePanelTab = 'clipboard'">
              剪贴
            </button>
            <button type="button" class="mobile-drawer-tab" :class="{ active: mobilePanelTab === 'preview' }"
              @click="mobilePanelTab = 'preview'">
              预览
            </button>
          </div>

          <div class="mobile-drawer-body">
            <div v-show="mobilePanelTab === 'list'" class="mobile-drawer-pane">
              <PresetList :presets="presets" :active-preset-id="activePresetId"
                :selected-prompt-index="selectedPromptIndex" :selected-regex-index="selectedRegexIndex"
                :selected-is-header="selectedIsHeader" :multi-selected-node-keys="multiSelectedNodeKeys"
                :drag-drop-handlers="dragDropHandlers" @create-preset="createPreset" @rename-preset="handleRenamePreset"
                @delete-preset="handleDeletePreset" @select-preset="handleSelectPreset"
                @select-header="handleSelectHeader" @select-prompt="handleSelectPrompt"
                @select-regex="handleSelectRegex" @toggle-prompt-enabled="togglePromptEnabled"
                @toggle-node-selection="handleToggleNodeSelection" @add-prompt="addPrompt" @add-regex="addRegexScript"
                @duplicate-prompt="duplicatePrompt" @delete-prompt="removePrompt" @delete-regex="removeRegexScript"
                @export-preset="handleExportPreset" @import-preset="handleImportPreset" />
            </div>

            <div v-show="mobilePanelTab === 'clipboard'" class="mobile-drawer-pane">
              <PresetClipboardPanel :items="clipboardItems" :has-items="hasItems" :can-edit="Boolean(selectedPrompt)"
                @clear-all="clearAll" @move-up="moveUp" @move-down="moveDown" @remove="removeClipboardItem"
                @insert="insertToEditor" @replace="replaceEditor" />
            </div>

            <div v-show="mobilePanelTab === 'preview'" class="mobile-drawer-pane">
              <PresetPreviewPanel :active-preset="activePreset" />
            </div>
          </div>
        </div>
      </el-drawer>
    </div>

    <splitpanes v-else class="default-theme preset-split" :horizontal="false">
      <pane min-size="18" size="22">
        <PresetList :presets="presets" :active-preset-id="activePresetId" :selected-prompt-index="selectedPromptIndex"
          :selected-regex-index="selectedRegexIndex" :selected-is-header="selectedIsHeader"
          :multi-selected-node-keys="multiSelectedNodeKeys" :drag-drop-handlers="dragDropHandlers"
          @create-preset="createPreset" @rename-preset="handleRenamePreset" @delete-preset="handleDeletePreset"
          @select-preset="handleSelectPreset" @select-header="handleSelectHeader" @select-prompt="handleSelectPrompt"
          @select-regex="handleSelectRegex" @toggle-prompt-enabled="togglePromptEnabled"
          @toggle-node-selection="handleToggleNodeSelection" @add-prompt="addPrompt" @add-regex="addRegexScript"
          @duplicate-prompt="duplicatePrompt" @delete-prompt="removePrompt" @delete-regex="removeRegexScript"
          @export-preset="handleExportPreset" @import-preset="handleImportPreset" />
      </pane>

      <pane min-size="35" size="50">
        <PresetEditor v-model:active-tab="activeEditorTab" v-model:editor-state="editorState"
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
        <el-tabs v-model="rightPanelTab" class="right-panel-tabs">
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
import PresetClipboardPanel from '@/components/preset/PresetClipboardPanel.vue';
import PresetList from '@/components/preset/PresetList.vue';
import PresetPreviewPanel from '@/components/preset/PresetPreviewPanel.vue';
import { usePresetClipboard } from '@/composables/preset/usePresetClipboard';
import { usePresetEditorState } from '@/composables/preset/usePresetEditorState';
import { usePresetPageNavigation } from '@/composables/preset/usePresetPageNavigation';
import { usePresetStore } from '@/composables/preset/usePresetStore';
import { usePresetTreeSelectionDnD } from '@/composables/preset/usePresetTreeSelectionDnD';
import {
  buildPromptOrderList,
  getPromptOrderIdentifiers,
  upsertPromptOrderEntry,
} from '@/composables/preset/utils/presetPromptOrder';
import { useDevice } from '@/composables/useDevice';
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';
import { saveFile } from '@/utils/fileSave';
import { Pane, Splitpanes } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { v4 as uuidv4 } from 'uuid';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const { isMobileOrTablet } = useDevice();
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
} = usePresetStore();

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
  mobilePanelTitle,
  openMobilePanel,
  handleRenamePreset,
  handleDeletePreset,
  handleSelectPreset,
  handleSelectHeader,
  handleSelectPrompt,
  handleSelectRegex,
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
  if (!activePresetId.value) return;
  const prompts = (activePreset.value?.data?.prompts as Record<string, any>[]) || [];
  if (prompts.length === 0) return;
  selectPrompt(activePresetId.value, 0);
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

.mobile-drawer-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.mobile-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.mobile-drawer-title {
  font-size: 16px;
  font-weight: 600;
}

.mobile-drawer-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.mobile-drawer-tab {
  border: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  border-radius: 999px;
  padding: 6px 8px;
  font-size: 12px;
}

.mobile-drawer-tab.active {
  border-color: var(--el-color-primary-light-3);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.mobile-drawer-body {
  flex: 1;
  min-height: 0;
}

.mobile-drawer-pane {
  height: 100%;
  min-height: 0;
}

.preset-mobile-drawer :deep(.el-drawer__body) {
  padding: 14px 10px 10px;
}
</style>
