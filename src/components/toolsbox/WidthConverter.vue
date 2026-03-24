<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';
import { copyToClipboard } from '@/utils/clipboard';

const inputText = ref('');
const outputText = ref('');
const conversionMode = ref<'full-to-half' | 'half-to-full'>('full-to-half');

const hasInput = computed(() => inputText.value.length > 0);
const charCount = computed(() => inputText.value.length);
const outputCharCount = computed(() => outputText.value.length);

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
  Object.entries(specialFullToHalfMap).map(([full, half]) => [half, full])
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
  return convertCharacters(text, specialHalfToFullMap, (char, code) => {
    if (code === 0x20) return '　';
    if (code >= 0x21 && code <= 0x7e) {
      return String.fromCharCode(code + 0xfee0);
    }
    return char;
  });
}

function applyTransform(transformer: (text: string) => string, successMessage: string) {
  if (!inputText.value) {
    ElMessage.warning('请先输入要处理的文本');
    return;
  }

  outputText.value = transformer(inputText.value);
  ElMessage.success(successMessage);
}

function convertText() {
  applyTransform(
    conversionMode.value === 'full-to-half' ? toHalfWidth : toFullWidth,
    '转换完成'
  );
}

function swapTexts() {
  if (!outputText.value) {
    ElMessage.warning('当前没有可交换的结果');
    return;
  }

  inputText.value = outputText.value;
  outputText.value = '';
  conversionMode.value = conversionMode.value === 'full-to-half' ? 'half-to-full' : 'full-to-half';
}

function clearAll() {
  inputText.value = '';
  outputText.value = '';
}

function removeBlankLines() {
  applyTransform(
    (text) =>
      text
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '')
        .join('\n'),
    '已清除独立空行'
  );
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

    <el-alert type="info" :closable="false" class="info-alert">
      <p>支持中英文标点、字母、数字与空格的全角 / 半角互转。</p>
      <p>也支持清除独立空行，适合统一文本格式、清理提示词或处理中日文混排内容。</p>
    </el-alert>

    <div class="config-section">
      <div class="config-item">
        <label>转换方向：</label>
        <el-radio-group v-model="conversionMode" size="large">
          <el-radio-button label="full-to-half">全角 → 半角</el-radio-button>
          <el-radio-button label="half-to-full">半角 → 全角</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="action-section">
      <el-button type="primary" @click="convertText" :disabled="!hasInput">
        <Icon icon="material-symbols:sync-alt" class="icon-left" />
        开始转换
      </el-button>
      <el-button type="success" plain @click="removeBlankLines" :disabled="!hasInput">
        <Icon icon="material-symbols:format-line-spacing" class="icon-left" />
        清除独立空行
      </el-button>
      <el-button @click="swapTexts" :disabled="!outputText">
        <Icon icon="material-symbols:swap-horiz" class="icon-left" />
        交换结果
      </el-button>
      <p> · </p>
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
          placeholder="请输入要转换的文本，例如：ＡＢＣ１２３，。！？"
        />
      </div>

      <div class="editor-section">
        <div class="section-header">
          <h3>转换结果</h3>
          <span>{{ outputCharCount }} 字符</span>
        </div>
        <el-input
          v-model="outputText"
          type="textarea"
          :rows="16"
          resize="vertical"
          readonly
          placeholder="转换结果会显示在这里"
        />
      </div>
    </div>

    <div class="tips-section">
      <h3>转换说明</h3>
      <ul>
        <li>全角转半角：例如 `ＡＢＣ１２３，“你好”！` → `ABC123,"你好"!`</li>
        <li>半角转全角：例如 `ABC 123!?` → `ＡＢＣ　１２３！？`</li>
        <li>清除独立空行：会删除内容为空或只包含空格的整行，并保留其余文本顺序。</li>
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

.info-alert {
  margin-bottom: 20px;
}

.info-alert p {
  margin: 4px 0;
  font-size: 14px;
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
