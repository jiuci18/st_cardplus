import type { Ref } from 'vue';
import type { StoredPresetFile } from '@/database/db';
import { getPromptOrderIdentifiers } from '@/composables/preset/utils/presetPromptOrder';
import { getPresetPromptSidebarEntries, resolvePromptIdentifier } from '@/composables/preset/utils/presetTree';
import { createTreeMoveHandlers, type MoveLocation } from '@/utils/treeMove';

interface Options {
  presets: Ref<StoredPresetFile[]>;
  reorderPresets: (ids: string[]) => Promise<void> | void;
  updatePromptOrder: (presetId: string, ids: string[]) => Promise<void> | void;
}
const getNodeIdentifier = (data: any) => data?.raw ? resolvePromptIdentifier(data.raw, data.promptIndex ?? 0) : null;

/** Preset-specific membership/persistence only; multi-selection belongs to treeMove. */
export function usePresetTreeMove({ presets, reorderPresets, updatePromptOrder }: Options) {
  return createTreeMoveHandlers<StoredPresetFile | null>({
    // Crossing the inserted/uninserted boundary can change membership without changing display order.
    allowUnchanged: true,
    locate: (node): MoveLocation<StoredPresetFile | null> | undefined => {
      const data = node.data;
      if (data.isPreset) return {
        key: data.id,
        bucket: { id: '$presets', context: null,
          keys: presets.value.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(preset => preset.id) },
      };
      const preset = presets.value.find(preset => preset.id === data.presetId);
      const key = getNodeIdentifier(data);
      if (!data.isPrompt || !preset || !key) return;
      const inserted = getPromptOrderIdentifiers(preset.data.prompt_order);
      const display = getPresetPromptSidebarEntries(preset).map(entry => entry.identifier);
      return { key, bucket: { id: preset.id, context: preset, keys: [...new Set([...inserted, ...display])] } };
    },
    canDrag: node => Boolean(node?.data?.isPreset || node?.data?.isPrompt),
    canDrop: (source, target, type) => type !== 'inner' && Boolean(
      (source?.data?.isPreset && target?.data?.isPreset) ||
      (source?.data?.isPrompt && target?.data?.isPrompt && source.data.presetId === target.data.presetId)),
    commit: async (move, _source, target) => {
      const preset = move.source.context;
      if (!preset) {
        if (move.targetKeys.every((id, index) => id === move.source.keys[index])) return true;
        await reorderPresets(move.targetKeys);
        return true;
      }
      const current = getPromptOrderIdentifiers(preset.data.prompt_order);
      const inserted = new Set(current);
      const anchorInserted = inserted.has(getNodeIdentifier(target.data)!);
      const next = anchorInserted
        ? move.targetKeys.filter(id => inserted.has(id) || id === move.key)
        : current.filter(id => id !== move.key);
      if (next.length === current.length && next.every((id, index) => id === current[index])) return true;
      await updatePromptOrder(preset.id, next);
      return true;
    },
  });
}
