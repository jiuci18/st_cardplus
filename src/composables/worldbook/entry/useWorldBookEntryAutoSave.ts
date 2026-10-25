import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue';
import { ElMessage } from 'element-plus';
import { initAutoSave, clearAutoSave } from '../../../utils/localStorageUtils';
import { autoSaveModeMessage, nextAutoSaveMode, useAutoSaveSettings, type AutoSaveMode } from '../../useAutoSaveSettings';
import { now } from '../../../utils/datetime';
import type { WorldBookEntry } from '@/types/worldbook';

type EntryCallbacks = {
  updateEntry: (entry: WorldBookEntry) => Promise<void>;
};

type EntryState = {
  selectedEntry: Ref<WorldBookEntry | null>;
  editableEntry: Ref<Partial<WorldBookEntry>>;
  hasUnsavedChanges: Ref<boolean>;
  lastSavedData: Ref<string>;
  saveStatus: Ref<'idle' | 'saving' | 'saved' | 'error'>;
  lastSaveTime: Ref<Date | null>;
  activeBookEntries: Ref<WorldBookEntry[]>;
};

export function useWorldBookEntryAutoSave(state: EntryState, callbacks: EntryCallbacks) {
  const {
    selectedEntry,
    editableEntry,
    hasUnsavedChanges,
    lastSavedData,
    saveStatus,
    lastSaveTime,
    activeBookEntries,
  } = state;

  const autoSaveMode = ref<AutoSaveMode>('watch');
  const isAutoSaving = ref(false);
  let autoSaveTimer: number | null = null;
  const { intervalMs, debounceMs } = useAutoSaveSettings();
  const restartAutoSaveTimer = () => {
    if (autoSaveTimer) {
      clearAutoSave(autoSaveTimer);
    }
    autoSaveTimer = initAutoSave(
      () => {
        if (autoSaveMode.value === 'auto') {
          autoSaveCurrentEntry();
        }
      },
      () => !!selectedEntry.value && !!editableEntry.value.uid,
      intervalMs.value
    );
  };
  watch(intervalMs, restartAutoSaveTimer);

  const toggleAutoSaveMode = () => {
    autoSaveMode.value = nextAutoSaveMode(autoSaveMode.value);
    ElMessage.info(autoSaveModeMessage(autoSaveMode.value, intervalMs.value, debounceMs.value));
  };

  const autoSaveCurrentEntry = async () => {
    if (autoSaveMode.value === 'manual') return;
    if (!selectedEntry.value || !editableEntry.value.uid) return;
    if (!hasUnsavedChanges.value) return;
    if (isAutoSaving.value) return;

    isAutoSaving.value = true;
    saveStatus.value = 'saving';

    try {
      const entryToSave = JSON.parse(JSON.stringify(editableEntry.value)) as WorldBookEntry;
      const targetIndex = activeBookEntries.value.findIndex((e) => e.uid === entryToSave.uid);

      if (targetIndex !== -1) {
        activeBookEntries.value[targetIndex] = entryToSave;
      }

      await callbacks.updateEntry(entryToSave);

      lastSavedData.value = JSON.stringify(entryToSave);
      hasUnsavedChanges.value = false;
      saveStatus.value = 'saved';
      lastSaveTime.value = now();

      setTimeout(() => {
        if (saveStatus.value === 'saved') {
          saveStatus.value = 'idle';
        }
      }, 2000);
    } catch (error) {
      console.error('[useWorldBookEntry] 自动保存失败:', error);
      saveStatus.value = 'error';
      setTimeout(() => {
        if (saveStatus.value === 'error') {
          saveStatus.value = 'idle';
        }
      }, 5000);
    } finally {
      isAutoSaving.value = false;
    }
  };

  let debounceTimer: number | null = null;
  const debouncedWatchSave = () => {
    if (autoSaveMode.value !== 'watch') return;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      autoSaveCurrentEntry();
    }, debounceMs.value);
  };

  watch(editableEntry, debouncedWatchSave, { deep: true });

  onMounted(restartAutoSaveTimer);

  onBeforeUnmount(() => {
    if (autoSaveTimer) {
      clearAutoSave(autoSaveTimer);
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });

  return {
    autoSaveMode,
    toggleAutoSaveMode,
  };
}
