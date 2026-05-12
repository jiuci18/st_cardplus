import { computed, ref, watch, type Ref } from 'vue';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';
import type { StoredPresetFile } from '@/database/db';
import { getPromptOrderIdentifiers } from '@/composables/preset/utils/presetPromptOrder';
import {
  getPresetPromptSidebarEntries,
  getPromptNodeKey,
  resolvePromptIdentifier,
} from '@/composables/preset/utils/presetTree';

type PresetDropType = 'before' | 'after';

interface UsePresetTreeSelectionDnDOptions {
  presets: Ref<StoredPresetFile[]>;
  reorderPresets: (orderedIds: string[]) => Promise<void> | void;
  updatePromptOrder: (presetId: string, orderedIdentifiers: string[]) => Promise<void> | void;
}

const getNodeIdentifier = (nodeData: any) => {
  const raw = nodeData?.raw;
  if (!raw) return null;
  return resolvePromptIdentifier(raw, nodeData.promptIndex ?? 0);
};

const getInsertIndexAfterRemoval = (fromIndex: number, toIndex: number, type: PresetDropType) => {
  const normalizedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  return type === 'before' ? normalizedToIndex : normalizedToIndex + 1;
};

const moveMultipleIdentifiers = (list: string[], movingIds: string[], anchorId: string, type: PresetDropType) => {
  const movingSet = new Set(movingIds);
  if (!movingSet.size || movingSet.has(anchorId)) return list.slice();

  const orderedMoving = list.filter((id) => movingSet.has(id));
  if (orderedMoving.length === 0) return list.slice();

  const rest = list.filter((id) => !movingSet.has(id));
  const anchorIndex = rest.indexOf(anchorId);
  if (anchorIndex === -1) return list.slice();

  const insertIndex = type === 'before' ? anchorIndex : anchorIndex + 1;
  rest.splice(insertIndex, 0, ...orderedMoving);
  return rest;
};

const moveSinglePreset = (currentOrder: string[], fromId: string, toId: string, type: PresetDropType) => {
  const fromIndex = currentOrder.indexOf(fromId);
  const toIndex = currentOrder.indexOf(toId);
  if (fromIndex === -1 || toIndex === -1) return currentOrder;
  const next = currentOrder.slice();
  next.splice(fromIndex, 1);
  const insertIndex = getInsertIndexAfterRemoval(fromIndex, toIndex, type);
  next.splice(insertIndex, 0, fromId);
  return next;
};

const movePromptIdentifiers = (
  preset: { data: { prompts?: Record<string, any>[]; prompt_order: any } },
  movingIds: string[],
  anchorId: string,
  type: PresetDropType
) => {
  const currentOrder = getPromptOrderIdentifiers(preset.data.prompt_order);
  const displayOrder = getPresetPromptSidebarEntries(preset).map((entry) => entry.identifier);
  const movingSet = new Set(movingIds);
  if (!movingSet.size || movingSet.has(anchorId)) return null;

  const orderedMoving = displayOrder.filter((id) => movingSet.has(id));
  if (!orderedMoving.length) return null;

  const anchorInOrder = currentOrder.includes(anchorId);
  const movingInOrder = orderedMoving.filter((id) => currentOrder.includes(id));

  if (!anchorInOrder) {
    if (!movingInOrder.length) return null;
    return currentOrder.filter((id) => !movingSet.has(id));
  }

  const rest = currentOrder.filter((id) => !movingSet.has(id));
  const anchorIndex = rest.indexOf(anchorId);
  if (anchorIndex === -1) return null;
  const insertIndex = type === 'before' ? anchorIndex : anchorIndex + 1;
  rest.splice(insertIndex, 0, ...orderedMoving);
  return rest;
};

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

  const multiSelectedNodeKeys = computed(() => {
    const promptPresetId = multiSelectedPromptPresetId.value;
    const promptKeys =
      promptPresetId && multiSelectedPromptIds.value.length > 0
        ? multiSelectedPromptIds.value.map((id) => getPromptNodeKey(promptPresetId, id))
        : [];
    return [...multiSelectedPresetIds.value, ...promptKeys];
  });

  const togglePresetMultiSelection = (presetId: string) => {
    const index = multiSelectedPresetIds.value.indexOf(presetId);
    if (index === -1) {
      multiSelectedPresetIds.value.push(presetId);
      return;
    }
    multiSelectedPresetIds.value.splice(index, 1);
  };

  const togglePromptMultiSelection = (presetId: string, promptId: string) => {
    if (multiSelectedPromptPresetId.value !== presetId) {
      multiSelectedPromptPresetId.value = presetId;
      multiSelectedPromptIds.value = [promptId];
      return;
    }
    const index = multiSelectedPromptIds.value.indexOf(promptId);
    if (index === -1) {
      multiSelectedPromptIds.value.push(promptId);
      return;
    }
    multiSelectedPromptIds.value.splice(index, 1);
    if (multiSelectedPromptIds.value.length === 0) {
      multiSelectedPromptPresetId.value = null;
    }
  };

  const handleToggleNodeSelection = (data: any, additive: boolean) => {
    if (!additive) {
      clearMultiSelection();
      return;
    }

    if (data?.isPreset && typeof data.id === 'string') {
      multiSelectedPromptPresetId.value = null;
      multiSelectedPromptIds.value = [];
      togglePresetMultiSelection(data.id);
      return;
    }

    if (data?.isPrompt) {
      const identifier = getNodeIdentifier(data);
      if (!identifier || !data.presetId) return;
      multiSelectedPresetIds.value = [];
      togglePromptMultiSelection(data.presetId, identifier);
      return;
    }

    clearMultiSelection();
  };

  const dragDropHandlers = {
    allowDrag: (draggingNode: any) => {
      const data = draggingNode?.data;
      if (data?.isPreset && typeof data.id === 'string' && !multiSelectedPresetIds.value.includes(data.id)) {
        multiSelectedPresetIds.value = [];
      }
      if (data?.isPrompt) {
        const promptId = getNodeIdentifier(data);
        if (
          !promptId ||
          multiSelectedPromptPresetId.value !== data.presetId ||
          !multiSelectedPromptIds.value.includes(promptId)
        ) {
          multiSelectedPromptPresetId.value = null;
          multiSelectedPromptIds.value = [];
        }
      }
      return Boolean(draggingNode?.data?.isPreset || draggingNode?.data?.isPrompt);
    },
    allowDrop: (draggingNode: any, dropNode: any, type: AllowDropType) => {
      if (!draggingNode?.data || !dropNode?.data) return false;
      if (draggingNode.data.isPreset) {
        return dropNode.data.isPreset && (type === 'prev' || type === 'next');
      }
      if (draggingNode.data.isPrompt) {
        return (
          dropNode.data.isPrompt &&
          draggingNode.data.presetId === dropNode.data.presetId &&
          (type === 'prev' || type === 'next')
        );
      }
      return false;
    },
    handleNodeDrop: (draggingNode: any, dropNode: any, type: Exclude<NodeDropType, 'none'>) => {
      if (!draggingNode?.data || !dropNode?.data) return false;
      if (type === 'inner') return false;
      if (draggingNode.data.isPreset) {
        const currentOrder = presets.value
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((p) => p.id);
        const movingPresetIds = multiSelectedPresetIds.value.includes(draggingNode.data.id)
          ? currentOrder.filter((id) => multiSelectedPresetIds.value.includes(id))
          : [draggingNode.data.id];
        if (!movingPresetIds.length) return false;

        const nextOrder =
          movingPresetIds.length === 1
            ? moveSinglePreset(currentOrder, movingPresetIds[0], dropNode.data.id, type)
            : moveMultipleIdentifiers(currentOrder, movingPresetIds, dropNode.data.id, type);
        if (nextOrder.join('|') === currentOrder.join('|')) return false;

        reorderPresets(nextOrder);
        return true;
      }
      if (draggingNode.data.isPrompt) {
        const presetId = draggingNode.data.presetId;
        const preset = presets.value.find((p) => p.id === presetId);
        if (!preset) return false;
        const fromId = getNodeIdentifier(draggingNode.data);
        const toId = getNodeIdentifier(dropNode.data);
        if (!fromId || !toId) return false;

        const movingIds =
          multiSelectedPromptPresetId.value === presetId && multiSelectedPromptIds.value.includes(fromId)
            ? multiSelectedPromptIds.value.slice()
            : [fromId];
        const identifiers = getPromptOrderIdentifiers(preset.data.prompt_order);
        const next = movePromptIdentifiers(preset, movingIds, toId, type);
        if (!next) return false;
        if (next.join('|') === identifiers.join('|')) return false;
        updatePromptOrder(presetId, next);
        return true;
      }
      return false;
    },
  };

  watch(
    presets,
    (nextPresets) => {
      const presetIdSet = new Set(nextPresets.map((preset) => preset.id));
      multiSelectedPresetIds.value = multiSelectedPresetIds.value.filter((id) => presetIdSet.has(id));

      const selectedPromptPresetId = multiSelectedPromptPresetId.value;
      if (!selectedPromptPresetId || !presetIdSet.has(selectedPromptPresetId)) {
        multiSelectedPromptPresetId.value = null;
        multiSelectedPromptIds.value = [];
        return;
      }

      const preset = nextPresets.find((item) => item.id === selectedPromptPresetId);
      if (!preset) {
        multiSelectedPromptPresetId.value = null;
        multiSelectedPromptIds.value = [];
        return;
      }

      const promptIds = new Set(
        ((preset.data.prompts as Record<string, any>[]) || []).map((prompt, index) =>
          resolvePromptIdentifier(prompt, index)
        )
      );
      multiSelectedPromptIds.value = multiSelectedPromptIds.value.filter((id) => promptIds.has(id));
      if (multiSelectedPromptIds.value.length === 0) {
        multiSelectedPromptPresetId.value = null;
      }
    },
    { deep: true }
  );

  return {
    multiSelectedNodeKeys,
    handleToggleNodeSelection,
    dragDropHandlers,
  };
}
