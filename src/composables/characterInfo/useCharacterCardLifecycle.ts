import { onMounted, onBeforeUnmount, type Ref } from 'vue';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  initAutoSave,
  clearAutoSave,
  getSetting,
} from '../../utils/localStorageUtils';
import type { CharacterCard } from '@/types/character/character';

export function useCharacterCardLifecycle(form: Ref<CharacterCard>, processLoadedData: (data: any) => CharacterCard) {
  let autoSaveTimer: number | null = null;
  let intervalMs = getSetting('autoSaveInterval') * 1000;
  const handleIntervalChange = (event: Event) => {
    const detail = (event as CustomEvent<number>).detail;
    if (typeof detail !== 'number' || !Number.isFinite(detail)) return;
    intervalMs = detail * 1000;
    if (autoSaveTimer) {
      clearAutoSave(autoSaveTimer);
    }
    autoSaveTimer = initAutoSave(
      () => saveToLocalStorage(form.value),
      () => !!form.value.data.chineseName,
      intervalMs
    );
  };

  onMounted(() => {
    const loadedData = loadFromLocalStorage('characterCardData', processLoadedData);
    if (loadedData) {
      form.value = loadedData;
    }
    autoSaveTimer = initAutoSave(
      () => saveToLocalStorage(form.value),
      () => !!form.value.data.chineseName,
      intervalMs
    );
    window.addEventListener('autoSaveIntervalChange', handleIntervalChange);
  });

  onBeforeUnmount(() => {
    if (autoSaveTimer) {
      clearAutoSave(autoSaveTimer);
    }
    window.removeEventListener('autoSaveIntervalChange', handleIntervalChange);
  });
}
