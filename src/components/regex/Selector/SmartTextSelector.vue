<template>
  <div class="smart-text-selector">
    <div class="selector-header">
      <h4>智能文本选择器</h4>
      <div class="mode-controls">
        <el-radio-group
          v-model="inputMode"
          size="small"
        >
          <el-radio-button label="manual">手动选择</el-radio-button>
          <el-radio-button label="token">分词选择</el-radio-button>
        </el-radio-group>
        <el-radio-group
          v-if="inputMode === 'manual'"
          v-model="selectionMode"
          size="small"
        >
          <el-radio-button label="anchor">锚点模式</el-radio-button>
          <el-radio-button label="variable">变量模式</el-radio-button>
          <el-radio-button label="start">起始符</el-radio-button>
          <el-radio-button label="end">终止符</el-radio-button>
        </el-radio-group>
        <el-button
          size="small"
          type="danger"
          @click="handleClearAll"
          :disabled="selections.length === 0"
        >
          <Icon
            icon="material-symbols:clear-all"
            width="16"
            height="16"
          />
          清除所有选择
        </el-button>
      </div>
    </div>

    <div
      class="tool-description"
      v-if="inputMode === 'manual'"
    >
      <Icon
        icon="material-symbols:info-outline"
        width="16"
        height="16"
        class="info-icon"
      />
      <span>{{ getToolDescription(selectionMode) }}</span>
    </div>

    <div
      class="text-area-wrapper"
      v-if="inputMode === 'manual'"
    >
      <div
        ref="textAreaRef"
        class="selectable-text"
        @mouseup="handleTextSelection"
        @mousedown="startSelection"
        v-html="renderedText"
      ></div>
    </div>

    <TokenSelector
      v-if="inputMode === 'token'"
      :input-text="inputText"
      @selection-created="handleTokenSelection"
    />

    <div
      class="selection-summary"
      v-if="selections.length > 0"
    >
      <h5>已选择的区域:</h5>
      <div class="selection-items">
        <div
          v-for="(selection, index) in selections"
          :key="index"
          class="selection-item"
          :class="selection.type"
        >
          <div class="selection-type">
            <Icon
              :icon="getSelectionIcon(selection.type)"
              width="16"
              height="16"
            />
            {{ getSelectionLabel(selection.type) }} {{ index + 1 }}
          </div>
          <div class="selection-text">{{ selection.text }}</div>
          <el-button
            size="small"
            type="danger"
            text
            @click="handleRemoveSelection(index)"
            :icon="Delete"
          />
        </div>
      </div>
    </div>

    <div
      class="regex-output"
      v-if="generatedRegex"
    >
      <h5>生成的正则表达式:</h5>
      <div class="regex-display">
        <code>{{ generatedRegex }}</code>
        <el-button
          size="small"
          @click="copyRegex"
          :icon="CopyIcon"
        >
          复制
        </el-button>
      </div>

      <div
        class="replace-preview"
        v-if="generateRegex.replaceString"
      >
        <h5>替换字符串:</h5>
        <div class="replace-display">
          <code>{{ generateRegex.replaceString }}</code>
        </div>
      </div>

      <div
        class="validation-info"
        v-if="validateSelections.issues.length > 0"
      >
        <h5>建议:</h5>
        <ul class="validation-issues">
          <li
            v-for="issue in validateSelections.issues"
            :key="issue"
            class="validation-issue"
          >
            {{ issue }}
          </li>
        </ul>
      </div>

      <div
        class="selection-stats"
        v-if="selections.length > 0"
      >
        <div class="stats-item">
          <span class="stats-label">锚点:</span>
          <span class="stats-value">{{ selectionStats.anchors }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">变量:</span>
          <span class="stats-value">{{ selectionStats.variables }}</span>
        </div>
        <div
          class="stats-item"
          v-if="selectionStats.starts > 0"
        >
          <span class="stats-label">起始:</span>
          <span class="stats-value">{{ selectionStats.starts }}</span>
        </div>
        <div
          class="stats-item"
          v-if="selectionStats.ends > 0"
        >
          <span class="stats-label">终止:</span>
          <span class="stats-value">{{ selectionStats.ends }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">捕获组数:</span>
          <span class="stats-value">{{ generateRegex.groupCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSmartRegexGenerator, type TextSelection } from '@/composables/regex/useSmartRegexGenerator';
import { copyToClipboard } from '@/utils/clipboard';
import { CopyDocument as CopyIcon, Delete } from '@element-plus/icons-vue';
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';
import { computed, nextTick, ref } from 'vue';
import TokenSelector from './TokenSelector.vue';

const props = defineProps<{
  inputText: string;
}>();

const emit = defineEmits<{
  regexGenerated: [regex: string, replaceString: string];
}>();

const selectionMode = ref<'anchor' | 'variable' | 'start' | 'end'>('anchor');
const inputMode = ref<'manual' | 'token'>('manual');
const isSelecting = ref(false);

// 使用智能正则生成器
const {
  selections,
  generateRegex,
  addSelection,
  removeSelection,
  clearSelections,
  selectionStats,
  validateSelections,
} = useSmartRegexGenerator(computed(() => props.inputText));

// HTML转义函数
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const renderedText = computed(() => {
  // 使用更简单的方法：基于原始文本构建带标记的版本
  const originalText = props.inputText;
  const sortedSelections = [...selections.value].sort(
    (a: TextSelection, b: TextSelection) => a.startIndex - b.startIndex
  );

  let result = '';
  let lastIndex = 0;

  sortedSelections.forEach((selection) => {
    // 添加选择前的文本
    const beforeText = originalText.substring(lastIndex, selection.startIndex);
    result += escapeHtml(beforeText);

    // 添加被选择的文本（带标记）
    let className = 'anchor-selection';
    if (selection.type === 'variable') className = 'variable-selection';
    else if (selection.type === 'start') className = 'start-selection';
    else if (selection.type === 'end') className = 'end-selection';

    const escapedSelection = escapeHtml(selection.text);
    result += `<span class="${className}">${escapedSelection}</span>`;

    lastIndex = selection.endIndex;
  });

  // 添加剩余文本
  const remainingText = originalText.substring(lastIndex);
  result += escapeHtml(remainingText);

  return result.replace(/\n/g, '<br>');
});

const generatedRegex = computed(() => generateRegex.value.regex);

const startSelection = () => {
  isSelecting.value = true;
};

const handleTextSelection = async () => {
  if (!isSelecting.value) return;
  isSelecting.value = false;

  await nextTick();

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const selectedText = selection.toString().trim();
  if (!selectedText) return;

  // 使用更简单的方法：基于选中文本在原始文本中的位置
  const originalText = props.inputText;

  // 找到选中文本在原始文本中的位置
  const firstOccurrence = originalText.indexOf(selectedText);
  if (firstOccurrence === -1) {
    ElMessage.warning('无法在原始文本中找到选中的文本');
    selection.removeAllRanges();
    return;
  }

  // 检查是否有多个相同的文本，如果有，需要更精确的定位
  const allOccurrences: number[] = [];
  let index = originalText.indexOf(selectedText, 0);
  while (index !== -1) {
    allOccurrences.push(index);
    index = originalText.indexOf(selectedText, index + 1);
  }

  let startIndex: number;
  let endIndex: number;

  if (allOccurrences.length === 1) {
    // 只有一个匹配，直接使用
    startIndex = firstOccurrence;
    endIndex = firstOccurrence + selectedText.length;
  } else {
    // 多个匹配，自动选择第一个不重叠的位置
    const existingSelections = selections.value.sort(
      (a: TextSelection, b: TextSelection) => a.startIndex - b.startIndex
    );
    let bestMatch = firstOccurrence;

    // 选择第一个不重叠的位置
    for (const occurrence of allOccurrences) {
      const wouldOverlap = existingSelections.some(
        (sel: TextSelection) =>
          (occurrence >= sel.startIndex && occurrence < sel.endIndex) ||
          (occurrence + selectedText.length > sel.startIndex && occurrence + selectedText.length <= sel.endIndex) ||
          (occurrence <= sel.startIndex && occurrence + selectedText.length >= sel.endIndex)
      );

      if (!wouldOverlap) {
        bestMatch = occurrence;
        break;
      }
    }

    if (bestMatch === firstOccurrence && allOccurrences.length > 1) {
      // 如果使用的是第一个匹配但有多个选择，显示提示信息
      ElMessage.info(`找到 ${allOccurrences.length} 个相同文本，已选择第一个可用位置`);
    }

    startIndex = bestMatch;
    endIndex = bestMatch + selectedText.length;
  }

  const newSelection: TextSelection = {
    type: selectionMode.value,
    text: selectedText,
    startIndex,
    endIndex,
  };

  try {
    addSelection(newSelection);
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '选择区域有冲突');
    selection.removeAllRanges();
    return;
  }

  selection.removeAllRanges();

  // Emit the generated regex
  if (generateRegex.value.isValid) {
    emit('regexGenerated', generateRegex.value.regex, generateRegex.value.replaceString);
  }
};

const handleRemoveSelection = (index: number) => {
  removeSelection(index);
  if (generateRegex.value.isValid) {
    emit('regexGenerated', generateRegex.value.regex, generateRegex.value.replaceString);
  }
};

const handleClearAll = () => {
  clearSelections();
  emit('regexGenerated', '', '');
};

const getSelectionIcon = (type: string) => {
  switch (type) {
    case 'anchor':
      return 'material-symbols:anchor';
    case 'variable':
      return 'material-symbols:data-object';
    case 'start':
      return 'material-symbols:play-arrow';
    case 'end':
      return 'material-symbols:stop';
    default:
      return 'material-symbols:help';
  }
};

const getSelectionLabel = (type: string) => {
  switch (type) {
    case 'anchor':
      return '锚点';
    case 'variable':
      return '变量';
    case 'start':
      return '起始';
    case 'end':
      return '终止';
    default:
      return '未知';
  }
};

const copyRegex = async () => {
  if (generatedRegex.value) {
    await copyToClipboard(generatedRegex.value, '正则表达式已复制到剪贴板', '复制失败');
  }
};

const handleTokenSelection = (selection: TextSelection) => {
  try {
    addSelection(selection);
    ElMessage.success(`已添加${getSelectionLabel(selection.type)}选择: ${selection.text}`);

    // Emit the generated regex
    if (generateRegex.value.isValid) {
      emit('regexGenerated', generateRegex.value.regex, generateRegex.value.replaceString);
    }
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '添加选择失败');
  }
};

const getToolDescription = (mode: string) => {
  switch (mode) {
    case 'anchor':
      return '锚点模式：选择固定不变的文本作为定位参照，生成的正则将精确匹配这些内容。';
    case 'variable':
      return '变量模式：选择变化的内容（如名字、数值），生成的正则将使用通配符捕获这部分。';
    case 'start':
      return '起始符：标记匹配区域的开始边界（前瞻断言），不包含在匹配结果中。';
    case 'end':
      return '终止符：标记匹配区域的结束边界（后瞻断言），不包含在匹配结果中。';
    default:
      return '';
  }
};
</script>

<style scoped>
.smart-text-selector {
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color-page);
}

.selector-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.selector-header h4 {
  margin: 0;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.tool-description {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  border-left: 3px solid var(--el-color-primary);
}

.tool-description .info-icon {
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.mode-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.text-area-wrapper {
  margin-bottom: 16px;
}

.selectable-text {
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  user-select: text;
  cursor: text;
  color: var(--el-text-color-primary);
}

.selectable-text :deep(.anchor-selection) {
  background-color: rgba(255, 193, 7, 0.3);
  border: 1px solid #ffc107;
  border-radius: 3px;
  padding: 1px 2px;
}

.selectable-text :deep(.variable-selection) {
  background-color: rgba(0, 123, 255, 0.3);
  border: 1px solid #007bff;
  border-radius: 3px;
  padding: 1px 2px;
}

.selectable-text :deep(.start-selection) {
  background-color: rgba(40, 167, 69, 0.3);
  border: 1px solid #28a745;
  border-radius: 3px;
  padding: 1px 2px;
}

.selectable-text :deep(.end-selection) {
  background-color: rgba(220, 53, 69, 0.3);
  border: 1px solid #dc3545;
  border-radius: 3px;
  padding: 1px 2px;
}

.selection-summary {
  margin-bottom: 16px;
}

.selection-summary h5 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.selection-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selection-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
}

.selection-item.anchor {
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.selection-item.variable {
  background-color: rgba(0, 123, 255, 0.1);
  border: 1px solid rgba(0, 123, 255, 0.3);
}

.selection-item.start {
  background-color: rgba(40, 167, 69, 0.1);
  border: 1px solid rgba(40, 167, 69, 0.3);
}

.selection-item.end {
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.selection-type {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  min-width: 80px;
}

.selection-text {
  flex: 1;
  font-family: 'Courier New', monospace;
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.regex-output {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.regex-output h5 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.regex-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.regex-display code {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: var(--el-color-primary);
  word-break: break-all;
}

.replace-preview {
  margin-top: 12px;
}

.replace-preview h5 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.replace-display {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
}

.replace-display code {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: var(--el-color-success);
  word-break: break-all;
}

.validation-info {
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 193, 7, 0.05);
  border: 1px solid rgba(255, 193, 7, 0.2);
  border-radius: 6px;
}

.validation-info h5 {
  margin: 0 0 8px 0;
  color: var(--el-color-warning);
  font-size: 14px;
}

.validation-issues {
  margin: 0;
  padding: 0;
  list-style: none;
}

.validation-issue {
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.validation-issue::before {
  content: '• ';
  color: var(--el-color-warning);
  font-weight: bold;
}

.selection-stats {
  margin-top: 12px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.stats-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.stats-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
}
</style>
