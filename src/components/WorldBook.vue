<template>
  <DefineEditor>
    <div class="content-panel-header">
      <h2 class="content-panel-title">
        <Icon icon="ph:note-pencil-duotone" class="content-panel-icon" />
        编辑: <span class="content-panel-text-highlight">{{ editorTitle }}</span>
      </h2>
      <div class="worldbook-editor-header-actions">
        <span class="worldbook-import-notice">导入须知：请使用从酒馆导出的世界书进行导入</span>
        <WorldBookActions context="editor" :has-selection="activeView === 'entry' && !!selectedEntry"
          :save-status="saveStatus" :auto-save-mode="autoSaveMode" @toggle-mode="toggleAutoSaveMode"
          @copy-entry="copySelectedEntry" @save-entry="saveCurrentEntry" @delete-entry="deleteSelectedEntry" />
      </div>
    </div>
    <WorldBookBatchSettings v-if="activeView === 'batch'" :book="activeBook" :all-keywords="allKeywords"
      @apply="applyBatchSettings" />
    <WorldBookEditor v-else :entry="selectedEntry" v-model="editableEntry" :all-keywords="allKeywords"
      :current-entry-index="currentEntryIndex" :total-entries="totalEntries" @go-to-previous="goToPreviousEntry"
      @go-to-next="goToNextEntry" :is-next-entry-in-different-book="isNextEntryInDifferentBook"
      :is-previous-entry-in-different-book="isPreviousEntryInDifferentBook" :save-status="saveStatus" />
  </DefineEditor>
  <DefineList>
    <WorldBookList :collection="worldBookCollection" :active-book-id="activeBookId" @select-book="handleSelectBook"
      @create-book="handleCreateBook" @rename-book="handleRenameBook" @reorder-books="updateBookOrder"
      @delete-book="handleDeleteBook" @select-batch-settings="handleSelectBatchSettings"
      @select-entry="handleSelectEntry" @add-entry="addNewEntry" @duplicate-entry="handleDuplicateEntry"
      @delete-entry="handleDeleteEntryFromList" :selected-entry="selectedEntry"
      :is-batch-settings-active="activeView === 'batch'" @copy-book="copyWorldBookToClipboard"
      @export-json="exportToJson" @import-book-file="handleImportBookFile" @clear-all="clearAllEntries"
      :drag-drop-handlers="dragDropHandlers" :sidebar-width="sidebarWidth" />
  </DefineList>
  <div class="worldbook-container">
    <div v-if="isMobile" class="worldbook-mobile-layout">
      <div class="worldbook-mobile-panel">
        <ReuseEditor />
      </div>

      <MobileBookmarkDrawer v-model:visible="mobileDrawerVisible" v-model:active-tab="mobilePanelTab"
        :items="mobileBookmarkItems" drawer-size="88%">
        <template #pane-list>
          <div class="worldbook-mobile-drawer-pane">
            <div class="content-panel-header">
              <h2 class="content-panel-title">
                <Icon icon="ph:list-bullets-duotone" class="content-panel-icon" />
                <span class="content-panel-text">世界书条目</span>
              </h2>
              <el-tooltip content="新增条目" placement="top" :show-arrow="false" :offset="8" :hide-after="0">
                <button @click="() => addNewEntry()" class="btn-adv btn-primary-adv worldbook-add-button"
                  aria-label="新增条目" :disabled="!activeBook">
                  <Icon icon="ph:plus-circle-duotone" class="worldbook-add-icon" />
                </button>
              </el-tooltip>
            </div>
            <ReuseList />
          </div>
        </template>
      </MobileBookmarkDrawer>
    </div>

    <div v-else class="worldbook-desktop-layout">
      <Splitpanes class="default-theme" push-other-panes style="height: 100%">
        <Pane size="15" min-size="15" max-size="35" ref="sidebarPaneRef">
          <ReuseList />
        </Pane>
        <Pane size="85" min-size="40">
          <div class="worldbook-desktop-panel-right">
            <ReuseEditor />
          </div>
        </Pane>
      </Splitpanes>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createReusableTemplate, useElementSize } from '@vueuse/core';
import { Icon } from '@iconify/vue';
import { ElMessage, ElTooltip } from 'element-plus';
import { Pane, Splitpanes } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import '../css/worldbook.css';

import { useDevice } from '../composables/useDevice';
import { useWorldBookCollection } from '../composables/worldbook/useWorldBookCollection';
import { useWorldBookDragDrop } from '../composables/worldbook/useWorldBookDragDrop';
import { useWorldBookEntryNavigation } from '../composables/worldbook/useWorldBookEntryNavigation';
import { useWorldBookEntry } from '../composables/worldbook/useWorldBookEntry';
import type { WorldBookEntry } from '@/types/worldbook';
import MobileBookmarkDrawer from './ui/common/MobileBookmarkDrawer.vue';
import WorldBookActions from './worldbook/WorldBookActions.vue';
import WorldBookBatchSettings from './worldbook/WorldBookBatchSettings.vue';
import WorldBookEditor from './worldbook/WorldBookEditor.vue';
import WorldBookList from './worldbook/WorldBookList.vue';

import { computed, nextTick, ref, watch } from 'vue';

const [DefineEditor, ReuseEditor] = createReusableTemplate();
const [DefineList, ReuseList] = createReusableTemplate();
const sidebarPaneRef = ref(null);
const { width: sidebarWidth } = useElementSize(sidebarPaneRef);

const {
  worldBookCollection,
  isLoading,
  activeBookId,
  activeBook,
  handleSelectBook: selectBook,
  handleCreateBook,
  handleRenameBook,
  handleDeleteBook,
  handleImportBookFile: importBookFile,
  moveEntryBetweenBooks,
  updateBookEntries,
  updateBookOrder,
  handleUpdateEntry,
  handleAddEntry,
  handleDeleteEntry,
} = useWorldBookCollection();

const {
  selectedEntry,
  editableEntry,
  activeTab,
  addNewEntry: addEntry,
  handleSelectEntry: selectEntry,
  saveCurrentEntry,
  deleteSelectedEntry,
  duplicateEntry,
  copySelectedEntry,
  exportToJson,
  copyWorldBookToClipboard,
  clearAllEntries,
  saveStatus,
  autoSaveMode,
  toggleAutoSaveMode,
} = useWorldBookEntry(activeBook, {
  updateEntries: (entries) => {
    if (!activeBook.value) return Promise.reject('No active book selected');
    return updateBookEntries(activeBook.value.id, entries);
  },
  updateEntry: handleUpdateEntry,
  addEntry: handleAddEntry,
  deleteEntry: handleDeleteEntry,
});

const { isMobile } = useDevice();
const activeView = ref<'entry' | 'batch'>('batch');
const mobileDrawerVisible = ref(false);
const mobilePanelTab = ref('list');
const mobileBookmarkItems = [
  {
    key: 'list',
    label: '列表',
    drawerLabel: '条目列表',
    title: '世界书条目',
    icon: 'ph:list-bullets-duotone',
  },
];

watch(
  [isMobile, activeTab, isLoading],
  ([mobile, tab, loading]) => {
    if (!mobile || loading) {
      mobileDrawerVisible.value = false;
      return;
    }
    if (tab === 'list') {
      mobilePanelTab.value = 'list';
      mobileDrawerVisible.value = true;
      return;
    }
    mobileDrawerVisible.value = false;
  },
  { immediate: true }
);

const {
  currentEntryIndex, totalEntries, allKeywords,
  isNextEntryInDifferentBook, isPreviousEntryInDifferentBook,
  goToPreviousEntry, goToNextEntry,
} = useWorldBookEntryNavigation({
  books: computed(() => Object.values(worldBookCollection.value.books)),
  activeBook,
  selectedEntry,
  selectEntry: (bookId, index) => handleSelectEntry(bookId, index),
});

const editorTitle = computed(() => {
  if (activeView.value === 'batch') return '批量设置';
  return selectedEntry.value ? selectedEntry.value.comment || '新条目' : '未选择条目';
});

const dragDropHandlers = useWorldBookDragDrop(
  worldBookCollection,
  moveEntryBetweenBooks,
  updateBookEntries,
  updateBookOrder
);

const closeMobileDrawer = () => {
  if (isMobile.value) {
    mobileDrawerVisible.value = false;
  }
};

const handleSelectBook = (bookId: string) => {
  activeView.value = 'entry';
  selectBook(bookId);
  nextTick(() => {
    if (activeBook.value && activeBook.value.entries.length > 0) {
      selectEntry('0');
      activeTab.value = 'editor';
      closeMobileDrawer();
    } else {
      selectEntry(null); // Clear selection
      activeTab.value = 'list';
    }
  });
};

const handleSelectEntry = async (bookId: string, entryIndex: number | null) => {
  activeView.value = 'entry';
  await ensureActiveBook(bookId);
  selectEntry(entryIndex === null ? null : String(entryIndex));
  if (entryIndex !== null) {
    activeTab.value = 'editor';
    closeMobileDrawer();
  }
};

const ensureActiveBook = async (bookId: string) => {
  if (activeBookId.value === bookId) return;
  selectBook(bookId);
  await nextTick();
};

const handleSelectBatchSettings = (bookId: string) => {
  if (activeBookId.value !== bookId) {
    selectBook(bookId);
  }
  activeView.value = 'batch';
  activeTab.value = 'editor';
  closeMobileDrawer();
};

const applyBatchSettings = async (entries: WorldBookEntry[]) => {
  if (!activeBook.value) {
    ElMessage.error('请先选择一个世界书');
    return;
  }

  await updateBookEntries(activeBook.value.id, entries);

  if (selectedEntry.value) {
    const refreshedEntry = activeBook.value.entries.find((entry) => entry.uid === selectedEntry.value?.uid);
    if (refreshedEntry) {
      editableEntry.value = JSON.parse(JSON.stringify(refreshedEntry));
    }
  }
};

const addNewEntry = async (bookId?: string) => {
  activeView.value = 'entry';
  const targetBookId = bookId || activeBookId.value;
  if (!targetBookId) {
    ElMessage.error('请先选择一个世界书 ');
    return;
  }
  await ensureActiveBook(targetBookId);
  await addEntry();
  closeMobileDrawer();
};

const handleDuplicateEntry = async (bookId: string, entryIndex: number) => {
  activeView.value = 'entry';
  await ensureActiveBook(bookId);
  await duplicateEntry(entryIndex);
  closeMobileDrawer();
};

const handleDeleteEntryFromList = async (bookId: string, entryIndex: number) => {
  activeView.value = 'entry';
  await ensureActiveBook(bookId);
  if (!activeBook.value?.entries[entryIndex]) return;
  selectEntry(String(entryIndex));
  await nextTick();
  await deleteSelectedEntry();
};

const handleImportBookFile = (file: File) => {
  ElMessage.warning('请使用从酒馆导出的世界书进行导入');
  importBookFile(file);
};
</script>
