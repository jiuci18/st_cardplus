<template>
  <SidebarTreePanel
    title="预设列表"
    :tree-data="treeData"
    :tree-props="treeProps"
    node-key="nodeKey"
    :current-node-key="currentNodeKey"
    :draggable="true"
    :allow-drag="props.dragDropHandlers.allowDrag"
    :allow-drop="props.dragDropHandlers.allowDrop"
    :handle-node-drop="props.dragDropHandlers.handleNodeDrop"
    @node-click="handleNodeClick"
    @node-dblclick="handleNodeDblClick"
  >
    <template #header-actions>
      <div class="split-create-actions">
        <el-tooltip
          content="创建新预设"
          placement="top"
          :show-arrow="false"
          :offset="8"
          :hide-after="0"
        >
          <button
            @click="$emit('create-preset')"
            class="btn-adv btn-primary-adv sidebar-header-button split-create-main"
            aria-label="创建新预设"
          >
            <Icon icon="ph:plus-bold" />
          </button>
        </el-tooltip>
      </div>
    </template>

    <template #node="{ node, data }">
      <div
        class="sidebar-tree-node"
        :class="{
          'is-header': data.isHeader,
          'is-disabled': data.isPrompt && data.enabled === false,
          'is-multi-selected': isMultiSelected(data),
        }"
      >
        <div class="sidebar-tree-node-main">
          <Icon
            :icon="data.icon"
            class="sidebar-tree-node-icon"
          />
          <span class="sidebar-tree-node-label">{{ node.label }}</span>
        </div>
        <div
          class="sidebar-tree-node-actions"
          v-if="data.isPreset"
        >
          <el-tooltip
            content="新增条目"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="$emit('add-prompt', data.id)"
              class="sidebar-tree-node-action-button"
            >
              <Icon icon="ph:plus-circle-duotone" />
            </button>
          </el-tooltip>
          <el-tooltip
            content="重命名"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="$emit('rename-preset', data.id)"
              class="sidebar-tree-node-action-button"
            >
              <Icon icon="ph:pencil-simple-duotone" />
            </button>
          </el-tooltip>
          <el-tooltip
            content="删除"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="$emit('delete-preset', data.id)"
              class="sidebar-tree-node-action-button is-danger"
            >
              <Icon icon="ph:trash-duotone" />
            </button>
          </el-tooltip>
        </div>
        <div
          class="sidebar-tree-node-actions"
          v-if="data.isPrompt"
        >
          <el-tooltip
            content="复制条目"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="$emit('duplicate-prompt', data.presetId, data.promptIndex)"
              class="sidebar-tree-node-action-button"
            >
              <Icon icon="ph:copy-duotone" />
            </button>
          </el-tooltip>
          <el-tooltip
            v-if="!isProtectedPrompt(data.raw)"
            content="删除条目"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="$emit('delete-prompt', data.presetId, data.promptIndex)"
              class="sidebar-tree-node-action-button is-danger"
            >
              <Icon icon="ph:trash-duotone" />
            </button>
          </el-tooltip>
        </div>
        <div
          class="sidebar-tree-node-actions"
          v-if="data.isRegexFolder"
        >
          <el-tooltip
            content="新增正则脚本"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="$emit('add-regex', data.presetId)"
              class="sidebar-tree-node-action-button"
            >
              <Icon icon="ph:plus-circle-duotone" />
            </button>
          </el-tooltip>
        </div>
        <div
          class="sidebar-tree-node-actions"
          v-if="data.isRegexScript"
        >
          <el-tooltip
            content="删除正则脚本"
            placement="top"
            :show-arrow="false"
            :offset="8"
            :hide-after="0"
          >
            <button
              @click.stop="$emit('delete-regex', data.presetId, data.regexIndex)"
              class="sidebar-tree-node-action-button is-danger"
            >
              <Icon icon="ph:trash-duotone" />
            </button>
          </el-tooltip>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="preset-footer-actions">
        <el-tooltip
          content="导出当前预设"
          placement="top"
          :show-arrow="false"
          :offset="8"
          :hide-after="0"
        >
          <button
            class="btn-adv btn-success-adv preset-bottom-button-text"
            @click="$emit('export-preset')"
          >
            <Icon
              icon="ph:export-duotone"
              width="16"
              height="16"
              class="preset-button-text-icon"
            />
            <span class="preset-button-text-short">导出</span>
            <span class="preset-button-text-long">导出预设</span>
          </button>
        </el-tooltip>
        <el-tooltip
          content="从文件导入预设"
          placement="top"
          :show-arrow="false"
          :offset="8"
          :hide-after="0"
        >
          <el-upload
            action="#"
            :before-upload="handleImportPreset"
            :show-file-list="false"
            accept=".json"
          >
            <button class="btn-adv btn-warning-adv preset-bottom-button-text">
              <Icon
                icon="ph:file-text-duotone"
                width="16"
                height="16"
                class="preset-button-text-icon"
              />
              <span class="preset-button-text-short">导入</span>
              <span class="preset-button-text-long">input</span>
            </button>
          </el-upload>
        </el-tooltip>
      </div>
    </template>
  </SidebarTreePanel>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElTooltip, ElUpload } from 'element-plus';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';
import { Icon } from '@iconify/vue';
import SidebarTreePanel from '@/components/layout/common/SidebarTreePanel.vue';
import type { StoredPresetFile } from '@/database/db';
import {
  buildPresetTreeData,
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
  multiSelectedNodeKeys?: string[];
  dragDropHandlers: {
    allowDrag: (draggingNode: any) => boolean;
    allowDrop: (draggingNode: any, dropNode: any, type: AllowDropType) => boolean;
    handleNodeDrop: (draggingNode: any, dropNode: any, type: Exclude<NodeDropType, 'none'>) => boolean;
  };
}

const props = withDefaults(defineProps<Props>(), {
  multiSelectedNodeKeys: () => [],
});

const emit = defineEmits<{
  (e: 'select-preset', id: string): void;
  (e: 'select-header', id: string): void;
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

const currentNodeKey = computed(() => {
  if (!props.activePresetId) return undefined;
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

const handleNodeDblClick = (data: any) => {
  if (data?.isPrompt && !isFullyLockedPrompt(data.raw)) {
    emit('toggle-prompt-enabled', data.presetId, data.promptIndex);
  }
};

const isMultiSelected = (data: any) => {
  const nodeKey = data?.nodeKey;
  if (!nodeKey) return false;
  return props.multiSelectedNodeKeys.includes(nodeKey);
};

const handleImportPreset = (file: File): boolean => {
  emit('import-preset', file);
  return false;
};

const isProtectedPrompt = (prompt: Record<string, any> | undefined) => {
  if (!prompt) return false;
  return Boolean(prompt.system_prompt === true);
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
