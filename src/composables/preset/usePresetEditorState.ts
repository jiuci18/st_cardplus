import { ElMessage } from 'element-plus';
import { nextTick, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { StoredPresetFile } from '@/database/db';
import type { PresetHeaderForm, PresetEditorState } from '@/components/preset/PresetEditor.vue';
import type { PresetPrompt, PresetSelection } from '@/composables/preset/usePresetStore';
import { usePresetAutoSave } from '@/composables/preset/usePresetAutoSave';
import { defaultOpenAIPreset } from '@/types/openai-preset';
import { cleanObject } from '@/utils/objectUtils';

interface UsePresetEditorStateOptions {
  activePreset: ComputedRef<StoredPresetFile | null>;
  activePresetId: Ref<string | null>;
  selected: Ref<PresetSelection | null>;
  selectedPrompt: ComputedRef<PresetPrompt | null>;
  selectedPromptIndex: ComputedRef<number | null>;
  updateHeader: (nextHeader: Record<string, any>) => Promise<void>;
  updatePrompt: (promptIndex: number, prompt: PresetPrompt) => Promise<void>;
}

const normalizeNumber = (value: any, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const buildHeaderForm = (data?: Record<string, any>): PresetHeaderForm => {
  const source = { ...defaultOpenAIPreset, ...(data || {}) } as Record<string, any>;
  return {
    openai_max_context: normalizeNumber(source.openai_max_context, defaultOpenAIPreset.openai_max_context),
    openai_max_tokens: normalizeNumber(source.openai_max_tokens, defaultOpenAIPreset.openai_max_tokens),
    n: Math.max(1, normalizeNumber(source.n, defaultOpenAIPreset.n)),
    temperature: normalizeNumber(source.temperature, defaultOpenAIPreset.temperature),
    frequency_penalty: normalizeNumber(source.frequency_penalty, defaultOpenAIPreset.frequency_penalty),
    presence_penalty: normalizeNumber(source.presence_penalty, defaultOpenAIPreset.presence_penalty),
    top_p: normalizeNumber(source.top_p, defaultOpenAIPreset.top_p),
    impersonation_prompt: source.impersonation_prompt ?? defaultOpenAIPreset.impersonation_prompt ?? '',
    wi_format: source.wi_format ?? defaultOpenAIPreset.wi_format ?? '{0}',
    scenario_format: source.scenario_format ?? defaultOpenAIPreset.scenario_format ?? '{{scenario}}',
    personality_format: source.personality_format ?? defaultOpenAIPreset.personality_format ?? '{{personality}}',
    group_nudge_prompt: source.group_nudge_prompt ?? defaultOpenAIPreset.group_nudge_prompt ?? '',
    new_chat_prompt: source.new_chat_prompt ?? defaultOpenAIPreset.new_chat_prompt ?? '',
    new_group_chat_prompt: source.new_group_chat_prompt ?? defaultOpenAIPreset.new_group_chat_prompt ?? '',
    new_example_chat_prompt: source.new_example_chat_prompt ?? defaultOpenAIPreset.new_example_chat_prompt ?? '',
    continue_nudge_prompt: source.continue_nudge_prompt ?? defaultOpenAIPreset.continue_nudge_prompt ?? '',
    send_if_empty: source.send_if_empty ?? defaultOpenAIPreset.send_if_empty ?? '',
    seed: normalizeNumber(source.seed, defaultOpenAIPreset.seed),
    names_behavior: normalizeNumber(source.names_behavior, defaultOpenAIPreset.names_behavior),
    continue_postfix: source.continue_postfix ?? defaultOpenAIPreset.continue_postfix ?? ' ',
    continue_prefill: Boolean(source.continue_prefill),
    squash_system_messages: Boolean(source.squash_system_messages),
    function_calling: Boolean(source.function_calling),
    media_inlining: Boolean(source.media_inlining),
    inline_image_quality: source.inline_image_quality ?? defaultOpenAIPreset.inline_image_quality ?? 'auto',
    show_thoughts: Boolean(source.show_thoughts),
    reasoning_effort: source.reasoning_effort ?? defaultOpenAIPreset.reasoning_effort ?? 'auto',
    verbosity: source.verbosity ?? defaultOpenAIPreset.verbosity ?? 'auto',
  };
};

const buildEmptyPromptState = (): Pick<
  PresetEditorState,
  | 'promptName'
  | 'promptIdentifier'
  | 'promptRole'
  | 'promptContent'
  | 'promptSystem'
  | 'promptMarker'
  | 'promptEnabled'
  | 'promptOrder'
  | 'promptExtraJson'
> => ({
  promptName: '',
  promptIdentifier: '',
  promptRole: 'system',
  promptContent: '',
  promptSystem: false,
  promptMarker: false,
  promptEnabled: false,
  promptOrder: null,
  promptExtraJson: '{}',
});

const buildRegexSnapshot = (preset: StoredPresetFile | null) => {
  if (!preset) return '[]';
  const scripts = (preset.data.extensions as Record<string, any>).regex_scripts;
  return JSON.stringify(scripts);
};

const extractExtras = (prompt: PresetPrompt) => {
  const baseKeys = ['identifier', 'name', 'role', 'content', 'system_prompt', 'marker', 'enabled', 'order'];
  const extra: Record<string, any> = {};
  Object.entries(prompt || {}).forEach(([key, value]) => {
    if (!baseKeys.includes(key)) extra[key] = value;
  });
  return JSON.stringify(extra, null, 2);
};

const buildPromptStateFromPrompt = (
  prompt: PresetPrompt | null
): Pick<
  PresetEditorState,
  | 'promptName'
  | 'promptIdentifier'
  | 'promptRole'
  | 'promptContent'
  | 'promptSystem'
  | 'promptMarker'
  | 'promptEnabled'
  | 'promptOrder'
  | 'promptExtraJson'
> => {
  if (!prompt) return buildEmptyPromptState();
  return {
    promptName: prompt.name || '',
    promptIdentifier: prompt.identifier || '',
    promptRole: (prompt.role as any) || 'system',
    promptContent: prompt.content || '',
    promptSystem: Boolean(prompt.system_prompt),
    promptMarker: Boolean(prompt.marker),
    promptEnabled: Boolean(prompt.enabled),
    promptOrder: typeof prompt.order === 'number' ? prompt.order : null,
    promptExtraJson: extractExtras(prompt),
  };
};

export function usePresetEditorState(options: UsePresetEditorStateOptions) {
  const { activePreset, activePresetId, selected, selectedPrompt, selectedPromptIndex, updateHeader, updatePrompt } =
    options;

  const activeEditorTab = ref<'header' | 'prompt' | 'regex'>('header');
  const isLoadingData = ref(false);

  const editorState = ref<PresetEditorState>({
    presetName: '',
    headerForm: buildHeaderForm(),
    ...buildEmptyPromptState(),
    regexSnapshot: '[]',
  });

  const syncSnapshotAfterLoad = (autoSave: ReturnType<typeof usePresetAutoSave>) => {
    nextTick(() => {
      autoSave.updateSavedSnapshot();
      isLoadingData.value = false;
    });
  };

  const parsePromptExtraJson = () => {
    if (!editorState.value.promptExtraJson) return {};
    return JSON.parse(editorState.value.promptExtraJson) as Record<string, any>;
  };

  const saveCurrent = async (showToast = true) => {
    if (!activePreset.value) return;
    try {
      activePreset.value.name = editorState.value.presetName.trim() || activePreset.value.name;
      const headerBase = cleanObject(activePreset.value.data as Record<string, any>, ['prompts']);
      const nextHeader = { ...headerBase, ...editorState.value.headerForm };
      await updateHeader(nextHeader);
      if (selectedPrompt.value && selectedPromptIndex.value !== null) {
        const extra = parsePromptExtraJson();
        const updatedPrompt: PresetPrompt = {
          ...extra,
          name: editorState.value.promptName || undefined,
          identifier: editorState.value.promptIdentifier || undefined,
          role: editorState.value.promptRole,
          content: editorState.value.promptContent,
          system_prompt: editorState.value.promptSystem,
          marker: editorState.value.promptMarker,
          enabled: editorState.value.promptEnabled,
          order: editorState.value.promptOrder ?? undefined,
        };
        await updatePrompt(selectedPromptIndex.value, updatedPrompt);
      }
      if (showToast) {
        ElMessage.success('已保存');
      }
    } catch {
      if (showToast) {
        ElMessage.error('条目扩展 JSON 格式无效');
      }
      throw new Error('invalid-prompt-extra-json');
    }
  };

  const presetAutoSave = usePresetAutoSave({
    editorState,
    activePresetId,
    isLoadingData,
    onSave: () => saveCurrent(false),
  });

  const handleManualSave = async () => {
    try {
      await presetAutoSave.manualSave();
      ElMessage.success('已保存');
    } catch (error) {
      if (error instanceof Error && error.message === 'invalid-prompt-extra-json') {
        ElMessage.error('条目扩展 JSON 格式无效');
        return;
      }
      ElMessage.error('保存失败');
    }
  };

  watch(
    activePreset,
    (preset) => {
      if (!preset) {
        editorState.value = {
          ...editorState.value,
          presetName: '',
          headerForm: buildHeaderForm(),
          regexSnapshot: '[]',
        };
        syncSnapshotAfterLoad(presetAutoSave);
        return;
      }
      isLoadingData.value = true;
      editorState.value = {
        ...editorState.value,
        presetName: preset.name,
        headerForm: buildHeaderForm(preset.data as Record<string, any>),
        regexSnapshot: buildRegexSnapshot(preset),
      };
      syncSnapshotAfterLoad(presetAutoSave);
    },
    { immediate: true }
  );

  watch(
    selectedPrompt,
    (prompt) => {
      isLoadingData.value = true;
      editorState.value = {
        ...editorState.value,
        ...buildPromptStateFromPrompt(prompt),
      };
      syncSnapshotAfterLoad(presetAutoSave);
    },
    { immediate: true }
  );

  watch(selected, (val) => {
    if (val?.type === 'prompt') {
      activeEditorTab.value = 'prompt';
    } else if (val?.type === 'regex') {
      activeEditorTab.value = 'regex';
    } else {
      activeEditorTab.value = 'header';
    }
  });

  watch(
    () => buildRegexSnapshot(activePreset.value),
    (snapshot) => {
      if (editorState.value.regexSnapshot === snapshot) return;
      isLoadingData.value = true;
      editorState.value = {
        ...editorState.value,
        regexSnapshot: snapshot,
      };
      syncSnapshotAfterLoad(presetAutoSave);
    }
  );

  return {
    activeEditorTab,
    editorState,
    isLoadingData,
    presetAutoSave,
    handleManualSave,
  };
}
