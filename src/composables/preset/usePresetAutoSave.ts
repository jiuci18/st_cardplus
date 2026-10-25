import { ref, watch, type Ref } from 'vue';
import { ElMessage } from 'element-plus';
import { autoSaveModeMessage, nextAutoSaveMode, useAutoSaveSettings, type AutoSaveMode } from '../useAutoSaveSettings';

export type { AutoSaveMode } from '../useAutoSaveSettings';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface PresetAutoSaveOptions {
  editorState: Ref<Record<string, any>>;
  activePresetId: Ref<string | null>;
  isLoadingData: Ref<boolean>;
  onSave: () => Promise<void>;
  autoSaveMode?: Ref<AutoSaveMode>;
  watchDebounceMs?: number;
  autoSaveIntervalMs?: number;
}

export function usePresetAutoSave(options: PresetAutoSaveOptions) {
  const {
    editorState,
    activePresetId,
    isLoadingData,
    onSave,
    autoSaveMode = ref<AutoSaveMode>('watch'),
    watchDebounceMs,
    autoSaveIntervalMs,
  } = options;

  const { intervalMs, debounceMs, cleanup: cleanupSettings } = useAutoSaveSettings({
    autoSaveIntervalMs,
    watchDebounceMs,
  });

  const saveStatus = ref<SaveStatus>('idle');
  const lastSavedSnapshot = ref<string>('');
  const isSaving = ref(false);

  const getSnapshot = () =>
    JSON.stringify({
      presetId: activePresetId.value,
      editorState: editorState.value,
    });

  const shouldSave = (): boolean => {
    if (autoSaveMode.value === 'manual') return false;
    if (isLoadingData.value) return false;
    if (!activePresetId.value) return false;
    return true;
  };

  const performSave = async () => {
    if (!shouldSave()) return;
    const currentSnapshot = getSnapshot();
    if (currentSnapshot === lastSavedSnapshot.value) return;
    if (isSaving.value) return;

    isSaving.value = true;
    saveStatus.value = 'saving';

    try {
      await onSave();
      lastSavedSnapshot.value = currentSnapshot;
      saveStatus.value = 'saved';
      setTimeout(() => {
        if (saveStatus.value === 'saved') {
          saveStatus.value = 'idle';
        }
      }, 2000);
    } catch (error) {
      console.error('[PresetAutoSave] 保存失败:', error);
      saveStatus.value = 'error';
      setTimeout(() => {
        if (saveStatus.value === 'error') {
          saveStatus.value = 'idle';
        }
      }, 5000);
    } finally {
      isSaving.value = false;
    }
  };

  const manualSave = async () => {
    if (!activePresetId.value) return;
    isSaving.value = true;
    saveStatus.value = 'saving';
    try {
      await onSave();
      lastSavedSnapshot.value = getSnapshot();
      saveStatus.value = 'saved';
      setTimeout(() => {
        if (saveStatus.value === 'saved') {
          saveStatus.value = 'idle';
        }
      }, 2000);
    } catch (error) {
      console.error('[PresetAutoSave] 手动保存失败:', error);
      saveStatus.value = 'error';
      setTimeout(() => {
        if (saveStatus.value === 'error') {
          saveStatus.value = 'idle';
        }
      }, 5000);
      throw error;
    } finally {
      isSaving.value = false;
    }
  };

  const updateSavedSnapshot = () => {
    lastSavedSnapshot.value = getSnapshot();
  };

  const toggleAutoSaveMode = () => {
    autoSaveMode.value = nextAutoSaveMode(autoSaveMode.value);
    ElMessage.info(autoSaveModeMessage(autoSaveMode.value, intervalMs.value, debounceMs.value));
  };

  let debounceTimer: number | null = null;
  const debouncedWatchSave = () => {
    if (autoSaveMode.value !== 'watch') return;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      performSave();
    }, debounceMs.value);
  };

  watch(editorState, debouncedWatchSave, { deep: true });

  let autoSaveTimer: number | null = null;

  const restartAutoSaveTimer = () => {
    if (autoSaveTimer !== null) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (autoSaveMode.value === 'auto') {
      autoSaveTimer = window.setInterval(() => {
        performSave();
      }, intervalMs.value);
    }
  };

  watch(
    autoSaveMode,
    (mode) => {
      if (mode === 'auto') {
        restartAutoSaveTimer();
        return;
      }
      if (autoSaveTimer !== null) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
      }
    },
    { immediate: true }
  );

  watch(intervalMs, () => {
    if (autoSaveMode.value === 'auto') {
      restartAutoSaveTimer();
    }
  });

  const cleanup = () => {
    if (autoSaveTimer !== null) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    cleanupSettings();
  };

  return {
    saveStatus,
    autoSaveMode,
    manualSave,
    updateSavedSnapshot,
    toggleAutoSaveMode,
    cleanup,
  };
}
