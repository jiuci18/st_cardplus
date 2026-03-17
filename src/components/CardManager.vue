<template>
  <div class="card-manager-container">
    <div class="card-manager-layout">
      <CharacterCardTabs :tabs="tabs" :active-tab-id="activeTabId" @switch-tab="switchToTab"
        @close-tab="handleTabClose" @reorder-tabs="reorderTabs" />

      <div class="tab-content-area">
        <div v-if="currentTab?.type === 'home'" class="tab-content-panel">
          <CharacterCardHome :collection="characterCardCollection" @open-card="handleOpenCardFromHome"
            @create-new="handleCreateNewCard" @rename-card="handleRenameCard" @delete-card="handleDeleteCard"
            @export-card="handleExportCard" @export-all="handleExportAllCards" @import-file="handleImportFromFile"
            @clear-all="handleClearAllCards" />
        </div>

        <div v-else-if="currentTab?.type === 'character-card'" class="tab-content-panel">
          <div class="card-manager-panel-editor">
            <div class="content-panel-header">
              <h2 class="content-panel-title">
                <Icon :icon="headerIcon" class="content-panel-icon" />
                {{ headerTitle }}
                <span v-if="rightEditorTab === 'card' && currentCardInTab" class="content-panel-text-highlight">
                  - {{ currentCardInTab.name || '未命名角色' }}
                </span>
                <span v-else-if="rightEditorTab === 'worldbook' && worldbookPanelRef?.hasWorldBook"
                  class="content-panel-text-highlight">
                  - {{ worldbookPanelRef?.currentWorldBookName }}
                </span>
              </h2>
              <div class="header-actions" v-if="rightEditorTab === 'card'">
                <CharacterCardActions context="editor" :has-active-card="!!currentCardInTab" :save-status="saveStatus"
                  :auto-save-mode="autoSaveMode" @toggle-mode="toggleAutoSaveMode" @save-card="handleSaveCurrentAsNew"
                  @save-as-new="handleSaveAsNewCard" @update-card="handleUpdateActiveCard"
                  @export-current="handleExportCurrentCard" />
                <el-divider direction="vertical" />
                <el-button type="primary" @click="triggerFileInput" size="small" :loading="isUploading"
                  :disabled="isUploading">
                  <Icon icon="ph:file-image-duotone" v-if="!isUploading" />
                  <span class="button-text">{{ isUploading ? uploadProgress : '加载PNG' }}</span>
                </el-button>
                <el-button type="success" @click="handleSave" size="small">
                  <Icon icon="ph:download-duotone" />
                  <span class="button-text">导出PNG</span>
                </el-button>
              </div>
              <div class="header-actions" v-else-if="rightEditorTab === 'worldbook'">
                <el-tooltip content="将当前世界书添加到世界书数据库，不影响角色卡" placement="bottom">
                  <el-button size="small" @click="handleAddWorldBookToDB" :disabled="!worldbookPanelRef?.hasWorldBook">
                    <Icon icon="ph:database-duotone" />
                    <span class="button-text">添加到 DB</span>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="用世界书数据库中的世界书替换当前世界书" placement="bottom">
                  <el-button size="small" @click="handleReplaceWorldBookFromDB"
                    :disabled="!worldbookPanelRef?.hasWorldBook">
                    <Icon icon="ph:arrows-counter-clockwise-duotone" />
                    <span class="button-text">从 DB 替换</span>
                  </el-button>
                </el-tooltip>
              </div>
              <div class="header-actions" v-else-if="rightEditorTab === 'regex'">
                <el-tooltip content="创建一个新的空白正则脚本" placement="bottom">
                  <el-button size="small" @click="regexPanelRef?.handleCreateNew()" :disabled="!currentCardInTab">
                    <Icon icon="ph:file-plus-duotone" />
                    <span class="button-text">创建新脚本</span>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="从正则脚本库中选择并添加脚本" placement="bottom">
                  <el-button size="small" @click="regexPanelRef?.handleAddFromLibrary()" :disabled="!currentCardInTab">
                    <Icon icon="ph:books-duotone" />
                    <span class="button-text">从正则库添加</span>
                  </el-button>
                </el-tooltip>
                <el-divider direction="vertical" />
                <el-tooltip content="将角色卡的正则脚本发送到正则编辑器（副本），之后完全独立" placement="bottom">
                  <el-button size="small" @click="regexPanelRef?.handleSendToRegexEditor()" :disabled="!hasRegexScripts">
                    <Icon icon="ph:upload-duotone" />
                    <span class="button-text">发送到编辑器</span>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="用正则编辑器中的脚本替换角色卡的所有正则脚本" placement="bottom">
                  <el-button size="small" @click="regexPanelRef?.handleReplaceFromRegexEditor()" :disabled="!currentCardInTab">
                    <Icon icon="ph:arrow-counter-clockwise-duotone" />
                    <span class="button-text">从编辑器替换</span>
                  </el-button>
                </el-tooltip>
              </div>
            </div>
            <el-tabs v-model="rightEditorTab" tab-position="right" class="bookmark-tabs" stretch>
              <el-tab-pane name="card">
                <template #label>
                  <span class="bookmark-tab-label">
                    <Icon icon="ph:note-pencil-duotone" class="bookmark-tab-icon" />
                    <span class="bookmark-tab-text">角色卡</span>
                  </span>
                </template>
                <div class="tab-full-content">
                  <CardEditor v-if="currentCardInTab" :key="`card-${currentEditorCardId}`" :character="currentDraft"
                    :image-preview-url="imagePreviewUrl" :avatar-url="avatarUrl" :is-desktop-app="isDesktopApp"
                    :selected-provider="selectedProvider" :all-tags="allTags"
                    v-model:advanced-options-visible="advancedOptionsVisible" @image-change="handleImageUpdate"
                    @image-url-change="handleImageUrlUpdate" @provider-change="selectedProvider = $event"
                    @upload-to-hosting="handleUploadToHosting" @update-field="handleCardEditorFieldUpdate" />
                </div>
              </el-tab-pane>

              <el-tab-pane name="worldbook" style="height: 100%">
                <template #label>
                  <span class="bookmark-tab-label">
                    <Icon icon="ph:books-duotone" class="bookmark-tab-icon" />
                    <span class="bookmark-tab-text">世界书</span>
                  </span>
                </template>
                <div class="tab-full-content">
                  <CardWorldBookPanel ref="worldbookPanelRef" :key="`worldbook-${currentEditorCardId}`"
                    :character="currentDraft"
                    @update:character-book="handleCharacterBookUpdate"
                    @worldbookChanged="handleWorldBookChanged" />
                </div>
              </el-tab-pane>

              <el-tab-pane name="regex">
                <template #label>
                  <span class="bookmark-tab-label">
                    <Icon icon="ph:brackets-curly-duotone" class="bookmark-tab-icon" />
                    <span class="bookmark-tab-text">正则</span>
                  </span>
                </template>
                <div class="tab-full-content">
                  <CardRegexPanel ref="regexPanelRef" :character="currentDraft"
                    @update:regex-scripts="handleRegexScriptsUpdate"
                    @regexChanged="handleRegexChanged" />
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/png" style="display: none" @change="handleFileSelected" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElButton, ElDivider, ElMessage, ElTabPane, ElTabs } from 'element-plus';
import { computed, onUnmounted, ref, watch } from 'vue';

import CardEditor from '@/components/cardManager/CardEditor.vue';
import CharacterCardActions from '@/components/cardManager/components/CharacterCardActions.vue';
import CharacterCardHome from '@/components/cardManager/components/CharacterCardHome.vue';
import CharacterCardTabs from '@/components/cardManager/components/CharacterCardTabs.vue';
import CardRegexPanel from '@/components/cardManager/panel/CardRegexPanel.vue';
import CardWorldBookPanel from '@/components/cardManager/panel/CardWorldBookPanel.vue';

import { useCardExport } from '@/composables/characterCard/useCardExport';
import { useCardImport } from '@/composables/characterCard/useCardImport';
import { useCharacterCardAutoSave, type AutoSaveMode } from '@/composables/characterCard/useCharacterCardAutoSave';
import { useCharacterCardCollection } from '@/composables/characterCard/useCharacterCardCollection';
import { useCharacterCardEditorSessions } from '@/composables/characterCard/useCharacterCardEditorSessions';
import { useTabManager } from '@/composables/characterCard/useTabManager';
import type { CharacterCardV3 } from '@/types/character-card-v3';
import type { SillyTavernRegexScript } from '@/composables/regex/types';
import { isTauriApp, type HostingProvider } from '@/utils/imageHosting';
import { getSetting } from '@/utils/localStorageUtils';
import { useImageHosting } from '@/composables/useImageHosting';

const {
  tabs,
  activeTabId,
  openCharacterCardTab,
  closeTab,
  switchToTab,
  updateTabLabel,
  closeCharacterCardTab,
  closeAllCharacterCardTabs,
  reorderTabs,
  getActiveTab,
} = useTabManager();

const {
  characterCardCollection,
  allTags,
  isLoading,
  handleSaveCurrentCard,
  handleUpdateCard,
  handleRenameCard: handleRenameCardOriginal,
  handleDeleteCard: handleDeleteCardOriginal,
  handleImportFromFile,
  handleExportCard,
  handleExportAllCards,
  handleClearAllCards: handleClearAllCardsFromCollection,
  handleCreateNewCard: handleCreateNewCardFromCollection,
} = useCharacterCardCollection();

const rightEditorTab = ref<'card' | 'worldbook' | 'regex'>('card');
const headerTitle = computed(() => {
  if (rightEditorTab.value === 'worldbook') return '世界书';
  if (rightEditorTab.value === 'regex') return '正则编辑器';
  return '角色卡编辑器';
});
const headerIcon = computed(() => {
  if (rightEditorTab.value === 'worldbook') return 'ph:books-duotone';
  if (rightEditorTab.value === 'regex') return 'ph:brackets-curly-duotone';
  return 'ph:note-pencil-duotone';
});
const advancedOptionsVisible = ref(false);

const currentTab = computed(() => getActiveTab());
const currentCardInTab = computed(() => {
  const tab = currentTab.value;
  if (tab?.type === 'character-card' && tab.cardId) {
    return characterCardCollection.value.cards[tab.cardId];
  }
  return null;
});
const currentCardId = computed(() => currentCardInTab.value?.id || null);
const currentEditorCardId = computed(() => currentCardId.value || 'none');

const {
  currentSession,
  currentDraft,
  currentImageFile,
  ensureSession,
  getSession,
  replaceCurrentSessionDraft,
  setCurrentSessionImageFile,
  setCurrentSessionAvatarUrl,
  closeSession,
  closeAllSessions,
} = useCharacterCardEditorSessions({
  collection: characterCardCollection,
  currentCardId,
});

const { handleUploadToHosting } = useImageHosting(currentImageFile, setCurrentSessionAvatarUrl);

const autoSaveMode = ref<AutoSaveMode>('watch');

const {
  saveStatus,
  manualSave,
} = useCharacterCardAutoSave({
  currentSession,
  autoSaveMode,
  onSave: async (cardId, data) => {
    await handleUpdateCard(cardId, data, true);
  },
});

type CharacterDataField = keyof CharacterCardV3['data'];

const syncTopLevelFieldMap: Partial<Record<CharacterDataField, keyof CharacterCardV3>> = {
  name: 'name',
  description: 'description',
  personality: 'personality',
  scenario: 'scenario',
  first_mes: 'first_mes',
  mes_example: 'mes_example',
  tags: 'tags',
};

const updateCurrentDraft = (updater: (draft: CharacterCardV3) => void) => {
  if (!currentSession.value) return;
  updater(currentSession.value.draft);
};

const cloneFieldValue = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return [...value] as T;
  }
  return value;
};

const handleCardEditorFieldUpdate = (payload: {
  field: CharacterDataField;
  value: CharacterCardV3['data'][CharacterDataField];
}) => {
  updateCurrentDraft((draft) => {
    const nextValue = cloneFieldValue(payload.value);
    draft.data[payload.field] = nextValue;

    const topLevelField = syncTopLevelFieldMap[payload.field];
    if (topLevelField) {
      draft[topLevelField] = cloneFieldValue(nextValue) as never;
    }
  });
};

const handleCharacterBookUpdate = (characterBook: CharacterCardV3['data']['character_book']) => {
  updateCurrentDraft((draft) => {
    draft.data.character_book = characterBook;
  });
};

const handleRegexScriptsUpdate = (scripts: SillyTavernRegexScript[]) => {
  updateCurrentDraft((draft) => {
    if (!draft.data.extensions) {
      draft.data.extensions = {};
    }
    draft.data.extensions.regex_scripts = scripts;
  });
};

const toggleAutoSaveMode = () => {
  const modes: AutoSaveMode[] = ['auto', 'watch', 'manual'];
  const currentIndex = modes.indexOf(autoSaveMode.value);
  const nextIndex = (currentIndex + 1) % modes.length;
  autoSaveMode.value = modes[nextIndex];

  const intervalSeconds = Math.max(1, Math.round(getSetting('autoSaveInterval')));
  const debounceSeconds = Math.max(0.1, Math.round(getSetting('autoSaveDebounce') * 10) / 10);
  const messages = {
    auto: `已切换到自动保存模式：每 ${intervalSeconds} 秒自动保存`,
    watch: `已切换到监听模式：检测到修改后 ${debounceSeconds} 秒自动保存`,
    manual: '已切换到手动模式：自动保存已禁用',
  };

  ElMessage.info(messages[autoSaveMode.value]);
};

const handleImageUpdate = (file: File) => {
  setCurrentSessionImageFile(file);
};

const handleImageUrlUpdate = (url: string) => {
  setCurrentSessionAvatarUrl(url);
};

const isDesktopApp = isTauriApp();
const selectedProvider = ref<HostingProvider>('catbox');

const avatarUrl = computed(() => {
  if (currentDraft.value.avatar && currentDraft.value.avatar !== 'none') {
    return currentDraft.value.avatar;
  }
  return '';
});

const localPreviewUrl = ref<string>();

watch(
  currentImageFile,
  (file) => {
    if (localPreviewUrl.value) {
      URL.revokeObjectURL(localPreviewUrl.value);
      localPreviewUrl.value = undefined;
    }

    if (file) {
      localPreviewUrl.value = URL.createObjectURL(file);
    }
  },
  { immediate: true }
);

const imagePreviewUrl = computed(() => localPreviewUrl.value || avatarUrl.value || undefined);

const { isUploading, uploadProgress, triggerFileInput, handleFileSelected } = useCardImport((card) => {
  replaceCurrentSessionDraft(card, { markAsPersisted: false });
  rightEditorTab.value = 'card';
}, handleImageUpdate);
const { handleSave } = useCardExport(currentDraft, currentImageFile, imagePreviewUrl);

const handleRegexChanged = async () => {
  if (currentSession.value) {
    try {
      await manualSave();
    } catch (error) {
      console.error('保存正则更改失败:', error);
      ElMessage.warning('正则脚本已更新，但保存到数据库失败。请手动保存角色卡。');
    }
  } else {
    ElMessage.info('正则脚本已更新。请保存角色卡以将更改持久化。');
  }
};

watch(
  [isLoading, activeTabId],
  ([loading, tabId]) => {
    if (loading) return;

    const tab = tabs.value.find((item) => item.id === tabId);
    if (tab?.type === 'character-card' && tab.cardId) {
      ensureSession(tab.cardId);
    }
  },
  { immediate: true }
);

const handleSaveCurrentAsNew = async () => {
  const cardId = await handleSaveCurrentCard(currentDraft.value);
  if (cardId) {
    const newCard = characterCardCollection.value.cards[cardId];
    if (newCard) {
      rightEditorTab.value = 'card';
      openCharacterCardTab(cardId, newCard.name || '未命名角色');
      ensureSession(cardId);
    }
  }
};

const handleSaveAsNewCard = async () => {
  await handleSaveCurrentAsNew();
};

const handleUpdateActiveCard = async () => {
  if (currentSession.value) {
    await handleUpdateCard(currentSession.value.cardId, currentSession.value.draft);
    replaceCurrentSessionDraft(currentSession.value.draft, {
      preserveImageFile: true,
      markAsPersisted: true,
    });
  }
};

const handleExportCurrentCard = async () => {
  if (currentSession.value) {
    await handleExportCard(currentSession.value.cardId);
  }
};

const handleCreateNewCard = async () => {
  const cardId = await handleCreateNewCardFromCollection();
  if (cardId) {
    const newCard = characterCardCollection.value.cards[cardId];
    if (newCard) {
      rightEditorTab.value = 'card';
      openCharacterCardTab(cardId, newCard.name || '未命名角色');
    }
  }
};

const handleOpenCardFromHome = (cardId: string, cardName: string) => {
  rightEditorTab.value = 'card';
  openCharacterCardTab(cardId, cardName);
};

const handleTabClose = (tabId: string) => {
  closeTab(tabId);
  closeSession(tabId);
};

const handleRenameCard = async (cardId: string) => {
  await handleRenameCardOriginal(cardId);
  const card = characterCardCollection.value.cards[cardId];
  if (card) {
    updateTabLabel(cardId, card.name || '未命名角色');
    const session = getSession(cardId);
    if (session) {
      session.draft.name = card.name || '';
      session.draft.data.name = card.name || '';
    }
  }
};

const handleDeleteCard = async (cardId: string) => {
  await handleDeleteCardOriginal(cardId);
  closeCharacterCardTab(cardId);
  closeSession(cardId);
};

const handleClearAllCards = async () => {
  const previousCount = Object.keys(characterCardCollection.value.cards).length;
  await handleClearAllCardsFromCollection();
  if (previousCount > 0 && Object.keys(characterCardCollection.value.cards).length === 0) {
    closeAllSessions();
    closeAllCharacterCardTabs();
  }
};

const handleWorldBookChanged = async () => {
  if (currentSession.value) {
    try {
      await manualSave();
    } catch (error) {
      console.error('保存世界书更改失败:', error);
      ElMessage.warning('世界书已更新，但保存到数据库失败。请手动保存角色卡。');
    }
  } else {
    ElMessage.info('世界书已更新。请保存角色卡以将更改持久化。');
  }
};

const worldbookPanelRef = ref<InstanceType<typeof CardWorldBookPanel>>();

const handleAddWorldBookToDB = () => {
  worldbookPanelRef.value?.handleAddToDB();
};

const handleReplaceWorldBookFromDB = () => {
  worldbookPanelRef.value?.handleReplaceFromDB();
};

const regexPanelRef = ref<InstanceType<typeof CardRegexPanel>>();

const hasRegexScripts = computed(() => {
  const scripts = currentDraft.value.data.extensions?.regex_scripts;
  return scripts && scripts.length > 0;
});


onUnmounted(() => {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
  }
});
</script>

<style scoped>
.card-manager-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--el-bg-color-page);
}

.card-manager-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.tab-content-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.tab-content-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-manager-panel-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--el-bg-color);
}

.content-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  background-color: var(--el-bg-color-overlay);
  flex-shrink: 0;
  margin-bottom: 0px;
}

.content-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-panel-icon {
  font-size: 18px;
}

.content-panel-text-highlight {
  color: var(--el-color-primary);
  font-weight: 500;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.bookmark-tabs {
  flex: 1;
  min-height: 0;
  overflow: auto;
  height: 100%;
}

.bookmark-tabs :deep(.el-tabs__content) {
  height: 100%;
  overflow: hidden;
}

.bookmark-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.bookmark-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.bookmark-tabs :deep(.el-tabs__nav-wrap) {
  padding: 8px 0;
}

.bookmark-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  writing-mode: horizontal-tb;
}

.bookmark-tab-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.bookmark-tab-text {
  font-size: 14px;
  font-weight: 500;
}

.tab-full-content {
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .content-panel-header {
    height: auto;
    min-height: 48px;
    padding: 8px 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .content-panel-title {
    flex: 1 1 auto;
    min-width: 120px;
    font-size: 14px;
    gap: 6px;
  }

  .content-panel-icon {
    font-size: 16px;
  }

  .content-panel-text-highlight {
    display: none;
  }

  .header-actions {
    flex: 0 0 auto;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .header-actions .el-button {
    padding: 6px 8px;
    min-width: 32px;
  }

  .button-text {
    display: none;
  }

  .bookmark-tabs :deep(.el-tabs__nav-wrap) {
    padding: 4px 0;
  }

  .bookmark-tab-label {
    gap: 6px;
    padding: 2px 0;
  }

  .bookmark-tab-icon {
    font-size: 16px;
  }

  .bookmark-tab-text {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .content-panel-header {
    padding: 6px 10px;
    gap: 6px;
  }

  .content-panel-title {
    flex: 1 0 100%;
    font-size: 13px;
    justify-content: center;
  }

  .header-actions {
    flex: 1 0 100%;
    justify-content: center;
    gap: 6px;
  }

  .header-actions .el-button {
    padding: 5px 6px;
    min-width: 28px;
  }
}
</style>
