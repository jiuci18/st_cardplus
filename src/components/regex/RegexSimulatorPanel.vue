<template>
  <el-divider><h3>模拟器</h3></el-divider>
  <el-form-item label="测试字符串 (Test String)">
    <el-input
      :model-value="testString"
      @update:model-value="$emit('update:testString', $event)"
      type="textarea"
      :rows="5"
    />
  </el-form-item>
  <el-form-item label="结果 (Result)">
    <div class="result-controls">
      <el-button
        size="small"
        :disabled="!preview.css || !!preview.error"
        @click="copyProcessedCss"
      >
        复制处理后的 CSS
      </el-button>
      <el-switch
        :model-value="renderHtml"
        @update:model-value="$emit('update:renderHtml', $event)"
        active-text="渲染HTML"
        inactive-text="显示源码"
        size="small"
      />
    </div>
    <div class="preview-hint">
      预览中的 class 和内嵌 CSS 类选择器会同步添加 custom- 前缀，不修改源码；复制的 CSS 需搭配加前缀后的 class 使用。
    </div>
    <el-alert
      v-if="preview.error"
      class="preview-error"
      :title="preview.error"
      type="error"
      :closable="false"
    />
    <div
      v-if="renderHtml && !preview.error"
      class="result-box html-rendered"
      v-html="preview.html"
    ></div>
    <pre
      v-else-if="!renderHtml"
      class="result-box"
      >{{ simulatedResult }}</pre
    >
  </el-form-item>
  <el-form-item label="宏测试 (Macros)">
    <div class="macro-grid">
      <el-input
        :model-value="userMacroValue"
        @update:model-value="$emit('update:userMacroValue', $event)"
      >
        <template #prepend>{{ user }}</template>
      </el-input>
      <el-input
        :model-value="charMacroValue"
        @update:model-value="$emit('update:charMacroValue', $event)"
      >
        <template #prepend>{{ char }}</template>
      </el-input>
    </div>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { copyToClipboard } from '@/utils/clipboard';
import { prepareRegexPreview } from './regexPreview';

const props = defineProps<{
  testString: string;
  simulatedResult: string;
  renderHtml: boolean;
  userMacroValue: string;
  charMacroValue: string;
}>();

defineEmits(['update:testString', 'update:renderHtml', 'update:userMacroValue', 'update:charMacroValue']);

const user = '{{user}}';
const char = '{{char}}';

const preview = computed(() => {
  try {
    return { ...prepareRegexPreview(props.simulatedResult), error: '' };
  } catch (error) {
    // Never render the unprocessed CSS on failure: it could affect the editor.
    const detail = error instanceof Error ? error.message : '未知错误';
    return { html: '', css: '', error: `CSS 预处理失败，请检查源码：${detail}` };
  }
});

async function copyProcessedCss() {
  if (!preview.value.css || preview.value.error) return;
  await copyToClipboard(preview.value.css, '处理后的 CSS 已复制到剪贴板');
}
</script>

<style scoped>
.macro-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 767px) {
  .macro-grid {
    grid-template-columns: 1fr;
  }
}
.result-controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
  margin-bottom: 8px;
}

.preview-hint {
  width: 100%;
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.preview-error {
  margin-bottom: 8px;
}

.result-box {
  background-color: var(--el-fill-color-light);
  padding: 10px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
  width: 100%;
  min-height: 100px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.result-box.html-rendered {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  white-space: normal;
}

.result-box.html-rendered * {
  max-width: 100%;
  word-wrap: break-word;
}
</style>
