import { ref, computed, watch, type Ref } from 'vue';
import type { WorldBookEntry, WorldBook } from '@/types/worldbook';

export function useWorldBookEntryState(activeBook: Ref<WorldBook | null>) {
  const selectedEntryIndex = ref<number | null>(null);
  const editableEntry = ref<Partial<WorldBookEntry>>({});
  const activeTab = ref<'list' | 'editor'>('list');
  const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSaveTime = ref<Date | null>(null);
  const hasUnsavedChanges = ref(false);
  const lastSavedData = ref<string>('');

  const activeBookEntries = computed<WorldBookEntry[]>(() => {
    return activeBook.value ? activeBook.value.entries : [];
  });

  const selectedEntry = computed<WorldBookEntry | null>(() => {
    const index = selectedEntryIndex.value;
    if (index === null) return null;
    return activeBookEntries.value[index] || null;
  });

  watch(
    activeBook,
    (newBook, oldBook) => {
      if (newBook?.id !== oldBook?.id) {
        selectedEntryIndex.value = null;
        editableEntry.value = {};
        activeTab.value = newBook && newBook.entries.length > 0 ? 'editor' : 'list';
      }
    },
    { deep: true }
  );

  watch(
    selectedEntryIndex,
    (newIndex) => {
      if (newIndex !== null && activeBookEntries.value[newIndex]) {
        const newEntry = activeBookEntries.value[newIndex];
        editableEntry.value = JSON.parse(JSON.stringify(newEntry));
        lastSavedData.value = JSON.stringify(editableEntry.value);
        hasUnsavedChanges.value = false;
      } else {
        editableEntry.value = {};
        lastSavedData.value = '';
        hasUnsavedChanges.value = false;
      }
    },
    { immediate: true }
  );

  watch(
    editableEntry,
    () => {
      const currentData = JSON.stringify(editableEntry.value);
      hasUnsavedChanges.value = currentData !== lastSavedData.value;
    },
    { deep: true }
  );

  const handleSelectEntry = (indexStr: string | null) => {
    if (indexStr === null) {
      selectedEntryIndex.value = null;
      return;
    }
    const index = parseInt(indexStr, 10);
    if (index >= 0 && index < activeBookEntries.value.length) {
      selectedEntryIndex.value = index;
      activeTab.value = 'editor';
    }
  };

  return {
    selectedEntryIndex,
    editableEntry,
    activeTab,
    saveStatus,
    lastSaveTime,
    hasUnsavedChanges,
    lastSavedData,
    activeBookEntries,
    selectedEntry,
    handleSelectEntry,
  };
}
