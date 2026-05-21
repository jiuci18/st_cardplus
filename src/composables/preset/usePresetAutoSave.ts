import { ref, watch, type Ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getSetting } from '@/utils/localStorageUtils';

export type AutoSaveMode = 'auto' | 'watch' | 'manual';
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

  const intervalMs = ref<number>(
    typeof autoSaveIntervalMs === 'number' ? autoSaveIntervalMs : getSetting('autoSaveInterval') * 1000
  );
  const debounceMs = ref<number>(
    typeof watchDebounceMs === 'number' ? watchDebounceMs : getSetting('autoSaveDebounce') * 1000
  );

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
    const modes: Array<AutoSaveMode> = ['auto', 'watch', 'manual'];
    const currentIndex = modes.indexOf(autoSaveMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    autoSaveMode.value = modes[nextIndex];

    const messages = {
      auto: `已切换到自动保存模式：每 ${Math.max(1, Math.round(intervalMs.value / 1000))} 秒自动保存`,
      watch: `已切换到监听模式：检测到修改后 ${Math.max(0.1, Math.round((debounceMs.value / 1000) * 10) / 10)} 秒自动保存`,
      manual: '已切换到手动模式：自动保存已禁用',
    } as const;

    ElMessage.info(messages[autoSaveMode.value]);
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

  const handleDebounceChange = (event: Event) => {
    const detail = (event as CustomEvent<number>).detail;
    if (typeof detail !== 'number' || !Number.isFinite(detail)) return;
    debounceMs.value = detail * 1000;
  };
  window.addEventListener('autoSaveDebounceChange', handleDebounceChange);

  const handleIntervalChange = (event: Event) => {
    const detail = (event as CustomEvent<number>).detail;
    if (typeof detail !== 'number' || !Number.isFinite(detail)) return;
    intervalMs.value = detail * 1000;
  };

  window.addEventListener('autoSaveIntervalChange', handleIntervalChange);

  const cleanup = () => {
    if (autoSaveTimer !== null) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    window.removeEventListener('autoSaveIntervalChange', handleIntervalChange);
    window.removeEventListener('autoSaveDebounceChange', handleDebounceChange);
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
