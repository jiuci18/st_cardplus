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
      <BrowserFilePicker accept=".json" @select-first="file => emit('import-file', file)">
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
      <SaveStatusBadge :status="saveStatus" :mode="autoSaveMode" @toggle="$emit('toggle-mode')" />
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
import SaveStatusBadge from '@/components/ui/common/SaveStatusBadge.vue';
import BrowserFilePicker from '@/components/ui/common/BrowserFilePicker.vue';

interface Props {
  context: 'list' | 'editor';
  hasActiveCard?: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  autoSaveMode?: 'auto' | 'watch' | 'manual';
}

defineProps<Props>();

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
</style>
