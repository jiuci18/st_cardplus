<template>
  <div class="preview-panel">
    <div class="panel-content">
      <div
        class="preview-header"
        :class="{ 'mobile-header': isMobile }"
      >
        <h4 class="section-title">代码预览</h4>
        <div
          class="header-actions"
          :class="{ 'mobile-actions': isMobile }"
        >
          <el-button
            :icon="CopyDocument"
            :size="isMobile ? 'small' : 'small'"
            @click="copyCode"
            :disabled="!store.previewCode"
          >
            {{ isMobile ? '复制' : '复制' }}
          </el-button>
          <el-button
            :icon="RefreshRight"
            :size="isMobile ? 'small' : 'small'"
            @click="store.generateEjsTemplate"
          >
            {{ isMobile ? '刷新' : '刷新' }}
          </el-button>
        </div>
      </div>

      <div
        v-if="store.previewCode"
        class="stats-bar"
      >
        <el-tag
          size="small"
          type="info"
        >
          {{ lineCount }} 行
        </el-tag>
        <el-tag
          size="small"
          type="success"
        >
          {{ characterCount }} 字符
        </el-tag>
        <el-tag
          size="small"
          type="warning"
        >
          {{ totalStagesCount }} 个阶段
        </el-tag>
      </div>

      <div
        v-if="ejsErrors.length > 0"
        class="error-section"
      >
        <el-alert
          v-for="error in ejsErrors"
          :key="error.message"
          :title="error.message"
          type="error"
          :closable="false"
          class="mb-2"
        />
      </div>

      <div class="code-preview">
        <div
          v-if="!store.previewCode"
          class="empty-preview"
        >
          <el-empty
            description="暂无生成的代码"
            :image-size="60"
          >
            <el-text type="info">请先配置变量和阶段，然后系统会自动生成 EJS 模板代码</el-text>
          </el-empty>
        </div>

        <div
          v-else
          class="code-container"
        >
          <pre class="code-content"><code>{{ store.previewCode }}</code></pre>
        </div>
      </div>

      <div
        v-if="store.previewCode"
        class="template-info"
      >
        <h5>模板信息</h5>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">阶段数量:</span>
            <span class="value">{{ totalStagesCount }}</span>
          </div>
          <div class="info-item">
            <span class="label">生成时间:</span>
            <span class="value">{{ formatTimestamp(lastGeneratedTime) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEjsEditorStore } from '@/composables/ejs/ejsEditor';
import { copyToClipboard } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/datetime';
import { useDevice } from '@/composables/useDevice';
import { CopyDocument, RefreshRight } from '@element-plus/icons-vue';
import { computed, ref, watch } from 'vue';

const store = useEjsEditorStore();
const { isMobile } = useDevice();
const lastGeneratedTime = ref(Date.now());

const lineCount = computed(() => {
  return store.previewCode ? store.previewCode.split('\n').length : 0;
});

const characterCount = computed(() => {
  return store.previewCode ? store.previewCode.length : 0;
});

const ejsErrors = computed(() => {
  return store.errors.filter((error) => error.type === 'ejs');
});

const totalStagesCount = computed(() => {
  if (!store.logicBlocks) return 0;
  return store.logicBlocks.reduce((total, block) => total + block.stages.length, 0);
});

watch(
  () => store.previewCode,
  () => {
    if (store.previewCode) {
      lastGeneratedTime.value = Date.now();
    }
  }
);

async function copyCode() {
  if (!store.previewCode) {
    return;
  }

  await copyToClipboard(store.previewCode, '代码已复制到剪贴板', '复制失败');
}

function formatTimestamp(timestamp: number): string {
  return formatDateTime(timestamp, 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
</script>

<style scoped>
.preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.stats-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.error-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-preview {
  flex: 1;
  min-height: 200px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  overflow: hidden;
}

.empty-preview {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.code-container {
  height: 100%;
  overflow: auto;
  background-color: var(--el-bg-color-page);
}

.code-content {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  background-color: transparent;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 100%;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.template-info {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 12px;
  background-color: var(--el-fill-color-extra-light);
}

.template-info h5 {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.info-item .label {
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.info-item .value {
  color: var(--el-text-color-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  text-align: right;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .preview-panel {
    padding: 8px 12px;
  }

  .panel-content {
    padding: 0;
    gap: 12px;
  }

  .mobile-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .mobile-header .section-title {
    text-align: center;
    margin-bottom: 4px;
  }

  .mobile-actions {
    justify-content: center;
    gap: 6px;
  }

  .stats-bar {
    justify-content: center;
    flex-wrap: wrap;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .mobile-quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }

  .mobile-quick-actions .action-button {
    flex: 1;
    min-width: 0;
  }

  .code-content {
    font-size: 11px;
    padding: 12px;
  }

  .template-info {
    padding: 8px;
  }

  .code-preview {
    min-height: 150px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .panel-content {
    padding: 12px;
  }

  .quick-actions {
    justify-content: center;
  }
}

@media (prefers-color-scheme: dark) {
  .code-content {
    background-color: #1e1e1e;
    color: #d4d4d4;
  }
}
</style>
