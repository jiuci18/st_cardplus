import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { defaultOpenAIPreset } from '@/types/openai-preset';
import { presetService } from '@/database/presetService';
import type { StoredPresetFile } from '@/database/db';
import { nowIso } from '@/utils/datetime';
import { SUBSTITUTE_FIND_REGEX, type SillyTavernRegexScript } from '@/composables/regex/types';
import {
  buildPromptOrderListFromIdentifiers,
  getPromptOrderIdentifiers,
  getPromptOrderList,
  removePromptOrderIdentifier,
  upsertPromptOrderEntry,
} from '@/composables/preset/utils/presetPromptOrder';

export type PresetPrompt = Record<string, any> & {
  identifier?: string;
  name?: string;
  role?: string;
  content?: string;
  system_prompt?: boolean;
  marker?: boolean;
  enabled?: boolean;
  order?: number;
};

export interface PresetSelection {
  type: 'header' | 'prompt' | 'regex';
  promptIndex?: number;
  regexIndex?: number;
}

const normalizeRegexScript = (script: any, index: number): SillyTavernRegexScript => {
  return {
    id: typeof script?.id === 'string' && script.id.trim() ? script.id : presetService.createPresetId(),
    scriptName:
      typeof script?.scriptName === 'string' && script.scriptName.trim() ? script.scriptName : `正则脚本 ${index + 1}`,
    findRegex: typeof script?.findRegex === 'string' ? script.findRegex : '',
    replaceString: typeof script?.replaceString === 'string' ? script.replaceString : '',
    trimStrings: Array.isArray(script?.trimStrings) ? script.trimStrings.map((item: any) => String(item)) : [],
    placement: Array.isArray(script?.placement) ? script.placement : [],
    disabled: Boolean(script?.disabled),
    markdownOnly: Boolean(script?.markdownOnly),
    promptOnly: Boolean(script?.promptOnly),
    runOnEdit: Boolean(script?.runOnEdit),
    substituteRegex: typeof script?.substituteRegex === 'number' ? script.substituteRegex : SUBSTITUTE_FIND_REGEX.NONE,
    minDepth: typeof script?.minDepth === 'number' ? script.minDepth : null,
    maxDepth: typeof script?.maxDepth === 'number' ? script.maxDepth : null,
  };
};

const ensurePresetDataShape = (preset: StoredPresetFile) => {
  const data = preset.data as Record<string, any>;
  if (!data.extensions || typeof data.extensions !== 'object') {
    data.extensions = {};
  }
  const extensions = data.extensions as Record<string, any>;
  const scripts = Array.isArray(extensions.regex_scripts) ? extensions.regex_scripts : [];
  extensions.regex_scripts = scripts.map((script, index) => normalizeRegexScript(script, index));
};

export function usePresetStore() {
  const presets = ref<StoredPresetFile[]>([]);
  const activePresetId = ref<string | null>(null);
  const selected = ref<PresetSelection | null>(null);
  const isReady = ref(false);

  const activePreset = computed(() => presets.value.find((p) => p.id === activePresetId.value) || null);
  const activePrompts = computed<PresetPrompt[]>(() => {
    return (activePreset.value?.data?.prompts as PresetPrompt[]) || [];
  });
  const selectedPrompt = computed<PresetPrompt | null>(() => {
    if (!selected.value) return null;
    const index = selected.value.promptIndex ?? -1;
    return activePrompts.value[index] || null;
  });
  const persistPreset = async (preset: StoredPresetFile) => {
    preset.updatedAt = nowIso();
    await presetService.updatePreset(preset);
  };

  const getPresetPrompts = (preset: StoredPresetFile): PresetPrompt[] => {
    return (preset.data.prompts as PresetPrompt[]) || [];
  };

  const setPresetPrompts = (preset: StoredPresetFile, prompts: PresetPrompt[]) => {
    preset.data.prompts = prompts as any;
  };

  const getPresetRegexScripts = (preset: StoredPresetFile): SillyTavernRegexScript[] => {
    ensurePresetDataShape(preset);
    return (preset.data.extensions as Record<string, any>).regex_scripts as SillyTavernRegexScript[];
  };

  const createStoredPreset = (name: string, data: Record<string, any>): StoredPresetFile => {
    const now = nowIso();
    const preset = {
      id: presetService.createPresetId(),
      name,
      order: presets.value.length,
      createdAt: now,
      updatedAt: now,
      data: data as any,
    } as StoredPresetFile;
    ensurePresetDataShape(preset);
    return preset;
  };

  const activatePreset = (presetId: string, nextSelection: PresetSelection = { type: 'header' }) => {
    activePresetId.value = presetId;
    presetService.setActivePresetId(presetId);
    selected.value = nextSelection;
  };

  const withPresetById = async <T>(
    presetId: string,
    mutator: (preset: StoredPresetFile) => Promise<T> | T
  ): Promise<T | undefined> => {
    const preset = presets.value.find((p) => p.id === presetId);
    if (!preset) return undefined;
    return await mutator(preset);
  };

  const loadPresets = async () => {
    const loaded = await presetService.getAllPresets();
    if (loaded.length === 0) {
      const preset = createStoredPreset('默认预设', presetService.createDefaultPresetData(defaultOpenAIPreset) as any);
      preset.order = 0;
      await presetService.addPreset(preset);
      presets.value = [preset];
      activatePreset(preset.id, { type: 'header' });
    } else {
      loaded.forEach((preset) => ensurePresetDataShape(preset));
      presets.value = loaded;
      const remembered = presetService.getActivePresetId();
      activePresetId.value =
        remembered && loaded.find((p) => p.id === remembered) ? remembered : (loaded[0]?.id ?? null);
      selected.value = { type: 'header' };
    }
    isReady.value = true;
  };

  onMounted(loadPresets);

  const selectPreset = (presetId: string) => {
    activatePreset(presetId, { type: 'header' });
  };

  const selectHeader = (presetId: string) => {
    selectPreset(presetId);
    selected.value = { type: 'header' };
  };

  const selectPrompt = (presetId: string, promptIndex: number) => {
    activatePreset(presetId, { type: 'prompt', promptIndex });
  };

  const selectRegex = (presetId: string, regexIndex?: number) => {
    activatePreset(presetId, { type: 'regex', regexIndex });
  };

  const createPreset = async () => {
    try {
      const result = await ElMessageBox.prompt('请输入新预设名称', '新建预设', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
      });
      const { value: name } = result as { value: string };
      const preset = createStoredPreset(name, presetService.createDefaultPresetData(defaultOpenAIPreset) as any);
      await presetService.addPreset(preset);
      presets.value.push(preset);
      activatePreset(preset.id, { type: 'header' });
      ElMessage.success('预设已创建');
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('已取消创建');
      }
    }
  };

  const renamePreset = async (preset: StoredPresetFile) => {
    try {
      const result = await ElMessageBox.prompt('请输入新的名称', '重命名预设', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputValue: preset.name,
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
      });
      const { value: name } = result as { value: string };
      preset.name = name;
      await persistPreset(preset);
      ElMessage.success('预设已重命名');
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('已取消重命名');
      }
    }
  };

  const removePreset = async (preset: StoredPresetFile) => {
    try {
      await ElMessageBox.confirm(`确定删除预设 "${preset.name}" 吗？`, '删除预设', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      });
      await presetService.deletePreset(preset.id);
      presets.value = presets.value.filter((p) => p.id !== preset.id);
      activePresetId.value = presets.value[0]?.id ?? null;
      selected.value = { type: 'header' };
      ElMessage.success('预设已删除');
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('已取消删除');
      }
    }
  };

  const addPrompt = async (presetId: string) => {
    await withPresetById(presetId, async (preset) => {
      const prompts = getPresetPrompts(preset);
      const newPrompt: PresetPrompt = {
        identifier: presetService.createPresetId(),
        name: '新条目',
        role: 'user',
        content: '',
        system_prompt: false,
        marker: false,
        enabled: true,
        order: prompts.length,
      };
      const updatedPrompts = [...prompts, newPrompt];
      setPresetPrompts(preset, updatedPrompts);
      await persistPreset(preset);
      ElMessage.success('条目已创建');
      selected.value = { type: 'prompt', promptIndex: updatedPrompts.length - 1 };
    });
  };

  const importPreset = async (presetName: string, data: Record<string, any>) => {
    const prompts = Array.isArray(data.prompts) ? data.prompts : [];
    const normalizedPrompts = prompts.map((prompt: PresetPrompt, index: number) => ({
      ...prompt,
      identifier: prompt.identifier || presetService.createPresetId(),
      order: typeof prompt.order === 'number' ? prompt.order : index,
    }));
    const preset = createStoredPreset(presetName, {
      ...data,
      prompts: normalizedPrompts,
    });
    await presetService.addPreset(preset);
    presets.value.push(preset);
    activatePreset(preset.id, { type: 'header' });
  };

  const addRegexScript = async (presetId: string) => {
    await withPresetById(presetId, async (preset) => {
      const scripts = getPresetRegexScripts(preset);
      const newScript: SillyTavernRegexScript = {
        id: presetService.createPresetId(),
        scriptName: `新规则 ${scripts.length + 1}`,
        findRegex: '',
        replaceString: '',
        trimStrings: [],
        placement: [],
        disabled: false,
        markdownOnly: false,
        promptOnly: false,
        runOnEdit: false,
        substituteRegex: SUBSTITUTE_FIND_REGEX.NONE,
        minDepth: null,
        maxDepth: null,
      };
      const nextScripts = [...scripts, newScript];
      (preset.data.extensions as Record<string, any>).regex_scripts = nextScripts as any;
      await persistPreset(preset);
      selected.value = { type: 'regex', regexIndex: nextScripts.length - 1 };
      ElMessage.success('正则脚本已创建');
    });
  };

  const removeRegexScript = async (presetId: string, regexIndex: number) => {
    await withPresetById(presetId, async (preset) => {
      const scripts = getPresetRegexScripts(preset);
      const target = scripts[regexIndex];
      if (!target) return;
      const updated = scripts.filter((_, index) => index !== regexIndex);
      (preset.data.extensions as Record<string, any>).regex_scripts = updated as any;
      await persistPreset(preset);
      if (updated.length === 0) {
        selected.value = { type: 'regex' };
      } else if (selected.value?.type === 'regex') {
        const nextIndex = Math.min(selected.value.regexIndex ?? regexIndex, updated.length - 1);
        selected.value = { type: 'regex', regexIndex: nextIndex };
      }
      ElMessage.success('正则脚本已删除');
    });
  };

  const reorderPresets = async (orderedIds: string[]) => {
    const now = nowIso();
    const updated = orderedIds
      .map((id, index) => {
        const preset = presets.value.find((p) => p.id === id);
        if (!preset) return null;
        preset.order = index;
        preset.updatedAt = now;
        return preset;
      })
      .filter(Boolean) as StoredPresetFile[];
    presets.value = updated;
    await presetService.updatePresetOrder(
      updated.map((p) => ({
        id: p.id,
        order: p.order,
        updatedAt: p.updatedAt,
      }))
    );
  };

  const duplicatePrompt = async (presetId: string, promptIndex: number) => {
    await withPresetById(presetId, async (preset) => {
      const prompts = getPresetPrompts(preset);
      const source = prompts[promptIndex];
      if (!source) return;
      const cloned = JSON.parse(JSON.stringify(source)) as PresetPrompt;
      cloned.identifier = presetService.createPresetId();
      cloned.name = `${source.name || '条目'} - 副本`;
      const updatedPrompts = [...prompts, cloned];
      setPresetPrompts(preset, updatedPrompts);
      await persistPreset(preset);
      ElMessage.success('条目已复制');
      selected.value = { type: 'prompt', promptIndex: updatedPrompts.length - 1 };
    });
  };

  const removePrompt = async (presetId: string, promptIndex: number) => {
    await withPresetById(presetId, async (preset) => {
      const prompts = getPresetPrompts(preset);
      const target = prompts[promptIndex];
      if (!target) return;
      const identifier = typeof target.identifier === 'string' ? target.identifier : '';
      const inOrder = identifier ? getPromptOrderIdentifiers(preset.data.prompt_order).includes(identifier) : false;
      try {
        const actionText = inOrder ? '移除' : '删除';
        const description = inOrder
          ? `确定移除条目 "${target.name || target.identifier || '未命名'}" 并移至未插入吗？`
          : `确定删除条目 "${target.name || target.identifier || '未命名'}" 吗？`;
        await ElMessageBox.confirm(description, '删除条目', {
          confirmButtonText: actionText,
          cancelButtonText: '取消',
          type: 'warning',
        });
        if (inOrder && identifier) {
          const { next, removed } = removePromptOrderIdentifier(preset.data.prompt_order, identifier);
          if (removed) {
            preset.data.prompt_order = next as any;
            await persistPreset(preset);
            ElMessage.success('条目已移至未插入');
            return;
          }
        }
        const updatedPrompts = prompts.filter((_, idx) => idx !== promptIndex);
        setPresetPrompts(preset, updatedPrompts);
        await persistPreset(preset);
        ElMessage.success('条目已删除');
        selected.value = { type: 'header' };
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
          ElMessage.info('已取消删除');
        }
      }
    });
  };

  const updateHeader = async (header: Record<string, any>) => {
    if (!activePreset.value) return;
    const prompts = getPresetPrompts(activePreset.value);
    activePreset.value.data = { ...header, prompts } as any;
    await persistPreset(activePreset.value);
  };

  const updatePrompt = async (promptIndex: number, updatedPrompt: PresetPrompt) => {
    if (!activePreset.value) return;
    const prompts = getPresetPrompts(activePreset.value);
    if (!prompts[promptIndex]) return;
    const nextPrompts = [...prompts];
    nextPrompts[promptIndex] = updatedPrompt;
    setPresetPrompts(activePreset.value, nextPrompts);
    await persistPreset(activePreset.value);
  };

  const togglePromptEnabled = async (presetId: string, promptIndex: number) => {
    await withPresetById(presetId, async (preset) => {
      const prompts = getPresetPrompts(preset);
      const targetPrompt = prompts[promptIndex];
      if (!targetPrompt) return;
      const nextEnabled = !(typeof targetPrompt.enabled === 'boolean' ? targetPrompt.enabled : true);
      const nextPrompts = [...prompts];
      nextPrompts[promptIndex] = {
        ...targetPrompt,
        enabled: nextEnabled,
      };
      setPresetPrompts(preset, nextPrompts);

      const identifier = typeof targetPrompt.identifier === 'string' ? targetPrompt.identifier : '';
      if (identifier) {
        const orderList = getPromptOrderList(preset.data.prompt_order);
        const orderIndex = orderList.findIndex((item) => item.identifier === identifier);
        if (orderIndex >= 0) {
          const nextOrderList = orderList.slice();
          nextOrderList[orderIndex] = { ...nextOrderList[orderIndex], enabled: nextEnabled };
          preset.data.prompt_order = upsertPromptOrderEntry(preset.data.prompt_order, nextOrderList);
        }
      }

      await persistPreset(preset);
    });
  };

  const updatePromptOrder = async (presetId: string, identifiers: string[]) => {
    await withPresetById(presetId, async (preset) => {
      const prompts = getPresetPrompts(preset);
      const orderList = buildPromptOrderListFromIdentifiers(identifiers, prompts as any, preset.data.prompt_order);
      preset.data.prompt_order = upsertPromptOrderEntry(preset.data.prompt_order, orderList);
      await persistPreset(preset);
    });
  };

  return {
    presets,
    activePresetId,
    activePreset,
    activePrompts,
    selected,
    selectedPrompt,
    isReady,
    selectPreset,
    selectHeader,
    selectPrompt,
    selectRegex,
    createPreset,
    renamePreset,
    removePreset,
    addPrompt,
    addRegexScript,
    removeRegexScript,
    importPreset,
    reorderPresets,
    duplicatePrompt,
    removePrompt,
    updateHeader,
    updatePrompt,
    togglePromptEnabled,
    updatePromptOrder,
  };
}
