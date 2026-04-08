<template>
  <div class="card-worldbook-panel">
    <!-- 未绑定世界书的提示 -->
    <div
      v-if="!hasWorldBook"
      class="empty-state"
    >
      <el-empty description="当前角色卡未绑定世界书">
        <template #description>
          <div class="empty-description">
            <p>当前角色卡未绑定世界书</p>
            <p class="empty-hint">
              「创建」将为角色卡创建一个全新的空世界书；
              <br />
              「绑定」将从世界书数据库中选择一个现有世界书复制到角色卡中
            </p>
          </div>
        </template>
        <div class="empty-actions">
          <el-button
            type="primary"
            @click="handleCreateNewWorldBook"
          >
            <Icon icon="ph:plus-circle-duotone" />
            创建新世界书
          </el-button>
          <el-button @click="handleBindExistingWorldBook">
            <Icon icon="ph:link-duotone" />
            绑定已有世界书
          </el-button>
        </div>
      </el-empty>
    </div>

    <!-- 世界书编辑器 -->
    <div
      v-else
      class="worldbook-editor-wrapper"
    >
      <!-- 桌面端：分栏布局 -->
      <div class="worldbook-layout worldbook-layout-desktop">
        <Splitpanes class="default-theme">
          <Pane
            size="15"
            min-size="10"
            max-size="30"
          >
          <WorldBookList
            :collection="mockCollection"
            :active-book-id="worldbookDraft?.id || null"
            @select-book="handleSelectCurrentBook"
            @select-entry="onListSelectEntry"
            @create-book="handleCreateBookFromList"
            @rename-book="handleRenameCurrentWorldBook"
            @delete-book="handleDeleteCurrentWorldBook"
            @add-entry="onListAddEntry"
            @duplicate-entry="onListDuplicateEntry"
            @delete-entry="onListDeleteEntry"
            @copy-book="copyWorldBookToClipboard"
            @export-json="exportToJson"
            @import-book-file="handleUnsupportedImportBook"
            @clear-all="handleClearAllEntries"
            :selected-entry="selectedEntry"
            :drag-drop-handlers="dragDropHandlers"
            :hide-book-selector="true"
          />
          </Pane>
          <Pane
            size="85"
            min-size="70"
          >
            <div class="worldbook-editor-panel">
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
                <div class="editor-actions">
                  <el-tooltip
                    content="保存状态"
                    placement="top"
                  >
                    <el-tag
                      :type="saveStatusType"
                      size="small"
                    >
                      {{ saveStatusText }}
                    </el-tag>
                  </el-tooltip>
                  <el-button-group size="small">
                    <el-button @click="toggleAutoSaveMode">
                      <Icon :icon="autoSaveMode === 'auto' ? 'ph:floppy-disk-duotone' : 'ph:hand-eye-duotone'" />
                      {{ autoSaveMode === 'auto' ? '自动保存' : '监听模式' }}
                    </el-button>
                    <el-button
                      v-if="selectedEntry"
                      @click="saveCurrentEntry"
                      :disabled="saveStatus === 'saved'"
                    >
                      <Icon icon="ph:floppy-disk-duotone" />
                      保存
                    </el-button>
                    <el-button
                      v-if="selectedEntry"
                      type="danger"
                      @click="deleteSelectedEntry"
                    >
                      <Icon icon="ph:trash-duotone" />
                      删除
                    </el-button>
                  </el-button-group>
                </div>
              </div>
              <div class="worldbook-editor-container">
                <WorldBookEditor
                  v-if="selectedEntry"
                  :entry="selectedEntry"
                  v-model="editableEntry"
                  :all-keywords="allKeywords"
                  :current-entry-index="currentEntryIndex"
                  :total-entries="totalEntries"
                  @go-to-previous="goToPreviousEntry"
                  @go-to-next="goToNextEntry"
                  :is-next-entry-in-different-book="false"
                  :is-previous-entry-in-different-book="false"
                  :save-status="saveStatus"
                />
                <div
                  v-else
                  class="editor-empty-state"
                >
                  <el-empty
                    description="请选择一个条目进行编辑"
                    :image-size="100"
                  />
                </div>
              </div>
            </div>
          </Pane>
        </Splitpanes>
      </div>

      <!-- 移动端：标签页布局 -->
      <div class="worldbook-layout worldbook-layout-mobile">
        <el-tabs
          v-model="mobileActiveTab"
          type="border-card"
          class="worldbook-mobile-tabs"
        >
          <el-tab-pane
            name="list"
            label="条目列表"
          >
            <WorldBookList
              :collection="mockCollection"
              :active-book-id="worldbookDraft?.id || null"
              @select-book="handleSelectCurrentBook"
              @select-entry="handleMobileSelectEntry"
              @create-book="handleCreateBookFromList"
              @rename-book="handleRenameCurrentWorldBook"
              @delete-book="handleDeleteCurrentWorldBook"
              @add-entry="onListAddEntry"
              @duplicate-entry="onListDuplicateEntry"
              @delete-entry="onListDeleteEntry"
              @copy-book="copyWorldBookToClipboard"
              @export-json="exportToJson"
              @import-book-file="handleUnsupportedImportBook"
              @clear-all="handleClearAllEntries"
              :selected-entry="selectedEntry"
              :drag-drop-handlers="dragDropHandlers"
              :hide-book-selector="true"
            />
          </el-tab-pane>
          <el-tab-pane
            name="editor"
            :label="selectedEntry ? selectedEntry.comment || '新条目' : '编辑器'"
          >
            <div class="worldbook-editor-panel-mobile">
              <div class="content-panel-header-mobile">
                <h2 class="content-panel-title-mobile">
                  <Icon
                    icon="ph:note-pencil-duotone"
                    class="content-panel-icon"
                  />
                  {{ selectedEntry ? selectedEntry.comment || '新条目' : '未选择条目' }}
                </h2>
                <div class="editor-actions-mobile">
                  <el-tag
                    :type="saveStatusType"
                    size="small"
                  >
                    {{ saveStatusText }}
                  </el-tag>
                  <el-dropdown @command="handleMobileActionCommand">
                    <el-button size="small">
                      <Icon icon="ph:dots-three-bold" />
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="toggleAutoSave">
                          <Icon :icon="autoSaveMode === 'auto' ? 'ph:floppy-disk-duotone' : 'ph:hand-eye-duotone'" />
                          {{ autoSaveMode === 'auto' ? '自动保存' : '监听模式' }}
                        </el-dropdown-item>
                        <el-dropdown-item
                          v-if="selectedEntry"
                          command="save"
                          :disabled="saveStatus === 'saved'"
                        >
                          <Icon icon="ph:floppy-disk-duotone" />
                          保存
                        </el-dropdown-item>
                        <el-dropdown-item
                          v-if="selectedEntry"
                          command="delete"
                          divided
                        >
                          <Icon icon="ph:trash-duotone" />
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
              <div class="worldbook-editor-container">
                <WorldBookEditor
                  v-if="selectedEntry"
                  :entry="selectedEntry"
                  v-model="editableEntry"
                  :all-keywords="allKeywords"
                  :current-entry-index="currentEntryIndex"
                  :total-entries="totalEntries"
                  @go-to-previous="goToPreviousEntry"
                  @go-to-next="goToNextEntry"
                  :is-next-entry-in-different-book="false"
                  :is-previous-entry-in-different-book="false"
                  :save-status="saveStatus"
                />
                <div
                  v-else
                  class="editor-empty-state"
                >
                  <el-empty
                    description="请从左侧选择一个条目进行编辑"
                    :image-size="80"
                  />
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 世界书选择对话框 -->
    <WorldBookSelectorDialog
      v-model="showWorldBookSelector"
      @confirm="handleBindWorldBook"
    />

    <!-- 世界书选择对话框 (用于替换) -->
    <WorldBookSelectorDialog
      v-model="showReplaceWorldBookSelector"
      @confirm="handleConfirmReplace"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog
      ref="confirmDialogRef"
      :title="confirmConfig.title"
      :message="confirmConfig.message"
      :type="confirmConfig.type"
      :confirm-text="confirmConfig.confirmText"
      :cancel-text="confirmConfig.cancelText"
      @confirm="confirmConfig.onConfirm"
      @cancel="confirmConfig.onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import {
  ElButton,
  ElButtonGroup,
  ElDropdown,
  ElDropdownItem,
  ElEmpty,
  ElMessage,
  ElMessageBox,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTooltip,
} from 'element-plus';
import { Pane, Splitpanes } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { computed, ref, watch } from 'vue';
import '../../../css/worldbook.css';

import WorldBookEditor from '@/components/worldbook/WorldBookEditor.vue';
import WorldBookList from '@/components/worldbook/WorldBookList.vue';
import WorldBookSelectorDialog from '@/components/cardManager/components/WorldBookSelectorDialog.vue';
import { useWorldBookDragDrop } from '@/composables/worldbook/useWorldBookDragDrop';
import { useWorldBookEntry } from '@/composables/worldbook/useWorldBookEntry';
import { worldBookService } from '@/database/worldBookService';
import type { CharacterBook } from '@/types/character/character-book';
import type { CharacterCardV3 } from '@/types/character/character-card-v3';
import type { WorldBook, WorldBookCollection, WorldBookEntry } from '@/types/worldbook';
import { convertCharacterBookToWorldBook, convertWorldBookToCharacterBook } from '@/utils/worldBookConverter';
import ConfirmDialog from '../components/ConfirmDialog.vue';

// 移动端状态
const mobileActiveTab = ref<'list' | 'editor'>('list');

interface Props {
  character: CharacterCardV3;
}

interface Emits {
  (e: 'worldbookChanged'): void;
  (e: 'update:characterBook', value: CharacterCardV3['data']['character_book']): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const updateCharacterBook = (characterBook: CharacterCardV3['data']['character_book']) => {
  emit('update:characterBook', characterBook);
  emit('worldbookChanged');
};

const normalizeCharacterBook = (
  characterBook: CharacterCardV3['data']['character_book']
): CharacterBook | null => {
  if (!characterBook || Array.isArray(characterBook)) {
    return null;
  }

  return {
    ...characterBook,
    extensions: characterBook.extensions ?? {},
    entries: characterBook.entries ?? [],
  };
};

const getCharacterBookSnapshot = (characterBook: CharacterCardV3['data']['character_book']) => {
  const normalizedBook = normalizeCharacterBook(characterBook);
  return normalizedBook ? JSON.stringify(normalizedBook) : '';
};

const cloneWorldBook = (book: WorldBook): WorldBook => JSON.parse(JSON.stringify(book)) as WorldBook;

const showWorldBookSelector = ref(false);
const showReplaceWorldBookSelector = ref(false);
const confirmDialogRef = ref<InstanceType<typeof ConfirmDialog>>();
const worldbookDraft = ref<WorldBook | null>(null);
const worldbookDraftVersion = ref(0);
const lastCommittedSnapshot = ref('');

// 确认对话框配置
const confirmConfig = ref({
  title: '确认操作',
  message: '',
  type: 'info' as 'info' | 'warning' | 'danger',
  confirmText: '确认',
  cancelText: '取消',
  onConfirm: () => {},
  onCancel: () => {},
});

// 计算属性：是否有世界书
const hasWorldBook = computed(() => {
  return !!worldbookDraft.value;
});

const assignWorldBookDraft = (book: WorldBook | null) => {
  if (!book) {
    worldbookDraft.value = null;
    return;
  }

  worldbookDraftVersion.value += 1;
  const nextDraft = cloneWorldBook(book);
  nextDraft.id = `character-book-${props.character.id || 'draft'}-${worldbookDraftVersion.value}`;
  worldbookDraft.value = nextDraft;
};

const initializeWorldBookDraft = (characterBook: CharacterCardV3['data']['character_book']) => {
  const normalizedBook = normalizeCharacterBook(characterBook);
  lastCommittedSnapshot.value = normalizedBook ? JSON.stringify(normalizedBook) : '';

  if (!normalizedBook) {
    worldbookDraft.value = null;
    return;
  }

  assignWorldBookDraft(convertCharacterBookToWorldBook(normalizedBook, 'character-book'));
};

const commitWorldBookDraft = () => {
  if (!worldbookDraft.value) return;

  const characterBook = convertWorldBookToCharacterBook(worldbookDraft.value);
  lastCommittedSnapshot.value = getCharacterBookSnapshot(characterBook);
  updateCharacterBook(characterBook);
};

watch(
  () => getCharacterBookSnapshot(props.character.data.character_book),
  (snapshot) => {
    if (snapshot === lastCommittedSnapshot.value) return;
    initializeWorldBookDraft(props.character.data.character_book);
  },
  { immediate: true }
);

// 创建一个模拟的 collection，只包含当前角色卡的世界书
const mockCollection = computed<WorldBookCollection>(() => {
  if (!worldbookDraft.value) {
    return {
      books: {} as Record<string, WorldBook>,
      activeBookId: null,
    } as WorldBookCollection;
  }

  return {
    books: {
      [worldbookDraft.value.id]: worldbookDraft.value,
    },
    activeBookId: worldbookDraft.value.id,
  };
});

// 使用 useWorldBookEntry 管理条目编辑
const {
  selectedEntry,
  editableEntry,
  // activeTab,
  addNewEntry: addEntry,
  handleSelectEntry: selectEntry,
  saveCurrentEntry: saveEntry,
  deleteSelectedEntry: deleteEntry,
  duplicateEntry: duplicateEntryAction,
  saveStatus,
  autoSaveMode,
  hasUnsavedChanges,
  toggleAutoSaveMode,
  exportToJson,
  copyWorldBookToClipboard,
} = useWorldBookEntry(worldbookDraft as any, {
  updateEntries: async (entries: WorldBookEntry[]) => {
    if (worldbookDraft.value) {
      worldbookDraft.value.entries = entries;
      commitWorldBookDraft();
    }
  },
  updateEntry: async (entry: WorldBookEntry) => {
    if (worldbookDraft.value) {
      const idx = worldbookDraft.value.entries.findIndex((e) => e.uid === entry.uid);
      if (idx !== -1) {
        worldbookDraft.value.entries[idx] = entry;
      }
      commitWorldBookDraft();
    }
  },
  addEntry: async (entry: WorldBookEntry) => {
    if (!worldbookDraft.value) return null;
    worldbookDraft.value.entries.push(entry);
    commitWorldBookDraft();
    return entry;
  },
  deleteEntry: async (entryId: number) => {
    if (!worldbookDraft.value) return false;
    const index = worldbookDraft.value.entries.findIndex((e) => e.uid === entryId);
    if (index !== -1) {
      worldbookDraft.value.entries.splice(index, 1);
      commitWorldBookDraft();
      return true;
    }
    return false;
  },
});

// 拖拽功能（仅针对当前角色的内嵌世界书）
const dragDropHandlers = useWorldBookDragDrop(
  mockCollection as any,
  // moveEntryBetweenBooks
  (_entryToMove: WorldBookEntry, _fromBookId: string, _toBookId: string, _insertIndex: number) => {
    // 只有一个世界书，不支持跨书移动
    return;
  },
  // updateBookEntries
  (_bookId: string, entries: WorldBookEntry[]) => {
    if (worldbookDraft.value) {
      worldbookDraft.value.entries = entries;
      commitWorldBookDraft();
    }
  },
  // updateBookOrder（无实际作用，单本书）
  (_orderedBookIds: string[]) => {
    // no-op
  },
  // forceUpdateEntries（单本书无需额外强刷）
  () => {
    // no-op
  }
);

// 计算属性
const allKeywords = computed(() => {
  if (!worldbookDraft.value) return [];
  const keywords = new Set<string>();
  worldbookDraft.value.entries.forEach((entry) => {
    if (entry.key && Array.isArray(entry.key)) {
      entry.key.forEach((k) => keywords.add(k));
    }
    if (entry.keysecondary && Array.isArray(entry.keysecondary)) {
      entry.keysecondary.forEach((k) => keywords.add(k));
    }
  });
  return Array.from(keywords);
});

const currentEntryIndex = computed(() => {
  if (!worldbookDraft.value || !selectedEntry.value) return -1;
  return worldbookDraft.value.entries.findIndex((e) => e.uid === selectedEntry.value!.uid);
});

const totalEntries = computed(() => {
  return worldbookDraft.value?.entries.length || 0;
});

const saveStatusType = computed(() => {
  // 未保存时给出提示色
  if (hasUnsavedChanges.value) return 'danger';
  switch (saveStatus.value) {
    case 'saved':
      return 'success';
    case 'saving':
      return 'warning';
    case 'error':
      return 'danger';
    default:
      return 'info';
  }
});

const saveStatusText = computed(() => {
  if (hasUnsavedChanges.value) return '未保存';
  switch (saveStatus.value) {
    case 'saved':
      return '已保存';
    case 'saving':
      return '保存中...';
    case 'error':
      return '保存失败';
    default:
      return '空闲';
  }
});

const onListAddEntry = (_bookId: string) => {
  addEntry();
};

// WorldBookList 事件适配：入参为 (bookId, entryIndex)
const onListSelectEntry = (_bookId: string, entryIndex: number) => {
  selectEntry(String(entryIndex));
};

const handleSelectCurrentBook = () => {
  selectEntry(null);
};

const saveCurrentEntry = () => {
  saveEntry();
};

const deleteSelectedEntry = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个条目吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await deleteEntry();
  } catch {
    // 用户取消
  }
};

const onListDuplicateEntry = (_bookId: string, entryIndex: number) => {
  duplicateEntryAction(entryIndex);
};

const onListDeleteEntry = async (_bookId: string, entryIndex: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个条目吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    selectEntry(String(entryIndex));
    await deleteEntry();
  } catch {
    // 用户取消
  }
};

const goToPreviousEntry = () => {
  if (currentEntryIndex.value > 0 && worldbookDraft.value) {
    const prevIndex = currentEntryIndex.value - 1;
    selectEntry(String(prevIndex));
  }
};

const goToNextEntry = () => {
  if (worldbookDraft.value && currentEntryIndex.value < worldbookDraft.value.entries.length - 1) {
    const nextIndex = currentEntryIndex.value + 1;
    selectEntry(String(nextIndex));
  }
};

const handleCreateNewWorldBook = () => {
  initializeWorldBookDraft({
    name: `${props.character.name}的世界书`,
    entries: [],
    extensions: {},
  });
  commitWorldBookDraft();
  ElMessage.success('已创建新世界书');
};

const clearWorldBookBinding = () => {
  worldbookDraft.value = null;
  lastCommittedSnapshot.value = '';
  updateCharacterBook(undefined);
};

const handleCreateBookFromList = async () => {
  if (!hasWorldBook.value) {
    handleCreateNewWorldBook();
    return;
  }

  try {
    await ElMessageBox.confirm(
      `这会用一个新的空世界书替换当前绑定的「${worldbookDraft.value?.name || '未命名世界书'}」，当前内容将丢失。确定继续吗？`,
      '新建世界书',
      {
        confirmButtonText: '确认替换',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    handleCreateNewWorldBook();
  } catch {
    // 用户取消
  }
};

const handleRenameCurrentWorldBook = async () => {
  if (!worldbookDraft.value) {
    ElMessage.warning('当前没有可重命名的世界书');
    return;
  }

  try {
    const renameBookResult = await ElMessageBox.prompt('请输入新的世界书名称：', '重命名世界书', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputValue: worldbookDraft.value.name,
      inputPattern: /.+/,
      inputErrorMessage: '名称不能为空',
    });
    const { value: newBookName } = renameBookResult as { value: string };

    worldbookDraft.value.name = newBookName;
    commitWorldBookDraft();
    ElMessage.success('世界书已重命名');
  } catch {
    // 用户取消
  }
};

const handleDeleteCurrentWorldBook = async () => {
  if (!worldbookDraft.value) {
    ElMessage.warning('当前角色卡未绑定世界书');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要移除当前角色卡绑定的世界书「${worldbookDraft.value.name || '未命名世界书'}」吗？此操作会清空角色卡内置世界书内容。`,
      '移除世界书绑定',
      {
        confirmButtonText: '确认移除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    clearWorldBookBinding();
    ElMessage.success('已移除当前角色卡的世界书绑定');
  } catch {
    // 用户取消
  }
};

const handleUnsupportedImportBook = (_file: File) => {
  ElMessage.error('内嵌世界书编辑器不支持从文件直接导入为新世界书，请到世界书页面操作');
};

const handleClearAllEntries = async () => {
  if (!worldbookDraft.value) {
    ElMessage.warning('当前角色卡未绑定世界书');
    return;
  }

  if (worldbookDraft.value.entries.length === 0) {
    ElMessage.info('当前世界书没有可清空的条目');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要清空世界书「${worldbookDraft.value.name || '未命名世界书'}」中的所有条目吗？此操作不可恢复。`,
      '清空所有条目',
      {
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    selectEntry(null);
    worldbookDraft.value.entries = [];
    commitWorldBookDraft();
    ElMessage.success('已清空当前世界书的所有条目');
  } catch {
    // 用户取消
  }
};

const handleBindExistingWorldBook = () => {
  showWorldBookSelector.value = true;
};

const handleBindWorldBook = async (bookId: string) => {
  try {
    const collection = await worldBookService.getFullWorldBookCollection();
    const book = collection.books[bookId];
    if (book) {
      assignWorldBookDraft(book);
      commitWorldBookDraft();
      ElMessage.success(`已绑定世界书: ${book.name}`);
    } else {
      ElMessage.error('未找到选中的世界书');
    }
  } catch (error) {
    console.error('绑定世界书失败:', error);
    ElMessage.error('绑定世界书失败');
  }
};

// 移动端选择条目后自动切换到编辑器标签页
const handleMobileSelectEntry = (bookId: string, entryIndex: number) => {
  onListSelectEntry(bookId, entryIndex);
  mobileActiveTab.value = 'editor';
};

// 移动端下拉菜单命令处理
const handleMobileActionCommand = (command: string) => {
  switch (command) {
    case 'toggleAutoSave':
      toggleAutoSaveMode();
      break;
    case 'save':
      saveCurrentEntry();
      break;
    case 'delete':
      deleteSelectedEntry();
      break;
  }
};

// 添加到 DB
const handleAddToDB = async () => {
  if (!worldbookDraft.value) {
    ElMessage.error('没有可添加的世界书');
    return;
  }

  const characterBook = convertWorldBookToCharacterBook(worldbookDraft.value);

  try {
    // 检查是否已存在同名世界书
    const collection = await worldBookService.getFullWorldBookCollection();
    const existingBook = Object.values(collection.books).find((book) => book.name === worldbookDraft.value?.name);

    if (existingBook) {
      // 如果存在同名世界书，询问用户
      confirmConfig.value = {
        title: '世界书已存在',
        message: `数据库中已存在名为「${worldbookDraft.value.name}」的世界书。\n是否要更新该世界书的内容？`,
        type: 'warning',
        confirmText: '更新',
        cancelText: '取消',
        onConfirm: async () => {
          try {
            if (worldbookDraft.value) {
              const draftCharacterBook = convertWorldBookToCharacterBook(worldbookDraft.value);
              // updateBookFromCharacterCard 只需要 bookId, characterBook, characterName 三个参数
              await worldBookService.updateBookFromCharacterCard(
                existingBook.id,
                draftCharacterBook,
                props.character.name
              );
              ElMessage.success('已更新世界书到数据库');
              confirmDialogRef.value?.close();
            }
          } catch (error) {
            console.error('更新世界书失败:', error);
            ElMessage.error('更新世界书失败');
          }
        },
        onCancel: () => {
          confirmDialogRef.value?.close();
        },
      };
      confirmDialogRef.value?.open();
    } else {
      // 不存在同名世界书，直接添加
      await worldBookService.addBookFromCharacterCard(
        characterBook as CharacterBook,
        props.character.id || '',
        props.character.name
      );
      ElMessage.success('已添加世界书到数据库');
    }
  } catch (error) {
    console.error('添加世界书到数据库失败:', error);
    ElMessage.error('添加世界书到数据库失败');
  }
};

// 从 DB 替换
const handleReplaceFromDB = () => {
  // 显示确认对话框
  confirmConfig.value = {
    title: '确认替换世界书',
    message: `此操作将用数据库中的世界书完全替换当前角色卡的世界书。\n当前世界书「${worldbookDraft.value?.name || '未命名世界书'}」的所有内容将被覆盖且无法恢复。\n\n确定要继续吗？`,
    type: 'danger',
    confirmText: '确认替换',
    cancelText: '取消',
    onConfirm: () => {
      // 打开世界书选择器
      showReplaceWorldBookSelector.value = true;
      confirmDialogRef.value?.close();
    },
    onCancel: () => {
      confirmDialogRef.value?.close();
    },
  };
  confirmDialogRef.value?.open();
};

// 确认替换世界书
const handleConfirmReplace = async (bookId: string) => {
  try {
    const collection = await worldBookService.getFullWorldBookCollection();
    const book = collection.books[bookId];
    if (book) {
      assignWorldBookDraft(book);
      commitWorldBookDraft();
      ElMessage.success(`已替换为世界书: ${book.name}`);
    } else {
      ElMessage.error('未找到选中的世界书');
    }
  } catch (error) {
    console.error('替换世界书失败:', error);
    ElMessage.error('替换世界书失败');
  }
};

// 暴露方法和属性给父组件
defineExpose({
  handleAddToDB,
  handleReplaceFromDB,
  handleRemoveWorldBook: handleDeleteCurrentWorldBook,
  currentWorldBookName: computed(() => worldbookDraft.value?.name || '未命名世界书'),
  hasWorldBook,
});
</script>

<style scoped>
@import '@/css/card-manager-panels.css';

.card-worldbook-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.empty-description {
  text-align: center;
}

.empty-description p {
  margin: 8px 0;
}

.empty-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  margin-top: 12px;
}

.worldbook-editor-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.worldbook-layout {
  flex: 1;
  overflow: hidden;
  height: 100%;
  min-height: 0;
}

.worldbook-layout-desktop {
  display: flex;
  flex-direction: column;
}

.worldbook-layout-desktop :deep(.splitpanes) {
  height: 100%;
}

.worldbook-layout-desktop :deep(.splitpanes__pane) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.worldbook-layout-mobile {
  display: none;
}

@media (max-width: 1023px) {
  .worldbook-layout-desktop {
    display: none;
  }

  .worldbook-layout-mobile {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}

/* 移动端标签页 */
.worldbook-mobile-tabs {
  height: 100%;
}

.worldbook-mobile-tabs :deep(.el-tabs__content) {
  height: calc(100% - 48px);
  padding: 0;
  overflow: hidden;
}

.worldbook-mobile-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.worldbook-editor-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  /* 关键：允许内容缩小 */
}

/* WorldBookEditor 容器 */
.worldbook-editor-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* WorldBookEditor 内部滚动条样式 */
.worldbook-editor-container :deep(.worldbook-editor-scrollbar) {
  height: 100%;
}

.worldbook-editor-container :deep(.el-scrollbar__wrap) {
  overflow-x: hidden !important;
}

.worldbook-editor-panel-mobile {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  overflow: hidden;
  min-height: 0;
}

.worldbook-editor-panel-mobile .worldbook-editor-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

</style>
