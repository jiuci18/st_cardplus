<script setup lang="ts">
import { copyToClipboard } from '@/utils/clipboard';
import { saveFile } from '@/utils/fileSave';
import {
  convertJsonlToMarkdown,
  type JsonlConversionOptions,
  type JsonlConversionResult,
} from '@/utils/jsonlNovelConverter';
import { Icon } from '@iconify/vue';
import type { UploadFile } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';

const sourceFileName = ref('');
const sourceText = ref('');
const outputMarkdown = ref('');
const chapterCount = ref(0);
const characterCount = ref(0);
const outputFileName = ref('chat.md');

const options = ref<JsonlConversionOptions>({
  includeUser: true,
  includeTime: true,
  includeThinking: false,
  includeSummary: false,
  cleanMode: false,
});

const hasSource = computed(() => sourceText.value.length > 0);
const hasOutput = computed(() => outputMarkdown.value.length > 0);
const sourceLineCount = computed(() => (sourceText.value ? sourceText.value.split(/\r?\n/).length : 0));
const outputLineCount = computed(() => (outputMarkdown.value ? outputMarkdown.value.split(/\r?\n/).length : 0));

const applyConversionResult = (result: JsonlConversionResult) => {
  outputMarkdown.value = result.markdown;
  chapterCount.value = result.chapterCount;
  characterCount.value = result.characterCount;
  outputFileName.value = result.outputFileName;
};

const runConversion = () => {
  if (!sourceText.value || !sourceFileName.value) {
    ElMessage.warning('请先选择一个 JSONL 文件');
    return;
  }

  try {
    const result = convertJsonlToMarkdown(sourceText.value, sourceFileName.value, options.value);
    applyConversionResult(result);
    ElMessage.success(`转换完成，共生成 ${result.chapterCount} 章`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '转换失败';
    ElMessage.error(message);
  }
};

const loadFile = async (file: File) => {
  if (!file.name.toLowerCase().endsWith('.jsonl')) {
    ElMessage.error('请选择 .jsonl 文件');
    return;
  }

  try {
    sourceFileName.value = file.name;
    sourceText.value = await file.text();
    outputMarkdown.value = '';
    chapterCount.value = 0;
    characterCount.value = 0;
    outputFileName.value = file.name.replace(/\.[^.]+$/, '.md');
    ElMessage.success(`已加载文件：${file.name}`);
    runConversion();
  } catch {
    ElMessage.error('读取文件失败');
  }
};

const handleUploadChange = (file: UploadFile) => {
  if (!file.raw) {
    ElMessage.error('文件不可用');
    return;
  }

  void loadFile(file.raw);
};

const clearAll = () => {
  sourceFileName.value = '';
  sourceText.value = '';
  outputMarkdown.value = '';
  chapterCount.value = 0;
  characterCount.value = 0;
  outputFileName.value = 'chat.md';
};

const copyResult = async () => {
  if (!outputMarkdown.value) {
    ElMessage.warning('没有可复制的 Markdown');
    return;
  }

  await copyToClipboard(outputMarkdown.value, 'Markdown 已复制到剪贴板', '复制失败');
};

const downloadResult = async () => {
  if (!outputMarkdown.value) {
    ElMessage.warning('没有可下载的 Markdown');
    return;
  }

  const result = await saveFile({
    data: new TextEncoder().encode(outputMarkdown.value),
    fileName: outputFileName.value,
    mimeType: 'text/markdown;charset=utf-8',
  });

  if (result.canceled) {
    ElMessage.info('已取消保存');
    return;
  }

  ElMessage.success(`已开始下载：${outputFileName.value}`);
};
</script>

<template>
  <div class="converter-container">
    <div class="header">
      <el-button class="back-button" type="primary" plain @click="$router.push('/toolbox')">
        <Icon icon="material-symbols:arrow-back" width="16" height="16" />
        返回工具箱
      </el-button>
      <h1>JSONL 小说转换器</h1>
    </div>

    <el-alert title="工具说明" type="info" :closable="false" class="info-alert">
      <p>将 SillyTavern 导出的聊天记录 JSONL 转换为 Markdown 小说文本。</p>
      <p>支持直接拖入 `.jsonl` 文件，导入后会自动解析并生成 Markdown。</p>
      <p>开启“完全干净模式”后，将移除标题、角色信息、章节标题、模型信息，只用 `---` 分隔正文。</p>
    </el-alert>

    <el-card shadow="hover" class="control-card">
      <div class="control-grid">
        <div class="control-block upload-block">
          <div class="block-title">文件导入</div>
          <el-upload
            drag
            action=""
            :auto-upload="false"
            :show-file-list="false"
            accept=".jsonl"
            class="upload-area"
            :on-change="handleUploadChange"
          >
            <div class="upload-content">
              <Icon icon="material-symbols:upload-file-outline-rounded" width="52" height="52" class="upload-icon" />
              <div class="upload-text">
                将 JSONL 文件拖到此处，或
                <em>点击上传</em>
              </div>
            </div>
            <template #tip>
              <div class="upload-tip">当前文件：{{ sourceFileName || '未选择文件' }}</div>
            </template>
          </el-upload>
        </div>

        <div class="control-block option-block">
          <div class="block-title">导出选项</div>
          <el-checkbox v-model="options.includeUser">保留用户输入</el-checkbox>
          <el-checkbox v-model="options.includeTime">保留时间戳</el-checkbox>
          <el-checkbox v-model="options.includeThinking">保留 &lt;thinking&gt;</el-checkbox>
          <el-checkbox v-model="options.includeSummary">保留 &lt;details&gt;/摘要</el-checkbox>
          <el-checkbox v-model="options.cleanMode">完全干净模式</el-checkbox>
        </div>

        <div class="control-block summary-block">
          <div class="block-title">转换摘要</div>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">源文件行数</span>
              <span class="summary-value">{{ sourceLineCount }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">章节数</span>
              <span class="summary-value">{{ chapterCount }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">输出字符数</span>
              <span class="summary-value">{{ characterCount }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">输出文件名</span>
              <span class="summary-value">{{ outputFileName }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <div class="io-grid">
      <el-card shadow="hover" class="editor-card">
        <template #header>
          <div class="card-header">
            <span>源 JSONL</span>
            <span class="header-meta">{{ sourceLineCount }} 行</span>
          </div>
        </template>
        <el-input
          v-model="sourceText"
          type="textarea"
          :rows="24"
          placeholder="请选择或拖入 .jsonl 文件，原始内容会显示在这里"
          class="editor-textarea"
        />
      </el-card>

      <el-card shadow="hover" class="editor-card">
        <template #header>
          <div class="card-header">
            <span>输出 Markdown</span>
            <span class="header-meta">{{ outputLineCount }} 行</span>
          </div>
        </template>
        <el-input
          v-model="outputMarkdown"
          type="textarea"
          :rows="24"
          readonly
          placeholder="转换结果会显示在这里"
          class="editor-textarea"
        />
      </el-card>
    </div>

    <div class="button-group">
      <el-button type="primary" :disabled="!hasSource" @click="runConversion">
        <Icon icon="material-symbols:auto-fix-high" class="icon-left" />
        重新转换
      </el-button>
      <el-button :disabled="!hasOutput" @click="copyResult">
        <Icon icon="material-symbols:content-copy-outline" class="icon-left" />
        复制 Markdown
      </el-button>
      <el-button :disabled="!hasOutput" @click="downloadResult">
        <Icon icon="material-symbols:download" class="icon-left" />
        下载 MD
      </el-button>
      <el-button :disabled="!hasSource && !hasOutput" @click="clearAll">
        <Icon icon="material-symbols:delete-outline" class="icon-left" />
        清空
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.converter-container {
  padding: 20px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 1rem;
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

.control-card {
  margin-bottom: 20px;
}

.control-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr;
  gap: 20px;
}

.control-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  min-height: 156px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 120px;
  text-align: center;
}

.upload-icon {
  color: var(--el-color-primary);
}

.upload-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}

.upload-text em {
  font-style: normal;
  color: var(--el-color-primary);
}

.upload-tip {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  word-break: break-word;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 6px;
  background-color: var(--el-fill-color-light);
}

.summary-label,
.header-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.summary-value {
  font-size: 14px;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.io-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.editor-card {
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.editor-textarea :deep(.el-textarea__inner) {
  font-family: 'Courier New', Courier, monospace;
  line-height: 1.6;
}

.button-group {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.icon-left {
  margin-right: 4px;
}

@media (max-width: 960px) {
  .control-grid,
  .io-grid {
    grid-template-columns: 1fr;
  }
}
</style>
