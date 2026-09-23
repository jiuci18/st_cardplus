import { computed, ref, watch, type Ref } from 'vue';
import type { StoredPresetFile } from '@/database/db';
import { getPromptOrderIdentifiers } from '@/composables/preset/utils/presetPromptOrder';
import {
  getPresetPromptSidebarEntries,
  getPromptNodeKey,
  resolvePromptIdentifier,
} from '@/composables/preset/utils/presetTree';
import { createTreeMoveHandlers, type MoveLocation } from '@/utils/treeMove';

interface UsePresetTreeSelectionDnDOptions {
  presets: Ref<StoredPresetFile[]>;
  reorderPresets: (ids: string[]) => Promise<void> | void;
  updatePromptOrder: (presetId: string, ids: string[]) => Promise<void> | void;
}
const getNodeIdentifier = (data: any) => (data?.raw ? resolvePromptIdentifier(data.raw, data.promptIndex ?? 0) : null);

export function usePresetTreeSelectionDnD(options: UsePresetTreeSelectionDnDOptions) {
  const { presets, reorderPresets, updatePromptOrder } = options;
  const multiSelectedPresetIds = ref<string[]>([]);
  const multiSelectedPromptPresetId = ref<string | null>(null);
  const multiSelectedPromptIds = ref<string[]>([]);
  const clearMultiSelection = () => {
    multiSelectedPresetIds.value = [];
    multiSelectedPromptPresetId.value = null;
    multiSelectedPromptIds.value = [];
  };
  const multiSelectedNodeKeys = computed(() => [
    ...multiSelectedPresetIds.value,
    ...(multiSelectedPromptPresetId.value
      ? multiSelectedPromptIds.value.map((id) => getPromptNodeKey(multiSelectedPromptPresetId.value!, id))
      : []),
  ]);
  const handleToggleNodeSelection = (data: any, additive: boolean) => {
    if (!additive) return clearMultiSelection();
    if (data?.isPreset) {
      multiSelectedPromptPresetId.value = null;
      multiSelectedPromptIds.value = [];
      const ids = multiSelectedPresetIds.value;
      multiSelectedPresetIds.value = ids.includes(data.id) ? ids.filter((id) => id !== data.id) : [...ids, data.id];
    } else if (data?.isPrompt) {
      const id = getNodeIdentifier(data);
      if (!id || !data.presetId) return;
      multiSelectedPresetIds.value = [];
      const ids = multiSelectedPromptPresetId.value === data.presetId ? multiSelectedPromptIds.value : [];
      multiSelectedPromptIds.value = ids.includes(id) ? ids.filter((key) => key !== id) : [...ids, id];
      multiSelectedPromptPresetId.value = multiSelectedPromptIds.value.length ? data.presetId : null;
    } else clearMultiSelection();
  };

  const dragDropHandlers = createTreeMoveHandlers<StoredPresetFile | null, Promise<boolean>>({
    // Crossing the inserted/uninserted boundary can change membership without changing display order.
    allowUnchanged: true,
    locate: (node): MoveLocation<StoredPresetFile | null> | undefined => {
      const data = node.data;
      if (data.isPreset)
        return {
          key: data.id,
          bucket: {
            id: '$presets',
            context: null,
            keys: presets.value
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((preset) => preset.id),
          },
        };
      const preset = presets.value.find((preset) => preset.id === data.presetId);
      const key = getNodeIdentifier(data);
      if (!data.isPrompt || !preset || !key) return;
      const inserted = getPromptOrderIdentifiers(preset.data.prompt_order);
      const display = getPresetPromptSidebarEntries(preset).map((entry) => entry.identifier);
      return { key, bucket: { id: preset.id, context: preset, keys: [...new Set([...inserted, ...display])] } };
    },
    canDrag: (node) => {
      const data = node?.data;
      if (data?.isPreset && !multiSelectedPresetIds.value.includes(data.id)) multiSelectedPresetIds.value = [];
      if (
        data?.isPrompt &&
        (multiSelectedPromptPresetId.value !== data.presetId ||
          !multiSelectedPromptIds.value.includes(getNodeIdentifier(data)!))
      ) {
        multiSelectedPromptPresetId.value = null;
        multiSelectedPromptIds.value = [];
      }
      return Boolean(data?.isPreset || data?.isPrompt);
    },
    canDrop: (source, target, type) =>
      type !== 'inner' &&
      Boolean(
        (source?.data?.isPreset && target?.data?.isPreset) ||
        (source?.data?.isPrompt && target?.data?.isPrompt && source.data.presetId === target.data.presetId),
      ),
    movingKeys: (node) => {
      const data = node.data;
      if (data.isPreset)
        return multiSelectedPresetIds.value.includes(data.id) ? multiSelectedPresetIds.value : [data.id];
      const id = getNodeIdentifier(data)!;
      return multiSelectedPromptPresetId.value === data.presetId && multiSelectedPromptIds.value.includes(id)
        ? multiSelectedPromptIds.value
        : [id];
    },
    commit: async (move, _source, target) => {
      const preset = move.source.context;
      if (!preset) {
        if (move.targetKeys.every((id, index) => id === move.source.keys[index])) return false;
        await reorderPresets(move.targetKeys);
      } else {
        // Uninserted prompts are a domain state, not another persisted ordering list.
        const current = getPromptOrderIdentifiers(preset.data.prompt_order);
        const inserted = new Set(current);
        const moving = new Set(move.movingKeys);
        const anchorInserted = inserted.has(getNodeIdentifier(target.data)!);
        const next = anchorInserted
          ? move.targetKeys.filter((id) => inserted.has(id) || moving.has(id))
          : current.filter((id) => !moving.has(id));
        if (next.length === current.length && next.every((id, index) => id === current[index])) return false;
        await updatePromptOrder(preset.id, next);
      }
      return true;
    },
  });

  watch(
    presets,
    (nextPresets) => {
      const presetIds = new Set(nextPresets.map((preset) => preset.id));
      multiSelectedPresetIds.value = multiSelectedPresetIds.value.filter((id) => presetIds.has(id));
      const preset = nextPresets.find((preset) => preset.id === multiSelectedPromptPresetId.value);
      if (!preset) {
        multiSelectedPromptPresetId.value = null;
        multiSelectedPromptIds.value = [];
        return;
      }
      const promptIds = new Set(((preset.data.prompts as Record<string, any>[]) || []).map(resolvePromptIdentifier));
      multiSelectedPromptIds.value = multiSelectedPromptIds.value.filter((id) => promptIds.has(id));
      if (!multiSelectedPromptIds.value.length) multiSelectedPromptPresetId.value = null;
    },
    { deep: true },
  );

  return { multiSelectedNodeKeys, handleToggleNodeSelection, dragDropHandlers };
}
