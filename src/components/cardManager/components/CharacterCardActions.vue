<template>
  <div
    class="character-card-actions"
    v-if="context === 'list'"
  >
    <el-tooltip
      content="从文件导入角色卡"
      placement="top"
      :show-arrow="false"
      :offset="8"
      :hide-after="0"
    >
      <BrowserFilePicker accept=".json" @select-first="handleFileUpload">
        <button class="btn-adv btn-primary-adv character-card-action-button-text">
          <Icon
            icon="ph:upload-duotone"
            width="16"
            height="16"
            class="character-card-action-button-icon"
          />
          <span class="character-card-action-text-short">导入</span>
          <span class="character-card-action-text-long">从文件导入</span>
        </button>
      </BrowserFilePicker>
    </el-tooltip>

    <el-tooltip
      content="导出所有角色卡"
      placement="top"
      :show-arrow="false"
      :offset="8"
      :hide-after="0"
    >
      <button
        @click="$emit('export-all')"
        class="btn-adv btn-success-adv character-card-action-button-text"
      >
        <Icon
          icon="ph:export-duotone"
          width="16"
          height="16"
          class="character-card-action-button-icon"
        />
        <span class="character-card-action-text-short">导出</span>
        <span class="character-card-action-text-long">导出全部</span>
      </button>
    </el-tooltip>

    <span class="character-card-action-divider"></span>

    <el-tooltip
      content="清空所有角色卡"
      placement="top"
      :show-arrow="false"
      :offset="8"
      :hide-after="0"
    >
      <button
        @click="$emit('clear-all')"
        class="btn-adv btn-danger-adv character-card-action-button-text"
      >
        <Icon
          icon="ph:trash-simple-duotone"
          width="16"
          height="16"
          class="character-card-action-button-icon"
        />
        <span class="character-card-action-text-short">清空</span>
        <span class="character-card-action-text-long">清空所有</span>
      </button>
    </el-tooltip>
  </div>

  <!-- Editor Actions -->
  <div
    v-if="context === 'editor'"
    class="character-card-editor-actions"
  >
    <div
      v-if="hasActiveCard"
      class="save-button-group"
    >
      <el-tooltip
        content="手动立即保存"
        placement="bottom"
        :show-arrow="false"
        :offset="8"
        :hide-after="0"
      >
        <button
          @click="$emit('update-card')"
          class="btn-adv btn-primary-adv character-card-editor-button"
          aria-label="更新当前角色卡"
        >
          <Icon
            icon="ph:floppy-disk-duotone"
            class="character-card-editor-button-icon"
          />
        </button>
      </el-tooltip>
      <el-tooltip
        :content="getTooltipText()"
        placement="bottom"
        :show-arrow="false"
        :offset="8"
        :hide-after="0"
      >
        <div
          class="save-status-badge"
          :class="getBadgeClass()"
          @click="$emit('toggle-mode')"
        >
          <Icon
            v-if="saveStatus === 'saving'"
            icon="eos-icons:loading"
            class="badge-icon spinning"
          />
          <Icon
            v-else-if="saveStatus === 'saved'"
            icon="ph:check-circle-fill"
            class="badge-icon"
          />
          <Icon
            v-else-if="saveStatus === 'error'"
            icon="ph:warning-circle-fill"
            class="badge-icon"
          />
          <Icon
            v-else
            :icon="getModeIcon()"
            class="badge-icon"
          />
          <span class="badge-text">{{ getBadgeText() }}</span>
        </div>
      </el-tooltip>
    </div>

    <el-tooltip
      content="另存为新角色卡"
      placement="bottom"
      :show-arrow="false"
      :offset="8"
      :hide-after="0"
    >
      <button
        @click="$emit('save-as-new')"
        class="btn-adv btn-secondary-adv character-card-editor-button"
        aria-label="另存为新角色卡"
      >
        <Icon
          icon="ph:copy-simple-duotone"
          class="character-card-editor-button-icon"
        />
      </button>
    </el-tooltip>

    <el-tooltip
      content="导出当前角色卡"
      placement="bottom"
      :show-arrow="false"
      :offset="8"
      :hide-after="0"
    >
      <button
        @click="$emit('export-current')"
        class="btn-adv btn-success-adv character-card-editor-button"
        aria-label="导出当前角色卡"
      >
        <Icon
          icon="ph:export-duotone"
          class="character-card-editor-button-icon"
        />
      </button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElTooltip } from 'element-plus';
import BrowserFilePicker from '@/components/common/BrowserFilePicker.vue';

interface Props {
  context: 'list' | 'editor';
  hasActiveCard?: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  autoSaveMode?: 'auto' | 'watch' | 'manual';
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'import-file', file: File): void;
  (e: 'export-all'): void;
  (e: 'clear-all'): void;
  (e: 'save-card'): void;
  (e: 'save-as-new'): void;
  (e: 'update-card'): void;
  (e: 'export-current'): void;
  (e: 'toggle-mode'): void;
}>();

const handleFileUpload = (file: File) => {
  emit('import-file', file);
};

const getModeIcon = () => {
  switch (props.autoSaveMode) {
    case 'auto':
      return 'ph:clock-countdown-duotone';
    case 'watch':
      return 'ph:eye-duotone';
    case 'manual':
      return 'ph:hand-duotone';
    default:
      return 'ph:eye-duotone';
  }
};

const getBadgeText = () => {
  if (props.saveStatus === 'saving') return '保存中';
  if (props.saveStatus === 'saved') return '已保存';
  if (props.saveStatus === 'error') return '失败';

  switch (props.autoSaveMode) {
    case 'auto':
      return '自动保存';
    case 'watch':
      return '监听中';
    case 'manual':
      return '已禁用';
    default:
      return '监听中';
  }
};

const getBadgeClass = () => {
  if (props.saveStatus && props.saveStatus !== 'idle') {
    return `status-${props.saveStatus}`;
  }

  switch (props.autoSaveMode) {
    case 'auto':
      return 'status-auto';
    case 'watch':
      return 'status-watch';
    case 'manual':
      return 'status-manual';
    default:
      return 'status-watch';
  }
};

const getTooltipText = () => {
  switch (props.autoSaveMode) {
    case 'auto':
      return '点击切换到监听模式';
    case 'watch':
      return '点击切换到手动模式';
    case 'manual':
      return '点击切换到自动保存模式';
    default:
      return '点击切换保存模式';
  }
};
</script>

<style scoped>
.character-card-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.character-card-action-button-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-height: 28px;
}

.character-card-action-button-icon {
  flex-shrink: 0;
}

.character-card-action-text-short {
  display: none;
}

.character-card-action-text-long {
  display: inline;
}

.character-card-action-divider {
  width: 1px;
  height: 20px;
  background-color: var(--el-border-color);
  margin: 0 4px;
}

.character-card-editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.character-card-editor-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.character-card-editor-button-icon {
  font-size: 18px;
}

/* 响应式设计 - 移动端 */
@media (max-width: 768px) {
  .character-card-editor-actions {
    gap: 4px;
  }

  .character-card-editor-button {
    min-width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .character-card-editor-button-icon {
    font-size: 16px;
  }

  .save-button-group {
    gap: 4px;
  }

  .save-status-badge {
    padding: 4px 10px;
    font-size: 12px;
  }

  .badge-icon {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .character-card-action-text-short {
    display: inline;
  }

  .character-card-action-text-long {
    display: none;
  }

  .character-card-action-button-text {
    padding: 4px 6px;
    font-size: 11px;
  }
}

/* Upload 组件内部按钮样式重置 */
:deep(.el-upload) {
  display: inline-block;
}

:deep(.el-upload .el-upload__input) {
  display: none;
}

/* 保存按钮组和状态指示器 */
.save-button-group {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.save-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  user-select: none;
}

.save-status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.save-status-badge:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 自动保存模式 */
.save-status-badge.status-auto {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border: 1px solid var(--el-color-primary-light-5);
}

/* 监听模式 */
.save-status-badge.status-watch {
  background-color: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color);
}

/* 手动模式 */
.save-status-badge.status-manual {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
  border: 1px solid var(--el-color-warning-light-5);
}

.save-status-badge.status-saving {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
  border: 1px solid var(--el-color-info-light-5);
}

.save-status-badge.status-saved {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success-dark-2);
  border: 1px solid var(--el-color-success-light-5);
}

.save-status-badge.status-error {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border: 1px solid var(--el-color-danger-light-5);
}

.badge-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.badge-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.badge-text {
  line-height: 1;
}
</style>
