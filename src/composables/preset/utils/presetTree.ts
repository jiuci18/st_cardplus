import type { StoredPresetFile } from '@/database/db';
import { getPromptOrderIdentifiers } from '@/composables/preset/utils/presetPromptOrder';

export const getHeaderNodeKey = (presetId: string) => `${presetId}:header`;
const getUninsertedNodeKey = (presetId: string) => `${presetId}:uninserted`;
export const getPromptNodeKey = (presetId: string, identifier: string) => `${presetId}:prompt:${identifier}`;
export const getRegexFolderNodeKey = (presetId: string) => `${presetId}:regex-folder`;
export const getRegexNodeKey = (presetId: string, scriptId: string) => `${presetId}:regex:${scriptId}`;

export interface PresetPromptSidebarEntry {
  identifier: string;
  prompt: Record<string, any>;
  promptIndex: number;
}

interface PresetPromptSidebarSource {
  data: {
    prompts?: Record<string, any>[];
    prompt_order: unknown;
  };
}

export const resolvePromptIdentifier = (prompt: Record<string, any>, index: number) => {
  if (typeof prompt?.identifier === 'string' && prompt.identifier.trim()) {
    return prompt.identifier;
  }
  return `prompt-${index}`;
};

const buildPromptNode = (preset: StoredPresetFile, entry: PresetPromptSidebarEntry) => {
  return {
    id: entry.identifier,
    nodeKey: getPromptNodeKey(preset.id, entry.identifier),
    label: entry.prompt.name || entry.prompt.identifier || `条目 ${entry.promptIndex + 1}`,
    icon: 'ph:note-duotone',
    isPrompt: true,
    presetId: preset.id,
    promptIndex: entry.promptIndex,
    raw: entry.prompt,
    enabled: typeof entry.prompt.enabled === 'boolean' ? entry.prompt.enabled : true,
  };
};

const splitPromptsByOrder = (prompts: Record<string, any>[], orderIdentifiers: string[]) => {
  const entries = prompts.map((prompt, promptIndex) => ({
    identifier: resolvePromptIdentifier(prompt, promptIndex),
    prompt,
    promptIndex,
  }));
  const map = new Map<string, PresetPromptSidebarEntry>();
  entries.forEach((entry) => {
    if (!map.has(entry.identifier)) {
      map.set(entry.identifier, entry);
    }
  });
  const used = new Set<string>();
  const ordered = orderIdentifiers
    .map((identifier) => map.get(identifier))
    .filter((item): item is PresetPromptSidebarEntry => Boolean(item))
    .map((item) => {
      used.add(item.identifier);
      return item;
    });
  const remaining = entries.filter((item) => !used.has(item.identifier));
  return { ordered, remaining };
};

export const getPresetPromptSidebarEntries = (preset: PresetPromptSidebarSource): PresetPromptSidebarEntry[] => {
  const prompts = ((preset.data.prompts as Record<string, any>[]) || []).slice();
  const orderIdentifiers = getPromptOrderIdentifiers(preset.data.prompt_order);
  const { ordered, remaining } = splitPromptsByOrder(prompts, orderIdentifiers);
  return [...ordered, ...remaining];
};

const buildPromptNodes = (preset: StoredPresetFile) => {
  const prompts = ((preset.data.prompts as Record<string, any>[]) || []).slice();
  const orderIdentifiers = getPromptOrderIdentifiers(preset.data.prompt_order);
  const { ordered, remaining } = splitPromptsByOrder(prompts, orderIdentifiers);
  const orderedNodes = ordered.map((entry) => buildPromptNode(preset, entry));
  const remainingNodes = remaining.map((entry) => buildPromptNode(preset, entry));
  if (remainingNodes.length === 0) return orderedNodes;
  return [
    ...orderedNodes,
    {
      id: 'uninserted',
      nodeKey: getUninsertedNodeKey(preset.id),
      label: '未插入条目',
      icon: 'ph:folder-dashed-duotone',
      isGroup: true,
      children: remainingNodes,
    },
  ];
};

const buildRegexNodes = (preset: StoredPresetFile) => {
  const scripts = (preset.data.extensions as Record<string, any>).regex_scripts as Record<string, any>[];
  return scripts.map((script, index) => {
    const scriptId = script.id as string;
    return {
      id: scriptId,
      nodeKey: getRegexNodeKey(preset.id, scriptId),
      label: script.scriptName || `正则脚本 ${index + 1}`,
      icon: 'ph:code-duotone',
      isRegexScript: true,
      presetId: preset.id,
      regexIndex: index,
      raw: script,
      disabled: Boolean(script.disabled),
    };
  });
};

export const buildPresetTreeData = (presets: StoredPresetFile[]) => {
  return presets
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((preset) => ({
      id: preset.id,
      nodeKey: preset.id,
      label: preset.name,
      icon: 'ph:folder-duotone',
      isPreset: true,
      children: [
        {
          id: 'header',
          nodeKey: getHeaderNodeKey(preset.id),
          label: '头部设置',
          icon: 'ph:sliders-duotone',
          isHeader: true,
          presetId: preset.id,
        },
        {
          id: 'regex-folder',
          nodeKey: getRegexFolderNodeKey(preset.id),
          label: '正则',
          icon: 'ph:folder-simple-dashed-duotone',
          isRegexFolder: true,
          presetId: preset.id,
          children: buildRegexNodes(preset),
        },
        ...buildPromptNodes(preset),
      ],
    }));
};
