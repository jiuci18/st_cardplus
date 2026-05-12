import type { StoredPresetFile } from '@/database/db';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { getPresetPromptSidebarEntries } from '@/composables/preset/utils/presetTree';

type MobilePanelTab = 'list' | 'clipboard' | 'preview';

interface UsePresetPageNavigationOptions {
  presets: Ref<StoredPresetFile[]>;
  activePresetId: Ref<string | null>;
  activePreset: ComputedRef<StoredPresetFile | null>;
  selectedPromptIndex: ComputedRef<number | null>;
  activeEditorTab: Ref<'header' | 'prompt' | 'regex'>;
  isMobileOrTablet: Ref<boolean>;
  selectPreset: (presetId: string) => void;
  selectHeader: (presetId: string) => void;
  selectPrompt: (presetId: string, promptIndex: number) => void;
  selectRegex: (presetId: string, regexIndex?: number) => void;
  renamePreset: (preset: StoredPresetFile) => void | Promise<void>;
  removePreset: (preset: StoredPresetFile) => void | Promise<void>;
}

const mobilePanelTitleMap: Record<MobilePanelTab, string> = {
  list: '预设树状列表',
  clipboard: '剪贴板',
  preview: '预设预览',
};

export function usePresetPageNavigation(options: UsePresetPageNavigationOptions) {
  const {
    presets,
    activePresetId,
    activePreset,
    selectedPromptIndex,
    activeEditorTab,
    isMobileOrTablet,
    selectPreset,
    selectHeader,
    selectPrompt,
    selectRegex,
    renamePreset,
    removePreset,
  } = options;

  const mobileDrawerVisible = ref(false);
  const mobilePanelTab = ref<MobilePanelTab>('list');

  const orderedPresets = computed(() => presets.value.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  const activePresetOrderIndex = computed(() =>
    orderedPresets.value.findIndex((item) => item.id === activePresetId.value)
  );
  const hasPreviousPreset = computed(() => activePresetOrderIndex.value > 0);
  const hasNextPreset = computed(
    () => activePresetOrderIndex.value >= 0 && activePresetOrderIndex.value < orderedPresets.value.length - 1
  );

  const sidebarPromptIndexes = computed(() =>
    activePreset.value ? getPresetPromptSidebarEntries(activePreset.value).map((entry) => entry.promptIndex) : []
  );
  const selectedPromptSidebarIndex = computed(() =>
    selectedPromptIndex.value === null ? -1 : sidebarPromptIndexes.value.indexOf(selectedPromptIndex.value)
  );
  const hasPreviousPrompt = computed(() => selectedPromptSidebarIndex.value > 0);
  const hasNextPrompt = computed(
    () =>
      selectedPromptSidebarIndex.value >= 0 && selectedPromptSidebarIndex.value < sidebarPromptIndexes.value.length - 1
  );

  const withPresetById = (presetId: string, handler: (preset: StoredPresetFile) => void | Promise<void>) => {
    const preset = presets.value.find((item) => item.id === presetId);
    if (!preset) return;
    handler(preset);
  };

  const closeMobileDrawerOnTouchDevice = () => {
    if (isMobileOrTablet.value) mobileDrawerVisible.value = false;
  };

  const mobilePanelTitle = computed(() => mobilePanelTitleMap[mobilePanelTab.value]);

  const openMobilePanel = (tab: MobilePanelTab) => {
    mobilePanelTab.value = tab;
    mobileDrawerVisible.value = true;
  };

  const handleRenamePreset = (presetId: string) => withPresetById(presetId, renamePreset);
  const handleDeletePreset = (presetId: string) => withPresetById(presetId, removePreset);

  const handleSelectPreset = (presetId: string) => {
    selectPreset(presetId);
    closeMobileDrawerOnTouchDevice();
  };

  const handleSelectHeader = (presetId: string) => {
    selectHeader(presetId);
    closeMobileDrawerOnTouchDevice();
  };

  const handleSelectPrompt = (presetId: string, promptIndex: number) => {
    selectPrompt(presetId, promptIndex);
    closeMobileDrawerOnTouchDevice();
  };

  const handleSelectRegex = (presetId: string, regexIndex?: number) => {
    selectRegex(presetId, regexIndex);
    closeMobileDrawerOnTouchDevice();
  };

  const navigatePrompt = (step: -1 | 1) => {
    if (!activePresetId.value || selectedPromptIndex.value === null) return;
    const nextIndex = sidebarPromptIndexes.value[selectedPromptSidebarIndex.value + step];
    if (nextIndex === undefined) return;
    selectPrompt(activePresetId.value, nextIndex);
  };

  const navigatePreset = (step: -1 | 1) => {
    const target = orderedPresets.value[activePresetOrderIndex.value + step];
    if (!target) return;
    selectHeader(target.id);
  };

  const navigateByEditorTab = (direction: 'previous' | 'next') => {
    if (activeEditorTab.value === 'header') {
      const canNavigate = direction === 'previous' ? hasPreviousPreset.value : hasNextPreset.value;
      if (canNavigate) navigatePreset(direction === 'previous' ? -1 : 1);
      return;
    }
    if (activeEditorTab.value === 'regex') {
      return;
    }
    navigatePrompt(direction === 'previous' ? -1 : 1);
  };

  const goToPrevious = () => navigateByEditorTab('previous');
  const goToNext = () => navigateByEditorTab('next');

  return {
    mobileDrawerVisible,
    mobilePanelTab,
    mobilePanelTitle,
    openMobilePanel,
    handleRenamePreset,
    handleDeletePreset,
    handleSelectPreset,
    handleSelectHeader,
    handleSelectPrompt,
    handleSelectRegex,
    hasPreviousPreset,
    hasNextPreset,
    hasPreviousPrompt,
    hasNextPrompt,
    goToPrevious,
    goToNext,
  };
}
