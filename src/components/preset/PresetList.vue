<template>
  <SidebarTreePanel title="预设列表" :tree-data="treeData" :tree-props="treeProps" node-key="nodeKey"
    :current-node-key="currentNodeKey" :draggable="true"
    :allow-drag="node => !node.data?.isBatchSettings && props.dragDropHandlers.allowDrag(node)" :allow-drop="allowDrop"
    :handle-node-drop="props.dragDropHandlers.handleNodeDrop" @node-click="handleNodeClick"
    :node-menu-items="getNodeMenuItems" @node-menu-select="handleNodeMenuSelect"
    @node-dblclick="handleNodeDblClick">
    <template #header-actions>
      <div class="split-create-actions">
        <el-tooltip content="创建新预设" placement="top" :show-arrow="false" :offset="8" :hide-after="0">
          <button @click="$emit('create-preset')"
            class="btn-adv btn-primary-adv sidebar-header-button split-create-main" aria-label="创建新预设">
            <Icon icon="ph:plus-bold" />
          </button>
        </el-tooltip>
      </div>
    </template>

    <template #node="{ node, data }">
      <div class="sidebar-tree-node" :class="{
        'is-header': data.isHeader,
        'is-disabled': data.isPrompt && data.enabled === false,
        'is-multi-selected': data?.nodeKey && props.multiSelectedNodeKeys.includes(data.nodeKey),
      }">
        <div class="sidebar-tree-node-main">
          <Icon :icon="data.icon" class="sidebar-tree-node-icon" />
          <span class="sidebar-tree-node-label">{{ node.label }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="preset-footer-actions">
        <el-tooltip content="导出当前预设" placement="top" :show-arrow="false" :offset="8" :hide-after="0">
          <button class="btn-adv btn-success-adv preset-bottom-button-text" @click="$emit('export-preset')">
            <Icon icon="ph:export-duotone" width="16" height="16" class="preset-button-text-icon" />
            <span class="preset-button-text-short">导出</span>
            <span class="preset-button-text-long">导出预设</span>
          </button>
        </el-tooltip>
        <el-tooltip content="从文件导入预设" placement="top" :show-arrow="false" :offset="8" :hide-after="0">
          <BrowserFilePicker accept=".json" @select-first="$emit('import-preset', $event)">
            <button class="btn-adv btn-warning-adv preset-bottom-button-text">
              <Icon icon="ph:file-text-duotone" width="16" height="16" class="preset-button-text-icon" />
              <span class="preset-button-text-short">导入</span>
              <span class="preset-button-text-long">input</span>
            </button>
          </BrowserFilePicker>
        </el-tooltip>
      </div>
    </template>
  </SidebarTreePanel>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElTooltip } from 'element-plus';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';
import { Icon } from '@iconify/vue';
import BrowserFilePicker from '@/components/ui/common/BrowserFilePicker.vue';
import SidebarTreePanel from '@/components/ui/layout/common/SidebarTreePanel.vue';
import type { StoredPresetFile } from '@/database/db';
import type { TreeMenuItem } from '@/components/ui/layout/common/treeMenu';
import {
  buildPresetTreeData,
  getBatchSettingsNodeKey,
  getHeaderNodeKey,
  getRegexFolderNodeKey,
  getRegexNodeKey,
  resolvePromptIdentifier,
  getPromptNodeKey,
} from '@/composables/preset/utils/presetTree';

interface Props {
  presets: StoredPresetFile[];
  activePresetId: string | null;
  selectedPromptIndex: number | null;
  selectedRegexIndex: number | null;
  selectedIsHeader: boolean;
  isBatchSettingsActive?: boolean;
  multiSelectedNodeKeys?: string[];
  dragDropHandlers: {
    allowDrag: (draggingNode: any) => boolean;
    allowDrop: (draggingNode: any, dropNode: any, type: AllowDropType) => boolean;
    handleNodeDrop: (draggingNode: any, dropNode: any, type: Exclude<NodeDropType, 'none'>) => boolean;
  };
}

const props = withDefaults(defineProps<Props>(), {
  multiSelectedNodeKeys: () => [],
  isBatchSettingsActive: false,
});

const emit = defineEmits<{
  (e: 'select-preset', id: string): void;
  (e: 'select-header', id: string): void;
  (e: 'select-batch-settings', id: string): void;
  (e: 'select-prompt', presetId: string, promptIndex: number): void;
  (e: 'select-regex', presetId: string, regexIndex?: number): void;
  (e: 'toggle-prompt-enabled', presetId: string, promptIndex: number): void;
  (e: 'toggle-node-selection', data: any, additive: boolean): void;
  (e: 'create-preset'): void;
  (e: 'rename-preset', id: string): void;
  (e: 'delete-preset', id: string): void;
  (e: 'add-prompt', presetId: string): void;
  (e: 'add-regex', presetId: string): void;
  (e: 'duplicate-prompt', presetId: string, promptIndex: number): void;
  (e: 'delete-prompt', presetId: string, promptIndex: number): void;
  (e: 'delete-regex', presetId: string, regexIndex: number): void;
  (e: 'import-preset', file: File): void;
  (e: 'export-preset'): void;
}>();

const treeProps = {
  children: 'children',
  label: 'label',
};

const treeData = computed(() => buildPresetTreeData(props.presets));

const getSortableSiblings = (data: any): any[] => {
  if (data.isPreset) return treeData.value;
  if (data.isPrompt) {
    // 仅在已插入条目中排序，避免排序操作改变条目的插入状态。
    const preset = treeData.value.find(preset => preset.id === data.presetId);
    return preset?.children.filter(node => 'isPrompt' in node && node.isPrompt) ?? [];
  }
  return [];
};

const getSortMenuItems = (data: any): TreeMenuItem[] => {
  const siblings = getSortableSiblings(data);
  const index = siblings.findIndex(node => node.nodeKey === data.nodeKey);
  if (index < 0) return [];
  const first = index === 0;
  const last = index === siblings.length - 1;
  return [
    { key: 'up', label: '上移', divided: true, disabled: first },
    { key: 'down', label: '下移', disabled: last },
    { key: 'top', label: '移至顶端', disabled: first },
    { key: 'bottom', label: '移至末尾', disabled: last },
  ];
};

const getNodeMenuItems = (data: any): TreeMenuItem[] => {
  if (data.isPreset) {
    return [
      { key: 'add-prompt', label: '新增条目', icon: 'ph:plus-circle-duotone' },
      { key: 'rename-preset', label: '重命名', icon: 'ph:pencil-simple-duotone' },
      ...getSortMenuItems(data),
      { key: 'delete-preset', label: '删除预设', icon: 'ph:trash-duotone', divided: true, danger: true },
    ];
  }
  if (data.isPrompt) {
    return [
      { key: 'duplicate-prompt', label: '复制条目', icon: 'ph:copy-duotone' },
      ...getSortMenuItems(data),
      ...(data.raw?.system_prompt !== true
        ? [{ key: 'delete-prompt', label: '删除条目', icon: 'ph:trash-duotone', divided: true, danger: true }]
        : []),
    ];
  }
  if (data.isRegexFolder) {
    return [{ key: 'add-regex', label: '新增正则脚本', icon: 'ph:plus-circle-duotone' }];
  }
  if (data.isRegexScript) {
    return [{ key: 'delete-regex', label: '删除正则脚本', icon: 'ph:trash-duotone', danger: true }];
  }
  return [];
};

const handleNodeMenuSelect = (key: string, data: any) => {
  const item = getNodeMenuItems(data).find(item => item.key === key);
  if (!item || item.disabled) return;
  if (key === 'add-prompt') return emit('add-prompt', data.id);
  if (key === 'rename-preset') return emit('rename-preset', data.id);
  if (key === 'delete-preset') return emit('delete-preset', data.id);
  if (key === 'duplicate-prompt') return emit('duplicate-prompt', data.presetId, data.promptIndex);
  if (key === 'delete-prompt') return emit('delete-prompt', data.presetId, data.promptIndex);
  if (key === 'add-regex') return emit('add-regex', data.presetId);
  if (key === 'delete-regex') return emit('delete-regex', data.presetId, data.regexIndex);
  const siblings = getSortableSiblings(data);
  const index = siblings.findIndex(node => node.nodeKey === data.nodeKey);
  const target = key === 'top' ? 0 : key === 'bottom' ? siblings.length - 1 : index + (key === 'up' ? -1 : 1);
  if (index < 0 || !siblings[target]) return;
  // 菜单排序只移动当前节点，不沿用拖拽的多选集合。
  emit('toggle-node-selection', data, false);
  props.dragDropHandlers.handleNodeDrop({ data }, { data: siblings[target] }, target < index ? 'before' : 'after');
};

const currentNodeKey = computed(() => {
  if (!props.activePresetId) return undefined;
  if (props.isBatchSettingsActive) {
    return getBatchSettingsNodeKey(props.activePresetId);
  }
  if (props.selectedIsHeader) {
    return getHeaderNodeKey(props.activePresetId);
  }
  if (props.selectedRegexIndex !== null && props.selectedRegexIndex !== undefined) {
    const preset = props.presets.find((p) => p.id === props.activePresetId);
    if (!preset) return undefined;
    const scripts = (preset.data.extensions as Record<string, any>).regex_scripts as Record<string, any>[];
    const script = scripts[props.selectedRegexIndex];
    if (!script) return undefined;
    const scriptId = script.id as string;
    return getRegexNodeKey(props.activePresetId, scriptId);
  }
  if (props.selectedPromptIndex !== null && props.selectedPromptIndex !== undefined) {
    const preset = props.presets.find((p) => p.id === props.activePresetId);
    const prompt = preset?.data?.prompts?.[props.selectedPromptIndex] as Record<string, any> | undefined;
    if (!prompt) return undefined;
    const identifier = resolvePromptIdentifier(prompt, props.selectedPromptIndex);
    return getPromptNodeKey(props.activePresetId, identifier);
  }
  return getRegexFolderNodeKey(props.activePresetId);
});

const handleNodeClick = (data: any, context?: { event?: MouseEvent; node?: any }) => {
  const event = context?.event;
  const additive = Boolean(event && (event.ctrlKey || event.metaKey));
  const treeNode = context?.node;

  if (data?.isPreset || data?.isRegexFolder || data?.isGroup) {
    if (treeNode?.expanded) {
      treeNode.collapse?.();
    } else {
      treeNode.expand?.();
    }
  }

  if (data.isGroup) return;

  if (data.isBatchSettings) {
    emit('select-batch-settings', data.presetId);
    return;
  }

  emit('toggle-node-selection', data, additive);
  if (data.isHeader) {
    emit('select-header', data.presetId);
  } else if (data.isRegexFolder) {
    emit('select-regex', data.presetId);
  } else if (data.isRegexScript) {
    emit('select-regex', data.presetId, data.regexIndex);
  } else if (data.isPrompt) {
    emit('select-prompt', data.presetId, data.promptIndex);
  } else {
    emit('select-preset', data.id);
  }
};

const allowDrop = (draggingNode: any, dropNode: any, type: AllowDropType) => {
  if (draggingNode.data?.isBatchSettings || dropNode.data?.isBatchSettings) return false;
  return props.dragDropHandlers.allowDrop(draggingNode, dropNode, type);
};

const handleNodeDblClick = (data: any) => {
  if (data?.isPrompt && !isFullyLockedPrompt(data.raw)) {
    emit('toggle-prompt-enabled', data.presetId, data.promptIndex);
  }
};

const isFullyLockedPrompt = (prompt: Record<string, any> | undefined) => {
  const identifier = typeof prompt?.identifier === 'string' ? prompt.identifier : '';
  return identifier === 'dialogueExamples' || identifier === 'chatHistory';
};
</script>

<style scoped>
@import '@/css/split-create-actions.css';

.preset-footer-actions {
  display: flex;
  gap: 8px;
}

.preset-bottom-button-text {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  width: 100%;
  justify-content: center;
}

.preset-button-text-icon {
  color: inherit;
}

.preset-button-text-short {
  display: none;
}

.preset-button-text-long {
  display: inline;
}

.sidebar-tree-node.is-header .sidebar-tree-node-label {
  font-weight: 500;
  color: var(--el-color-primary);
}

.sidebar-tree-node.is-disabled .sidebar-tree-node-label,
.sidebar-tree-node.is-disabled .sidebar-tree-node-icon {
  color: var(--el-text-color-disabled);
  opacity: 0.65;
}

.sidebar-tree-node.is-multi-selected .sidebar-tree-node-label,
.sidebar-tree-node.is-multi-selected .sidebar-tree-node-icon {
  color: var(--el-color-primary);
}
</style>
