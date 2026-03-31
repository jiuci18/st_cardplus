<script setup lang="ts">
import { copyToClipboard } from '@/utils/clipboard';
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';

type FormatterOperation = 'full-to-half' | 'half-to-full' | 'remove-blank-lines' | 'minify-json';

const inputText = ref('');
const outputText = ref('');
const selectedOperations = ref<FormatterOperation[]>(['full-to-half']);

const OPERATION_OPTIONS: Array<{ label: string; value: FormatterOperation }> = [
  { label: '全角转半角', value: 'full-to-half' },
  { label: '半角转全角', value: 'half-to-full' },
  { label: '清除独立空行', value: 'remove-blank-lines' },
  { label: 'JSON 压缩', value: 'minify-json' },
];

const CONFLICTS: Record<FormatterOperation, FormatterOperation[]> = {
  'full-to-half': ['half-to-full'],
  'half-to-full': ['full-to-half', 'minify-json'],
  'remove-blank-lines': [],
  'minify-json': ['half-to-full'],
};

const hasInput = computed(() => inputText.value.length > 0);
const hasSelectedOperations = computed(() => selectedOperations.value.length > 0);
const charCount = computed(() => inputText.value.length);
const outputCharCount = computed(() => outputText.value.length);
const selectedOperationLabels = computed(() =>
  OPERATION_OPTIONS.filter((option) => selectedOperations.value.includes(option.value)).map((option) => option.label)
);

const specialFullToHalfMap: Record<string, string> = {
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '，': ',',
  '。': '.',
  '：': ':',
  '；': ';',
  '！': '!',
  '？': '?',
  '（': '(',
  '）': ')',
  '【': '[',
  '】': ']',
  '｛': '{',
  '｝': '}',
  '《': '<',
  '》': '>',
};

const specialHalfToFullMap: Record<string, string> = Object.fromEntries(
  Object.entries(specialFullToHalfMap)
    .filter(([, half]) => half !== '"' && half !== "'")
    .map(([full, half]) => [half, full])
) as Record<string, string>;

function convertCharacters(
  text: string,
  specialMap: Record<string, string>,
  unicodeConverter: (char: string, code: number) => string
): string {
  return Array.from(text)
    .map((char) => {
      const mapped = specialMap[char];
      if (mapped) {
        return mapped;
      }

      return unicodeConverter(char, char.charCodeAt(0));
    })
    .join('');
}

function toHalfWidth(text: string): string {
  return convertCharacters(text, specialFullToHalfMap, (char, code) => {
    if (code === 0x3000) return ' ';
    if (code >= 0xff01 && code <= 0xff5e) {
      return String.fromCharCode(code - 0xfee0);
    }
    return char;
  });
}

function toFullWidth(text: string): string {
  let doubleQuoteOpen = true;
  let singleQuoteOpen = true;

  return Array.from(text)
    .map((char) => {
      if (char === '"') {
        const quote = doubleQuoteOpen ? '“' : '”';
        doubleQuoteOpen = !doubleQuoteOpen;
        return quote;
      }

      if (char === "'") {
        const quote = singleQuoteOpen ? '‘' : '’';
        singleQuoteOpen = !singleQuoteOpen;
        return quote;
      }

      const mapped = specialHalfToFullMap[char];
      if (mapped) {
        return mapped;
      }

      const code = char.charCodeAt(0);
      if (code === 0x20) return '　';
      if (code >= 0x21 && code <= 0x7e) {
        return String.fromCharCode(code + 0xfee0);
      }
      return char;
    })
    .join('');
}

function removeBlankLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .join('\n');
}

function minifyJson(text: string): string {
  return JSON.stringify(JSON.parse(text));
}

function getResolvedOperations(operations: FormatterOperation[]) {
  return OPERATION_OPTIONS.reduce<FormatterOperation[]>((resolved, option) => {
    if (!operations.includes(option.value)) {
      return resolved;
    }

    const conflicts = CONFLICTS[option.value];
    if (resolved.some((operation) => conflicts.includes(operation))) {
      return resolved;
    }

    resolved.push(option.value);
    return resolved;
  }, []);
}

function isSameOperationList(left: FormatterOperation[], right: FormatterOperation[]) {
  return left.length === right.length && left.every((operation, index) => operation === right[index]);
}

watch(selectedOperations, (operations) => {
  const resolvedOperations = getResolvedOperations(operations);
  if (!isSameOperationList(resolvedOperations, operations)) {
    selectedOperations.value = resolvedOperations;
  }
});

function processText() {
  if (!inputText.value) {
    ElMessage.warning('请先输入要处理的文本');
    return;
  }

  const operations = getResolvedOperations(selectedOperations.value);
  if (!operations.length) {
    ElMessage.warning('请先选择至少一个处理功能');
    return;
  }

  selectedOperations.value = operations;

  try {
    let result = inputText.value;

    for (const operation of operations) {

      if (operation === 'full-to-half') {
        result = toHalfWidth(result);
      } else if (operation === 'half-to-full') {
        result = toFullWidth(result);
      } else if (operation === 'remove-blank-lines') {
        result = removeBlankLines(result);
      } else if (operation === 'minify-json') {
        result = minifyJson(result);
      }
    }

    outputText.value = result;
    ElMessage.success(`处理完成：${selectedOperationLabels.value.join(' / ')}`);
  } catch {
    if (operations.includes('minify-json')) {
      ElMessage.warning('JSON 格式无效，无法压缩');
      return;
    }

    ElMessage.warning('处理失败，请检查输入内容');
  }
}

function swapTexts() {
  if (!outputText.value) {
    ElMessage.warning('当前没有可交换的结果');
    return;
  }

  inputText.value = outputText.value;
  outputText.value = '';
}

function clearAll() {
  inputText.value = '';
  outputText.value = '';
}

async function copyResult() {
  if (!outputText.value) {
    ElMessage.warning('没有可复制的内容');
    return;
  }

  await copyToClipboard(outputText.value);
}
</script>

<template>
  <div class="text-formatter">
    <div class="header">
      <el-button type="primary" plain @click="$router.push('/toolbox')" class="back-button">
        <Icon icon="material-symbols:arrow-back" width="16" height="16" />
        返回工具箱
      </el-button>
      <h1>文本格式化</h1>
    </div>

    <div class="config-section">
      <div class="config-item">
        <label>处理功能：</label>
        <el-checkbox-group
          v-model="selectedOperations"
        >
          <el-checkbox
            v-for="option in OPERATION_OPTIONS"
            :key="option.value"
            :label="option.value"
            class="operation-checkbox"
          >
            {{ option.label }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <p class="config-hint">
        勾选时会自动取消互斥项。执行顺序固定为：全角转半角 / 半角转全角 → 清除独立空行 → JSON 压缩
      </p>
    </div>

    <div class="action-section">
      <el-button type="primary" @click="processText" :disabled="!hasInput || !hasSelectedOperations">
        <Icon icon="material-symbols:auto-fix-high" class="icon-left" />
        一键处理
      </el-button>
      <el-button @click="swapTexts" :disabled="!outputText">
        <Icon icon="material-symbols:swap-horiz" class="icon-left" />
        交换结果
      </el-button>
      <el-button @click="clearAll" :disabled="!inputText && !outputText">
        <Icon icon="material-symbols:delete-outline" class="icon-left" />
        清空
      </el-button>
      <el-button type="primary" plain @click="copyResult" :disabled="!outputText">
        <Icon icon="material-symbols:content-copy-outline" class="icon-left" />
        复制结果
      </el-button>
    </div>

    <div class="editor-grid">
      <div class="editor-section">
        <div class="section-header">
          <h3>输入内容</h3>
          <span>{{ charCount }} 字符</span>
        </div>
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="16"
          resize="vertical"
          placeholder="请输入要处理的文本或 JSON 内容"
        />
      </div>

      <div class="editor-section">
        <div class="section-header">
          <h3>处理结果</h3>
          <span>{{ outputCharCount }} 字符</span>
        </div>
        <el-input
          v-model="outputText"
          type="textarea"
          :rows="16"
          resize="vertical"
          readonly
          placeholder="处理结果会显示在这里"
        />
      </div>
    </div>

    <div class="tips-section">
      <h3>处理说明</h3>
      <ul>
        <li>全角转半角：例如 `ＡＢＣ１２３，“你好”！` → `ABC123,"你好"!`</li>
        <li>半角转全角：例如 `ABC 123!?` → `ＡＢＣ　１２３！？`</li>
        <li>清除独立空行：删除内容为空或只包含空格的整行。</li>
        <li>JSON 压缩：校验 JSON 后输出单行结果，不会破坏字符串内部空格。</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.text-formatter {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
}

.config-section {
  background: var(--el-fill-color-light);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.config-item label {
  font-weight: 500;
  min-width: 80px;
}

.config-item :deep(.el-checkbox-group) {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.operation-checkbox {
  flex: 1;
  min-width: 160px;
  margin-right: 0;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.config-hint {
  margin: 12px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.action-section {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.editor-section {
  min-width: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
}

.tips-section {
  margin-top: 20px;
  padding: 16px 20px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
}

.tips-section h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 16px;
}

.tips-section ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}

.icon-left {
  margin-right: 4px;
}

@media (max-width: 768px) {
  .text-formatter {
    padding: 12px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .config-section {
    padding: 16px;
  }

  .config-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .config-item :deep(.el-checkbox-group) {
    width: 100%;
    flex-direction: column;
  }

  .operation-checkbox {
    width: 100%;
  }

  .action-section {
    align-items: stretch;
  }

  .editor-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
