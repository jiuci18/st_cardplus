import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';

import { useAutoSaveSettings, type AutoSaveMode } from '../useAutoSaveSettings';

import type { CharacterCardEditorSession, SessionSaveStatus } from './useCharacterCardEditorSessions';
import { normalizeCharacterCardData } from './useV3CharacterCard';

export type { AutoSaveMode } from '../useAutoSaveSettings';
export type SaveStatus = SessionSaveStatus;

export interface AutoSaveOptions {
  currentSession: Ref<CharacterCardEditorSession | null>;
  onSave: (cardId: string, data: CharacterCardEditorSession['draft']) => Promise<void>;
  autoSaveMode?: Ref<AutoSaveMode>;
  watchDebounceMs?: number;
  autoSaveIntervalMs?: number;
}

export function useCharacterCardAutoSave(options: AutoSaveOptions) {
  const {
    currentSession,
    onSave,
    autoSaveMode = ref<AutoSaveMode>('watch'),
    watchDebounceMs,
    autoSaveIntervalMs,
  } = options;

  const { intervalMs, debounceMs } = useAutoSaveSettings({ autoSaveIntervalMs, watchDebounceMs });

  const saveStatus = computed<SaveStatus>(() => currentSession.value?.saveStatus ?? 'idle');

  const clearDebounceTimer = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const clearAutoSaveTimer = () => {
    if (autoSaveTimer !== null) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  };

  const setSessionStatus = (session: CharacterCardEditorSession, status: SaveStatus) => {
    session.saveStatus = status;
  };

  const scheduleStatusReset = (session: CharacterCardEditorSession, status: SaveStatus, delayMs: number) => {
    window.setTimeout(() => {
      if (session.saveStatus === status) {
        session.saveStatus = 'idle';
      }
    }, delayMs);
  };

  const getSessionSnapshot = (session: CharacterCardEditorSession) => JSON.stringify(session.draft);

  const saveSession = async (session: CharacterCardEditorSession) => {
    if (session.isSaving) {
      return;
    }

    const currentSnapshot = getSessionSnapshot(session);
    if (currentSnapshot === session.lastSavedSnapshot) {
      return;
    }

    session.isSaving = true;
    setSessionStatus(session, 'saving');

    try {
      await onSave(session.cardId, session.draft);
      session.draft = normalizeCharacterCardData(session.draft);
      session.lastSavedSnapshot = getSessionSnapshot(session);
      session.isSaving = false;
      setSessionStatus(session, 'saved');
      scheduleStatusReset(session, 'saved', 2000);
    } catch (error) {
      console.error('[AutoSave] 保存失败:', error);
      session.isSaving = false;
      setSessionStatus(session, 'error');
      scheduleStatusReset(session, 'error', 5000);
      throw error;
    }
  };

  const performSave = async () => {
    if (autoSaveMode.value === 'manual') return;

    const session = currentSession.value;
    if (!session) return;

    try {
      await saveSession(session);
    } catch {
      // 状态已经在 saveSession 中处理
    }
  };

  const manualSave = async () => {
    const session = currentSession.value;
    if (!session) {
      return;
    }

    await saveSession(session);
  };

  const syncCurrentSessionSnapshot = () => {
    const session = currentSession.value;
    if (!session) return;

    session.lastSavedSnapshot = getSessionSnapshot(session);
    session.saveStatus = 'idle';
    session.isSaving = false;
  };

  let debounceTimer: number | null = null;
  const debouncedWatchSave = () => {
    if (autoSaveMode.value !== 'watch') return;

    clearDebounceTimer();
    debounceTimer = window.setTimeout(() => {
      void performSave();
    }, debounceMs.value);
  };

  watch(
    () => currentSession.value?.draft,
    () => {
      debouncedWatchSave();
    },
    { deep: true }
  );

  watch(
    () => currentSession.value?.cardId,
    () => {
      clearDebounceTimer();
    }
  );

  let autoSaveTimer: number | null = null;

  const syncAutoSaveTimer = () => {
    clearAutoSaveTimer();
    if (autoSaveMode.value === 'auto') {
      autoSaveTimer = window.setInterval(() => {
        void performSave();
      }, intervalMs.value);
    }
  };

  watch([autoSaveMode, intervalMs], syncAutoSaveTimer, { immediate: true });

  onBeforeUnmount(() => {
    clearAutoSaveTimer();
    clearDebounceTimer();
  });

  return {
    autoSaveMode,
    saveStatus,
    manualSave,
    syncCurrentSessionSnapshot,
  };
}
