import { ElMessage, ElMessageBox } from 'element-plus';
import { copyToClipboard } from '../../../utils/clipboard';
import { createDefaultEntryData } from './useWorldBookEntryData';
import type { WorldBookEntry, WorldBook } from '@/types/worldbook';
import type { Ref } from 'vue';

type EntryCallbacks = {
  updateEntries: (entries: WorldBookEntry[]) => Promise<void>;
  updateEntry: (entry: WorldBookEntry) => Promise<void>;
  addEntry: (entry: WorldBookEntry) => Promise<WorldBookEntry | null>;
  deleteEntry: (entryId: number) => Promise<boolean>;
};

type EntryState = {
  activeBook: Ref<WorldBook | null>;
  activeBookEntries: Ref<WorldBookEntry[]>;
  selectedEntry: Ref<WorldBookEntry | null>;
  selectedEntryIndex: Ref<number | null>;
  editableEntry: Ref<Partial<WorldBookEntry>>;
  activeTab: Ref<'list' | 'editor'>;
  lastSavedData: Ref<string>;
  hasUnsavedChanges: Ref<boolean>;
};

export function useWorldBookEntryActions(state: EntryState, callbacks: EntryCallbacks) {
  const {
    activeBook,
    activeBookEntries,
    selectedEntry,
    selectedEntryIndex,
    editableEntry,
    activeTab,
    lastSavedData,
    hasUnsavedChanges,
  } = state;

  const addNewEntry = async () => {
    if (!activeBook.value) {
      ElMessage.error('没有活动的世界书，无法添加新条目');
      return;
    }
    const newUid = Date.now();
    const newEntryData = createDefaultEntryData(newUid);
    newEntryData.comment = `新条目 ${activeBook.value.entries.length + 1}`;

    const addedEntry = await callbacks.addEntry(newEntryData);

    if (addedEntry) {
      selectedEntryIndex.value = 0;
      activeTab.value = 'editor';
    }
  };

  const handleReorderEntries = async (newOrder: WorldBookEntry[]) => {
    if (activeBook.value) {
      activeBook.value.entries = newOrder;
      await callbacks.updateEntries(newOrder);
      ElMessage.success('条目顺序已更新！');
    }
  };

  const saveCurrentEntry = async () => {
    if (selectedEntry.value && editableEntry.value.uid) {
      const entryToSave = JSON.parse(JSON.stringify(editableEntry.value)) as WorldBookEntry;

      const targetIndex = activeBookEntries.value.findIndex((e) => e.uid === entryToSave.uid);
      if (targetIndex !== -1) {
        activeBookEntries.value[targetIndex] = entryToSave;
      }

      await callbacks.updateEntry(entryToSave);

      lastSavedData.value = JSON.stringify(entryToSave);
      hasUnsavedChanges.value = false;

      ElMessage.success('条目已保存！');
    } else {
      console.error('[useWorldBookEntry] 保存失败：缺少必要数据');
      ElMessage.error('无法保存条目，缺少UID或未选择条目');
    }
  };

  const deleteSelectedEntry = async (): Promise<void> => {
    const entryToDelete = selectedEntry.value;
    const currentIndex = selectedEntryIndex.value;

    if (!entryToDelete) {
      ElMessage.error('无法删除条目：未选择任何条目');
      return;
    }
    if (!activeBook.value) {
      ElMessage.error('无法删除条目：没有活动的世界书');
      return;
    }
    // 允许两种上下文：
    // - 世界书数据库：使用数据库主键 id
    // - 角色卡内联世界书：可能没有 id，改用 uid
    const deleteKey = entryToDelete.id ?? entryToDelete.uid;
    if (deleteKey === undefined) {
      ElMessage.error('无法删除条目：缺少标识 (id/uid)');
      return;
    }

    try {
      const hasRemainingEntries = await callbacks.deleteEntry(deleteKey);

      if (hasRemainingEntries) {
        const newIndex = Math.min(currentIndex ?? 0, activeBook.value.entries.length - 1);
        selectedEntryIndex.value = newIndex;
      } else {
        selectedEntryIndex.value = null;
        activeTab.value = 'list';
      }

      ElMessage.success('条目已成功删除');
    } catch (error) {
      console.error('删除条目时发生错误:', error);
      ElMessage.error(`删除条目失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const copySelectedEntry = async (): Promise<void> => {
    if (!selectedEntry.value) {
      ElMessage.warning('请先选择一个条目进行复制');
      return;
    }
    const entryToCopy = { ...selectedEntry.value };
    delete entryToCopy.uid;
    delete entryToCopy.id;
    const jsonData = JSON.stringify(entryToCopy, null, 2);
    await copyToClipboard(jsonData, '当前条目数据已复制到剪贴板！');
  };

  const duplicateEntry = async (entryIndex: number): Promise<void> => {
    if (!activeBook.value) {
      ElMessage.error('没有活动的世界书，无法复制条目');
      return;
    }

    const entryToDuplicate = activeBookEntries.value[entryIndex];
    if (!entryToDuplicate) {
      ElMessage.error('无法找到要复制的条目');
      return;
    }

    const newEntryData = JSON.parse(JSON.stringify(entryToDuplicate)) as WorldBookEntry;
    const newUid = Date.now();
    newEntryData.uid = newUid;
    delete newEntryData.id;

    const originalComment = entryToDuplicate.comment || '条目';
    const match = originalComment.match(/^(.+?)\s*\((\d+)\)$/);
    const baseName = match ? match[1] : originalComment;

    const relatedEntries = activeBookEntries.value.filter((entry) => {
      const entryComment = entry.comment || '';
      return (
        entryComment === baseName ||
        entryComment.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(\\d+\\)$`))
      );
    });

    let maxNumber = 0;
    relatedEntries.forEach((entry) => {
      const entryComment = entry.comment || '';
      const entryMatch = entryComment.match(/\((\d+)\)$/);
      if (entryMatch) {
        const num = parseInt(entryMatch[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    const nextNumber = maxNumber + 1;
    newEntryData.comment = `${baseName} (${nextNumber})`;

    try {
      const addedEntry = await callbacks.addEntry(newEntryData);
      if (addedEntry) {
        selectedEntryIndex.value = 0;
        activeTab.value = 'editor';
        ElMessage.success(`已复制条目为: ${newEntryData.comment}`);
      }
    } catch (error) {
      console.error('[duplicateEntry] 复制条目失败:', error);
      ElMessage.error('复制条目失败');
    }
  };

  const clearAllEntries = async (): Promise<void> => {
    if (!activeBook.value) {
      ElMessage.warning('没有活动的世界书可供清空');
      return;
    }
    try {
      await ElMessageBox.confirm(
        `确定要清空世界书 "${activeBook.value.name}" 中的所有条目吗？此操作不可恢复！`,
        '清空当前世界书',
        { confirmButtonText: '确认清空', cancelButtonText: '取消', type: 'warning' }
      );
      if (activeBook.value) {
        activeBook.value.entries = [];
        await callbacks.updateEntries([]);
      }
      selectedEntryIndex.value = null;
      editableEntry.value = {};
      activeTab.value = 'list';
    } catch (err) {
      if (err !== 'cancel' && err !== 'close') ElMessage.info('清空操作已取消');
    }
  };

  const forceUpdateEntries = () => {
    if (activeBook.value) {
      activeBook.value.entries = [...activeBook.value.entries];
    }
  };

  return {
    addNewEntry,
    handleReorderEntries,
    saveCurrentEntry,
    deleteSelectedEntry,
    copySelectedEntry,
    duplicateEntry,
    clearAllEntries,
    forceUpdateEntries,
  };
}
