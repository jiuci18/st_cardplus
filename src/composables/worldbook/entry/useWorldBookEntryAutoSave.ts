import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue';
import { ElMessage } from 'element-plus';
import { initAutoSave, clearAutoSave, getSetting } from '../../../utils/localStorageUtils';
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

  const autoSaveMode = ref<'auto' | 'watch' | 'manual'>('watch');
  const isAutoSaving = ref(false);
  let autoSaveTimer: number | null = null;
  const intervalMs = ref<number>(getSetting('autoSaveInterval') * 1000);
  const debounceMs = ref<number>(getSetting('autoSaveDebounce') * 1000);
  const handleIntervalChange = (event: Event) => {
    const detail = (event as CustomEvent<number>).detail;
    if (typeof detail !== 'number' || !Number.isFinite(detail)) return;
    intervalMs.value = detail * 1000;
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
  const handleDebounceChange = (event: Event) => {
    const detail = (event as CustomEvent<number>).detail;
    if (typeof detail !== 'number' || !Number.isFinite(detail)) return;
    debounceMs.value = detail * 1000;
  };

  const toggleAutoSaveMode = () => {
    const modes: Array<'auto' | 'watch' | 'manual'> = ['auto', 'watch', 'manual'];
    const currentIndex = modes.indexOf(autoSaveMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    autoSaveMode.value = modes[nextIndex];

    const messages = {
      auto: `已切换到自动保存模式：每 ${Math.max(1, Math.round(intervalMs.value / 1000))} 秒自动保存`,
      watch: `已切换到监听模式：检测到修改后 ${Math.max(0.1, Math.round(debounceMs.value * 10) / 10)} 秒自动保存`,
      manual: '已切换到手动模式：自动保存已禁用',
    };

    ElMessage.info(messages[autoSaveMode.value]);
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

  onMounted(() => {
    autoSaveTimer = initAutoSave(
      () => {
        if (autoSaveMode.value === 'auto') {
          autoSaveCurrentEntry();
        }
      },
      () => !!selectedEntry.value && !!editableEntry.value.uid,
      intervalMs.value
    );
    window.addEventListener('autoSaveIntervalChange', handleIntervalChange);
    window.addEventListener('autoSaveDebounceChange', handleDebounceChange);
  });

  onBeforeUnmount(() => {
    if (autoSaveTimer) {
      clearAutoSave(autoSaveTimer);
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    window.removeEventListener('autoSaveIntervalChange', handleIntervalChange);
    window.removeEventListener('autoSaveDebounceChange', handleDebounceChange);
  });

  return {
    autoSaveMode,
    toggleAutoSaveMode,
  };
}
