<script setup lang="ts">
import { completionsEndpoint, endpointSuggestions } from '@/utils/imageGenerator/chatEndpoint';
import {
  ChatImageError,
  downloadRemoteImage,
  fetchChatModels,
  generatedFileName,
  generateChatImage,
  type ChatImageConfig,
  type GeneratedImage,
} from '@/utils/imageGenerator/chatImages';
import { localStorageStore } from '@/utils/localStorageUtils';
import { saveFile } from '@/utils/system/fileSave';
import { Icon } from '@iconify/vue';
import type { UploadFile } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

interface GeneratedImageItem {
  id: number;
  image: GeneratedImage;
  previewURL: string;
  downloading: boolean;
}

interface ReferenceImageItem {
  id: number;
  file: File;
  previewURL: string;
}

interface AutoCompleteItem {
  value: string;
}

const configStorageKey = 'st-cardplus:chat-image-config:v1';
const historyStorageKey = 'st-cardplus:chat-image-history:v1';
const historyLimit = 10;
const referenceLimit = 8;

const defaultConfig: ChatImageConfig = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-image-2',
  stream: false,
};

const chatConfig = ref<ChatImageConfig>({ ...defaultConfig });
const showConfig = ref(false);
const discoveredModels = ref<string[]>([]);
const modelsLoading = ref(false);
const modelsNotice = ref('');
let modelsSource = '';
let modelsAbort: AbortController | undefined;

const imagePrompt = ref('');
const requestCount = ref(1);
const generating = ref(false);
let abortController: AbortController | undefined;

const promptHistory = ref<string[]>([]);
const selectedHistory = ref('');
const historyOptions = computed(() =>
  promptHistory.value.map((prompt) => ({
    label: prompt.replace(/\s+/g, ' ').slice(0, 80),
    value: prompt,
  }))
);

const elapsedSeconds = ref(0);
const streamedBytes = ref(0);
let elapsedTimer: number | undefined;
const generatingStatus = computed(() => {
  const parts = [`已用时 ${elapsedSeconds.value.toFixed(1)} 秒`];
  if (streamedBytes.value > 0) {
    parts.push(`已接收 ${(streamedBytes.value / 1024).toFixed(0)} KB`);
  }
  return parts.join('，');
});

const generatedImages = ref<GeneratedImageItem[]>([]);
const referenceImages = ref<ReferenceImageItem[]>([]);
let nextReferenceID = 1;
let nextGeneratedID = 1;

function loadConfig() {
  const saved = localStorageStore.get(configStorageKey);
  if (!saved) return;

  try {
    const value = JSON.parse(saved) as Partial<ChatImageConfig>;
    chatConfig.value = {
      endpoint: typeof value.endpoint === 'string' ? value.endpoint : defaultConfig.endpoint,
      apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
      model: typeof value.model === 'string' ? value.model : defaultConfig.model,
      stream: value.stream === true,
    };
  } catch {
    localStorageStore.remove(configStorageKey);
  }
}

function loadHistory() {
  const saved = localStorageStore.get(historyStorageKey);
  if (!saved) return;

  try {
    const value: unknown = JSON.parse(saved);
    if (Array.isArray(value)) {
      promptHistory.value = value
        .filter((entry): entry is string => typeof entry === 'string')
        .slice(0, historyLimit);
    }
  } catch {
    localStorageStore.remove(historyStorageKey);
  }
}

function recordHistory(prompt: string) {
  const entry = prompt.trim();
  if (!entry) return;

  promptHistory.value = [
    entry,
    ...promptHistory.value.filter((candidate) => candidate !== entry),
  ].slice(0, historyLimit);
  localStorageStore.set(historyStorageKey, JSON.stringify(promptHistory.value));
}

function selectHistory(value: string) {
  if (!value) return;
  imagePrompt.value = value;
  selectedHistory.value = '';
}

function completeEndpoint() {
  const completed = completionsEndpoint(chatConfig.value.endpoint);
  if (completed !== chatConfig.value.endpoint) chatConfig.value.endpoint = completed;
}

function saveConfig() {
  completeEndpoint();
  localStorageStore.set(configStorageKey, JSON.stringify(chatConfig.value));
  showConfig.value = false;
  ElMessage.success('ChatAPI 配置已保存在当前浏览器');
}

function suggestEndpoints(_query: string, callback: (items: AutoCompleteItem[]) => void) {
  callback(endpointSuggestions(chatConfig.value.endpoint).map((value) => ({ value })));
}

function suggestModels(query: string, callback: (items: AutoCompleteItem[]) => void) {
  const keyword = query.trim().toLowerCase();
  const matched = keyword
    ? discoveredModels.value.filter((model) => model.toLowerCase().includes(keyword))
    : discoveredModels.value;
  callback(matched.slice(0, 100).map((value) => ({ value })));
}

async function loadModels() {
  completeEndpoint();
  const endpoint = chatConfig.value.endpoint;
  if (!endpoint.trim()) {
    modelsNotice.value = '请先填写 ChatAPI 地址';
    return;
  }

  modelsAbort?.abort();
  const controller = new AbortController();
  modelsAbort = controller;
  modelsLoading.value = true;
  modelsNotice.value = '';

  try {
    const models = await fetchChatModels(chatConfig.value, { signal: controller.signal });
    discoveredModels.value = models;
    modelsSource = endpoint;
    modelsNotice.value = `已发现 ${models.length} 个模型，输入可筛选`;
  } catch (error) {
    if (controller.signal.aborted) return;
    discoveredModels.value = [];
    modelsSource = '';
    modelsNotice.value = error instanceof Error ? error.message : '获取模型列表失败';
  } finally {
    if (modelsAbort === controller) {
      modelsAbort = undefined;
      modelsLoading.value = false;
    }
  }
}

function clearGenerated() {
  for (const generated of generatedImages.value) {
    if (generated.image.kind === 'blob') URL.revokeObjectURL(generated.previewURL);
  }
  generatedImages.value = [];
}

function removeGenerated(id: number) {
  const generated = generatedImages.value.find((candidate) => candidate.id === id);
  if (!generated) return;
  if (generated.image.kind === 'blob') URL.revokeObjectURL(generated.previewURL);
  generatedImages.value = generatedImages.value.filter((candidate) => candidate.id !== id);
}

function clearReferences() {
  for (const reference of referenceImages.value) URL.revokeObjectURL(reference.previewURL);
  referenceImages.value = [];
}

function removeReference(id: number) {
  const reference = referenceImages.value.find((candidate) => candidate.id === id);
  if (!reference) return;
  URL.revokeObjectURL(reference.previewURL);
  referenceImages.value = referenceImages.value.filter((candidate) => candidate.id !== id);
}

function addReference(selected: File): boolean {
  if (referenceImages.value.length >= referenceLimit) {
    ElMessage.warning(`最多只能添加 ${referenceLimit} 张参考图`);
    return false;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
    ElMessage.error('参考图仅支持 JPEG、PNG 或 WebP');
    return false;
  }
  if (selected.size > 10 << 20) {
    ElMessage.error('参考图不能超过 10 MB');
    return false;
  }

  referenceImages.value.push({
    id: nextReferenceID++,
    file: selected,
    previewURL: URL.createObjectURL(selected),
  });
  return true;
}

function selectReference(file: UploadFile) {
  if (file.raw) addReference(file.raw);
}

function pasteReference(event: ClipboardEvent) {
  const images = Array.from(event.clipboardData?.items ?? [])
    .filter((candidate) => candidate.kind === 'file' && candidate.type.startsWith('image/'))
    .flatMap((item) => {
      const image = item.getAsFile();
      return image ? [image] : [];
    });
  if (!images.length) return;

  event.preventDefault();
  const added = images.filter(addReference).length;
  if (added) ElMessage.success(`已粘贴 ${added} 张参考图`);
}

function encodeReference(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new ChatImageError('无法读取参考图', 'response'));
    };
    reader.onerror = () => reject(new ChatImageError('无法读取参考图', 'response'));
    reader.readAsDataURL(file);
  });
}

function cancelGenerate() {
  abortController?.abort();
}

async function generate() {
  if (generating.value) return;

  generating.value = true;
  abortController = new AbortController();
  const signal = abortController.signal;
  recordHistory(imagePrompt.value);
  clearGenerated();
  elapsedSeconds.value = 0;
  streamedBytes.value = 0;

  const startedAt = performance.now();
  window.clearInterval(elapsedTimer);
  elapsedTimer = window.setInterval(() => {
    elapsedSeconds.value = (performance.now() - startedAt) / 1000;
  }, 100);

  try {
    const encodedReferences = await Promise.all(
      referenceImages.value.map((reference) => encodeReference(reference.file))
    );
    const count = Math.min(referenceLimit, Math.max(1, requestCount.value));
    const receivedPerRequest = Array.from({ length: count }, () => 0);
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, index) =>
        generateChatImage(chatConfig.value, imagePrompt.value, {
          referenceImages: encodedReferences,
          signal,
          onProgress: (receivedBytes) => {
            receivedPerRequest[index] = receivedBytes;
            streamedBytes.value = receivedPerRequest.reduce((sum, bytes) => sum + bytes, 0);
          },
        })
      )
    );

    generatedImages.value = results.flatMap((result) => {
      if (result.status === 'rejected') return [];
      return [
        {
          id: nextGeneratedID++,
          image: result.value,
          previewURL: result.value.kind === 'blob' ? URL.createObjectURL(result.value.blob) : result.value.url,
          downloading: false,
        },
      ];
    });

    const failed = results.length - generatedImages.value.length;
    if (signal.aborted) {
      ElMessage.info(generatedImages.value.length ? `已取消，保留 ${generatedImages.value.length} 张已完成的图片` : '已取消生成');
    } else if (failed) {
      const firstFailure = results.find((result) => result.status === 'rejected');
      const reason = firstFailure?.status === 'rejected' && firstFailure.reason instanceof Error
        ? firstFailure.reason.message
        : '请求失败';
      ElMessage.warning(`${generatedImages.value.length} 张生成成功，${failed} 张失败：${reason}`);
    } else {
      ElMessage.success(`已生成 ${generatedImages.value.length} 张图片`);
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '图片生成失败');
  } finally {
    window.clearInterval(elapsedTimer);
    elapsedSeconds.value = (performance.now() - startedAt) / 1000;
    generating.value = false;
    abortController = undefined;
  }
}

async function saveGenerated(generated: GeneratedImageItem) {
  generated.downloading = true;
  try {
    const image = generated.image.kind === 'blob'
      ? { blob: generated.image.blob, mimeType: generated.image.mimeType }
      : await downloadRemoteImage(generated.image.url);
    const bytes = new Uint8Array(await image.blob.arrayBuffer());
    const result = await saveFile({
      data: bytes,
      fileName: generatedFileName(image.mimeType),
      mimeType: image.mimeType,
      rememberDirKey: 'imageGenerator.saveDir',
    });

    if (result.canceled) {
      ElMessage.info('已取消保存');
      return;
    }
    ElMessage.success('图片已保存');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    generated.downloading = false;
  }
}

onMounted(() => {
  loadConfig();
  loadHistory();
  window.addEventListener('paste', pasteReference);
});

onBeforeUnmount(() => {
  abortController?.abort();
  modelsAbort?.abort();
  window.clearInterval(elapsedTimer);
  window.removeEventListener('paste', pasteReference);
  clearGenerated();
  clearReferences();
});

watch(showConfig, (opened) => {
  if (!opened) {
    modelsAbort?.abort();
    return;
  }
  completeEndpoint();
  if (chatConfig.value.endpoint.trim() && modelsSource !== chatConfig.value.endpoint) {
    void loadModels();
  }
});
</script>

<template>
  <div class="image-generator-container">
    <div class="header">
      <el-button type="primary" plain class="back-button" @click="$router.push('/toolbox')">
        <Icon icon="material-symbols:arrow-back" width="16" height="16" />
        返回工具箱
      </el-button>
      <h1>图片生成</h1>
      <el-button class="config-button" @click="showConfig = true">
        API 配置
      </el-button>
    </div>

    <el-alert title="工具说明" type="info" :closable="false" class="info-alert">
      <p>通过你自己的 OpenAI 兼容 Chat Completions API 生成图片。</p>
      <p>API Key 只保存在当前浏览器，由浏览器直接发送给你配置的上游地址。</p>
    </el-alert>

    <el-card shadow="hover" class="prompt-card">
      <el-input v-model="imagePrompt" type="textarea" :autosize="{ minRows: 5, maxRows: 12 }"
        placeholder="描述你想生成的图片，Ctrl / ⌘ + Enter 快速生成" @keydown.ctrl.enter="generate" @keydown.meta.enter="generate" />

      <el-select v-if="historyOptions.length" v-model="selectedHistory" clearable filterable placeholder="最近使用的提示词"
        class="history-select" @change="selectHistory">
        <el-option v-for="option in historyOptions" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>

      <div class="reference-block">
        <div class="reference-toolbar">
          <el-upload action="" :auto-upload="false" :show-file-list="false" multiple
            accept="image/jpeg,image/png,image/webp" :on-change="selectReference">
            <el-button plain>
              <Icon icon="material-symbols:add-photo-alternate-outline" width="18" height="18" />
              添加参考图
            </el-button>
          </el-upload>
          <span class="muted-text">可直接粘贴，最多 8 张；单张最大 10 MB</span>
          <el-button v-if="referenceImages.length" text type="danger" @click="clearReferences">
            清空参考图
          </el-button>
        </div>

        <div v-if="referenceImages.length" class="reference-grid">
          <div v-for="reference in referenceImages" :key="reference.id" class="reference-item">
            <el-image :src="reference.previewURL" fit="contain" class="reference-image" />
            <div class="reference-name" :title="reference.file.name">
              {{ reference.file.name }}
            </div>
            <el-button size="small" text type="danger" @click="removeReference(reference.id)">
              移除
            </el-button>
          </div>
        </div>
      </div>

      <div class="action-row">
        <span class="status-text">
          <template v-if="generating">{{ generatingStatus }}</template>
          <template v-else-if="elapsedSeconds > 0">上次生成用时 {{ elapsedSeconds.toFixed(1) }} 秒</template>
          <template v-else>结果不会自动上传或保存</template>
        </span>
        <div class="actions">
          <span class="muted-text">请求数</span>
          <el-input-number v-model="requestCount" :min="1" :max="8" :precision="0" class="count-input" />
          <el-button v-if="generating" type="danger" @click="cancelGenerate">
            取消
          </el-button>
          <el-button v-else type="primary" :disabled="!imagePrompt.trim()" @click="generate">
            生成图片
          </el-button>
        </div>
      </div>
    </el-card>

    <section v-if="generatedImages.length" class="result-section">
      <div class="result-header">
        <h2>生成结果</h2>
        <el-button text @click="clearGenerated">清空结果</el-button>
      </div>

      <div class="result-grid">
        <figure v-for="generated in generatedImages" :key="generated.id" class="result-card">
          <el-image :src="generated.previewURL" :preview-src-list="[generated.previewURL]" fit="contain"
            class="result-image" />
          <div v-if="generated.image.kind === 'remote'" class="remote-warning">
            远程图片可能因 CORS 限制而无法保存，请优先让上游返回 base64 图片。
          </div>
          <figcaption class="result-actions">
            <el-button size="small" @click="removeGenerated(generated.id)">丢弃</el-button>
            <el-button size="small" type="primary" :loading="generated.downloading" @click="saveGenerated(generated)">
              下载保存
            </el-button>
          </figcaption>
        </figure>
      </div>
    </section>

    <el-dialog v-model="showConfig" title="ChatAPI 配置" width="min(34rem, 92vw)">
      <el-alert title="安全提示" type="warning" :closable="false" class="dialog-alert">
        API Key 仅保存在当前浏览器的 Local Storage，并由浏览器直接发送给所配置的上游地址。
      </el-alert>

      <el-form label-position="top">
        <el-form-item label="Chat Completions 地址">
          <el-autocomplete v-model="chatConfig.endpoint" :fetch-suggestions="suggestEndpoints" :trigger-on-focus="true"
            clearable placeholder="填入 https://api.openai.com/v1 即可自动补全" class="full-width" @blur="completeEndpoint" />
        </el-form-item>

        <el-form-item label="API Key">
          <el-input v-model="chatConfig.apiKey" type="password" show-password placeholder="sk-..." />
        </el-form-item>

        <el-form-item label="模型">
          <div class="model-row">
            <el-autocomplete v-model="chatConfig.model" :fetch-suggestions="suggestModels" :trigger-on-focus="true"
              clearable placeholder="gpt-image-2" class="model-input" />
            <el-button :loading="modelsLoading" @click="loadModels">获取模型</el-button>
          </div>
          <div v-if="modelsNotice" class="models-notice">{{ modelsNotice }}</div>
        </el-form-item>

        <el-form-item label="流式请求（SSE）">
          <div class="switch-row">
            <el-switch v-model="chatConfig.stream" />
            <span class="muted-text">适用于支持流式返回图片的上游，可实时显示接收进度</span>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showConfig = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.image-generator-container {
  width: 100%;
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.25rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.header h1 {
  flex: 1;
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.info-alert,
.dialog-alert {
  margin-bottom: 1.25rem;
}

.info-alert p {
  margin: 0.25rem 0;
}

.prompt-card {
  margin-bottom: 2rem;
}

.history-select {
  width: 100%;
  margin-top: 0.75rem;
}

.reference-block {
  margin-top: 1rem;
}

.reference-toolbar,
.action-row,
.actions,
.result-header,
.result-actions,
.model-row,
.switch-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reference-toolbar,
.action-row,
.result-header {
  justify-content: space-between;
  flex-wrap: wrap;
}

.muted-text,
.status-text,
.models-notice,
.remote-warning {
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
}

.reference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.reference-item {
  min-width: 0;
  padding: 0.5rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5rem;
  background: var(--el-bg-color-overlay);
}

.reference-image {
  display: block;
  width: 100%;
  height: 9rem;
  border-radius: 0.375rem;
  background: var(--el-fill-color-light);
}

.reference-name {
  margin-top: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.action-row {
  margin-top: 1rem;
}

.count-input {
  width: 7rem;
}

.result-section {
  margin-top: 2rem;
}

.result-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--el-text-color-primary);
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1.25rem;
  margin-top: 1rem;
}

.result-card {
  min-width: 0;
  margin: 0;
  padding: 1rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.75rem;
  background: var(--el-bg-color-overlay);
}

.result-image {
  display: block;
  width: 100%;
  height: 30rem;
  border-radius: 0.5rem;
  background: var(--el-fill-color-light);
}

.remote-warning {
  margin-top: 0.5rem;
}

.result-actions {
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.full-width {
  width: 100%;
}

.model-row {
  width: 100%;
}

.model-input {
  flex: 1;
}

.models-notice {
  margin-top: 0.25rem;
}

.config-button {
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .image-generator-container {
    padding: 1rem;
  }

  .header,
  .action-row,
  .actions,
  .model-row {
    align-items: stretch;
    flex-direction: column;
  }

  .config-button,
  .back-button,
  .actions>.el-button,
  .model-row>.el-button {
    width: 100%;
  }

  .result-image {
    height: 22rem;
  }
}
</style>
