import { computed, ref, watch } from 'vue';
import { readSessionStorageJSON, writeSessionStorageJSON } from '@/utils/localStorageUtils';

export interface PresetClipboardItem {
  id: string;
  title: string;
  content: string;
}

const STORAGE_KEY = 'preset-clipboard';

function loadClipboard(): PresetClipboardItem[] {
  const items = readSessionStorageJSON<PresetClipboardItem[]>(STORAGE_KEY);
  return Array.isArray(items) ? items : [];
}

function saveClipboard(items: PresetClipboardItem[]) {
  writeSessionStorageJSON(STORAGE_KEY, items);
}

export function usePresetClipboard() {
  const clipboardItems = ref<PresetClipboardItem[]>(loadClipboard());

  watch(clipboardItems, (val) => saveClipboard(val), { deep: true });

  const hasItems = computed(() => clipboardItems.value.length > 0);

  const addItem = (item: PresetClipboardItem) => {
    clipboardItems.value.push(item);
  };

  const removeItem = (id: string) => {
    clipboardItems.value = clipboardItems.value.filter((i) => i.id !== id);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const items = [...clipboardItems.value];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    clipboardItems.value = items;
  };

  const moveDown = (index: number) => {
    if (index >= clipboardItems.value.length - 1) return;
    const items = [...clipboardItems.value];
    [items[index + 1], items[index]] = [items[index], items[index + 1]];
    clipboardItems.value = items;
  };

  const clearAll = () => {
    clipboardItems.value = [];
  };

  return {
    clipboardItems,
    hasItems,
    addItem,
    removeItem,
    moveUp,
    moveDown,
    clearAll,
  };
}
