<template>
  <div class="worldbook-container">
    <div class="worldbook-mobile-layout">
      <div class="worldbook-mobile-panel">
        <div class="content-panel-header">
          <h2 class="content-panel-title">
            <Icon
              icon="ph:note-pencil-duotone"
              class="content-panel-icon"
            />
            编辑:
            <span class="content-panel-text-highlight">
              {{ selectedEntry ? selectedEntry.comment || '新条目' : '未选择条目' }}
            </span>
          </h2>
          <div class="worldbook-editor-header-actions">
            <span class="worldbook-import-notice">导入须知：请使用从酒馆导出的世界书进行导入</span>
            <WorldBookActions
              context="editor"
              :has-selection="!!selectedEntry"
              :save-status="saveStatus"
              :auto-save-mode="autoSaveMode"
              @toggle-mode="toggleAutoSaveMode"
              @copy-entry="copySelectedEntry"
              @save-entry="saveCurrentEntry"
              @delete-entry="deleteSelectedEntry"
            />
          </div>
        </div>
        <WorldBookEditor
          :entry="selectedEntry"
          v-model="editableEntry"
          :all-keywords="allKeywords"
          :current-entry-index="currentEntryIndex"
          :total-entries="totalEntries"
          @go-to-previous="goToPreviousEntry"
          @go-to-next="goToNextEntry"
          :is-next-entry-in-different-book="isNextEntryInDifferentBook"
          :is-previous-entry-in-different-book="isPreviousEntryInDifferentBook"
          :save-status="saveStatus"
        />
      </div>

      <MobileBookmarkDrawer
        v-model:visible="mobileDrawerVisible"
        v-model:active-tab="mobilePanelTab"
        :items="mobileBookmarkItems"
        drawer-size="88%"
      >
        <template #pane-list>
          <div class="worldbook-mobile-drawer-pane">
            <div class="content-panel-header">
              <h2 class="content-panel-title">
                <Icon
                  icon="ph:list-bullets-duotone"
                  class="content-panel-icon"
                />
                <span class="content-panel-text">世界书条目</span>
              </h2>
              <el-tooltip
                content="新增条目"
                placement="top"
                :show-arrow="false"
                :offset="8"
                :hide-after="0"
              >
                <button
                  @click="() => addNewEntry()"
                  class="btn-adv btn-primary-adv worldbook-add-button"
                  aria-label="新增条目"
                  :disabled="!activeBook"
                >
                  <Icon
                    icon="ph:plus-circle-duotone"
                    class="worldbook-add-icon"
                  />
                </button>
              </el-tooltip>
            </div>
            <WorldBookList
              :collection="worldBookCollection"
              :active-book-id="activeBookId"
              @select-book="handleSelectBook"
              @create-book="handleCreateBook"
              @rename-book="handleRenameBook"
              @delete-book="handleDeleteBook"
              @select-entry="handleSelectEntry"
              @add-entry="addNewEntry"
              @duplicate-entry="handleDuplicateEntry"
              @delete-entry="handleDeleteEntryFromList"
              :selected-entry="selectedEntry"
              @copy-book="copyWorldBookToClipboard"
              @export-json="exportToJson"
              @import-book-file="handleImportBookFile"
              @clear-all="clearAllEntries"
              :drag-drop-handlers="dragDropHandlers"
            />
          </div>
        </template>
      </MobileBookmarkDrawer>
    </div>

    <div class="worldbook-desktop-layout">
      <Splitpanes
        class="default-theme"
        push-other-panes
        style="height: 100%"
      >
        <Pane
          size="15"
          min-size="15"
          max-size="35"
          ref="sidebarPaneRef"
        >
          <WorldBookList
            :collection="worldBookCollection"
            :active-book-id="activeBookId"
            @select-book="handleSelectBook"
            @create-book="handleCreateBook"
            @rename-book="handleRenameBook"
            @delete-book="handleDeleteBook"
            @select-entry="handleSelectEntry"
            @add-entry="addNewEntry"
            @duplicate-entry="handleDuplicateEntry"
            @delete-entry="handleDeleteEntryFromList"
            :selected-entry="selectedEntry"
            @copy-book="copyWorldBookToClipboard"
            @export-json="exportToJson"
            @import-book-file="handleImportBookFile"
            @clear-all="clearAllEntries"
            :drag-drop-handlers="dragDropHandlers"
            :sidebar-width="sidebarWidth"
          />
        </Pane>
        <Pane
          size="85"
          min-size="40"
        >
          <div class="worldbook-desktop-panel-right">
            <div class="content-panel-header">
              <h2 class="content-panel-title">
                <Icon
                  icon="ph:note-pencil-duotone"
                  class="content-panel-icon"
                />
                编辑:
                <span class="content-panel-text-highlight">
                  {{ selectedEntry ? selectedEntry.comment || '新条目' : '未选择条目' }}
                </span>
              </h2>
              <div class="worldbook-editor-header-actions">
                <span class="worldbook-import-notice">导入须知：请使用从酒馆导出的世界书进行导入</span>
                <WorldBookActions
                  context="editor"
                  :has-selection="!!selectedEntry"
                  :save-status="saveStatus"
                  :auto-save-mode="autoSaveMode"
                  @toggle-mode="toggleAutoSaveMode"
                  @copy-entry="copySelectedEntry"
                  @save-entry="saveCurrentEntry"
                  @delete-entry="deleteSelectedEntry"
                />
              </div>
            </div>
            <WorldBookEditor
              :entry="selectedEntry"
              v-model="editableEntry"
              :all-keywords="allKeywords"
              :current-entry-index="currentEntryIndex"
              :total-entries="totalEntries"
              @go-to-previous="goToPreviousEntry"
              @go-to-next="goToNextEntry"
              :is-next-entry-in-different-book="isNextEntryInDifferentBook"
              :is-previous-entry-in-different-book="isPreviousEntryInDifferentBook"
              :save-status="saveStatus"
            />
          </div>
        </Pane>
      </Splitpanes>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElMessage, ElTooltip } from 'element-plus';
import { Pane, Splitpanes } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import '../css/worldbook.css';

import { useDevice } from '../composables/useDevice';
import { useWorldBookCollection } from '../composables/worldbook/useWorldBookCollection';
import { useWorldBookDragDrop } from '../composables/worldbook/useWorldBookDragDrop';
import { useWorldBookEntry } from '../composables/worldbook/useWorldBookEntry';
import type { WorldBookEntry } from '../types/types';
import MobileBookmarkDrawer from './ui/common/MobileBookmarkDrawer.vue';
import WorldBookActions from './worldbook/WorldBookActions.vue';
import WorldBookEditor from './worldbook/WorldBookEditor.vue';
import WorldBookList from './worldbook/WorldBookList.vue';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const sidebarPaneRef = ref(null);
const sidebarWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  const paneElement = (sidebarPaneRef.value as any)?.$el;
  if (paneElement) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        sidebarWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(paneElement);
    sidebarWidth.value = paneElement.offsetWidth;
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

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
  forceUpdateEntries,
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

const currentEntryIndex = computed(() => {
  if (!activeBook.value || !selectedEntry.value) {
    return -1;
  }
  return activeBook.value.entries.findIndex((entry: WorldBookEntry) => entry.uid === selectedEntry.value!.uid);
});

const totalEntries = computed(() => {
  return activeBook.value ? activeBook.value.entries.length : 0;
});

const isNextEntryInDifferentBook = computed(() => {
  if (!activeBook.value) return false;
  const isLastEntryInBook = currentEntryIndex.value >= activeBook.value.entries.length - 1;
  if (!isLastEntryInBook) return false;

  const bookIds = Object.keys(worldBookCollection.value.books);
  const currentBookIndex = bookIds.indexOf(activeBook.value.id);
  return currentBookIndex < bookIds.length - 1;
});

const isPreviousEntryInDifferentBook = computed(() => {
  if (!activeBook.value) return false;
  const isFirstEntryInBook = currentEntryIndex.value <= 0;
  if (!isFirstEntryInBook) return false;

  const bookIds = Object.keys(worldBookCollection.value.books);
  const currentBookIndex = bookIds.indexOf(activeBook.value.id);
  return currentBookIndex > 0;
});

const goToPreviousEntry = () => {
  if (!activeBook.value) return;

  const isFirstEntryInBook = currentEntryIndex.value <= 0;

  if (isFirstEntryInBook) {
    const bookIds = Object.keys(worldBookCollection.value.books);
    const currentBookIndex = bookIds.indexOf(activeBook.value.id);
    if (currentBookIndex > 0) {
      const previousBookId = bookIds[currentBookIndex - 1];
      selectBook(previousBookId);
      nextTick(() => {
        if (activeBook.value && activeBook.value.entries.length > 0) {
          const lastEntryIndex = activeBook.value.entries.length - 1;
          selectEntry(String(lastEntryIndex));
          activeTab.value = 'editor';
        }
      });
    }
  } else {
    const prevEntryIndex = currentEntryIndex.value - 1;
    handleSelectEntry(activeBook.value.id, prevEntryIndex);
  }
};
const goToNextEntry = () => {
  if (!activeBook.value) return;

  const isLastEntryInBook = currentEntryIndex.value >= activeBook.value.entries.length - 1;

  if (isLastEntryInBook) {
    const bookIds = Object.keys(worldBookCollection.value.books);
    const currentBookIndex = bookIds.indexOf(activeBook.value.id);
    if (currentBookIndex < bookIds.length - 1) {
      const nextBookId = bookIds[currentBookIndex + 1];
      handleSelectBook(nextBookId);
    }
  } else {
    const nextEntryIndex = currentEntryIndex.value + 1;
    handleSelectEntry(activeBook.value.id, nextEntryIndex);
  }
};

const allKeywords = computed((): string[] => {
  if (!activeBook.value) {
    return [];
  }
  const allKeys = activeBook.value.entries.flatMap((entry: WorldBookEntry) => [...entry.key, ...entry.keysecondary]);
  return [...new Set(allKeys.filter((key: string) => key))] as string[]; // 过滤掉空字符串或null/undefined
});

const dragDropHandlers = useWorldBookDragDrop(
  worldBookCollection,
  moveEntryBetweenBooks,
  updateBookEntries,
  updateBookOrder,
  forceUpdateEntries
);

const closeMobileDrawer = () => {
  if (isMobile.value) {
    mobileDrawerVisible.value = false;
  }
};

const handleSelectBook = (bookId: string) => {
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

const handleSelectEntry = (bookId: string, entryIndex: number) => {
  if (activeBookId.value !== bookId) {
    selectBook(bookId);
    nextTick(() => {
      selectEntry(String(entryIndex));
      activeTab.value = 'editor';
      closeMobileDrawer();
    });
  } else {
    selectEntry(String(entryIndex));
    activeTab.value = 'editor';
    closeMobileDrawer();
  }
};

const addNewEntry = async (bookId?: string) => {
  const targetBookId = bookId || activeBookId.value;
  if (!targetBookId) {
    ElMessage.error('请先选择一个世界书 ');
    return;
  }
  if (activeBookId.value !== targetBookId) {
    selectBook(targetBookId);
    await nextTick();
    await addEntry();
  } else {
    await addEntry();
  }
  closeMobileDrawer();
};

const handleDuplicateEntry = async (bookId: string, entryIndex: number) => {
  if (activeBookId.value !== bookId) {
    selectBook(bookId);
    await nextTick();
    await duplicateEntry(entryIndex);
  } else {
    await duplicateEntry(entryIndex);
  }
  closeMobileDrawer();
};

const handleDeleteEntryFromList = (bookId: string, entryIndex: number) => {
  if (activeBookId.value !== bookId) {
    selectBook(bookId);
    nextTick(() => {
      if (activeBook.value && activeBook.value.entries[entryIndex]) {
        selectEntry(String(entryIndex));
        nextTick(() => {
          deleteSelectedEntry();
        });
      }
    });
  } else {
    selectEntry(String(entryIndex));
    nextTick(() => {
      deleteSelectedEntry();
    });
  }
};

const handleImportBookFile = (file: File) => {
  ElMessage.warning('请使用从酒馆导出的世界书进行导入');
  importBookFile(file);
};
</script>
