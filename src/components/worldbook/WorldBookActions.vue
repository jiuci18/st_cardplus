<template>
  <div
    class="worldbook-bottom-panel-buttons"
    v-if="context === 'list'"
    :class="{ 'is-compact': sidebarWidth < 270 }"
  >
    <div class="worldbook-action-split">
      <el-tooltip
        content="从文件导入为新世界书"
        placement="top"
        :show-arrow="false"
        :offset="8"
        :hide-after="0"
      >
        <BrowserFilePicker accept=".json" @select-first="handleBookUpload">
          <button class="btn-adv btn-primary-adv worldbook-bottom-button-text worldbook-primary-import">
            <Icon
              icon="ph:book-open-duotone"
              width="16"
              height="16"
              class="worldbook-button-text-icon"
            />
            <span class="worldbook-button-text-short">导入</span>
            <span class="worldbook-button-text-long">导入世界书</span>
          </button>
        </BrowserFilePicker>
      </el-tooltip>
      <el-dropdown
        trigger="click"
        placement="bottom-end"
        @command="handleListCommand"
      >
        <button
          class="btn-adv btn-primary-adv worldbook-bottom-button-text worldbook-action-dropdown"
          aria-label="更多操作"
        >
          <Icon
            icon="ph:caret-down-duotone"
            width="16"
            height="16"
            class="worldbook-button-text-icon"
          />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="copy">
              <Icon
                icon="ph:books-duotone"
                class="dropdown-item-icon"
              />
              复制整个世界书
            </el-dropdown-item>
            <el-dropdown-item command="export">
              <Icon
                icon="ph:export-duotone"
                class="dropdown-item-icon"
              />
              导出当前世界书
            </el-dropdown-item>
            <el-dropdown-item
              command="clear"
              divided
            >
              <Icon
                icon="ph:trash-simple-duotone"
                class="dropdown-item-icon"
              />
              清空所有条目
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>

  <!-- Editor Actions -->
  <div
    v-if="context === 'editor'"
    class="worldbook-editor-buttons"
  >
    <div
      v-if="hasSelection"
      class="save-button-group"
    >
      <el-tooltip
        content="复制当前条目 (到剪贴板)"
        placement="bottom"
        :show-arrow="false"
        :offset="8"
        :hide-after="0"
      >
        <button
          @click="$emit('copy-entry')"
          :disabled="!hasSelection"
          class="btn-adv btn-secondary-adv worldbook-editor-button"
          aria-label="复制当前条目"
        >
          <Icon
            icon="ph:copy-simple-duotone"
            class="worldbook-editor-button-icon"
          />
        </button>
      </el-tooltip>
      <el-tooltip
        content="手动立即保存"
        placement="bottom"
        :show-arrow="false"
        :offset="8"
        :hide-after="0"
      >
        <button
          @click="$emit('save-entry')"
          class="btn-adv btn-primary-adv worldbook-editor-button"
          aria-label="保存当前条目"
        >
          <Icon
            icon="ph:floppy-disk-duotone"
            class="worldbook-editor-button-icon"
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
      <el-tooltip
        content="删除当前条目"
        placement="bottom"
        :show-arrow="false"
        :offset="8"
        :hide-after="0"
      >
        <button
          @click="$emit('delete-entry')"
          class="btn-adv btn-danger-adv worldbook-editor-button"
          aria-label="删除当前条目"
        >
          <Icon
            icon="ph:trash-duotone"
            class="worldbook-editor-button-icon-delete"
          />
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElDropdown, ElDropdownItem, ElDropdownMenu, ElTooltip } from 'element-plus';
import BrowserFilePicker from '@/components/ui/common/BrowserFilePicker.vue';

interface Props {
  context: 'list' | 'editor';
  hasSelection?: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  autoSaveMode?: 'auto' | 'watch' | 'manual';
  sidebarWidth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  sidebarWidth: Infinity,
});

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

const emit = defineEmits<{
  (e: 'copy-book'): void;
  (e: 'export-json'): void;
  (e: 'import-book-file', file: File): void;
  (e: 'clear-all'): void;
  (e: 'copy-entry'): void;
  (e: 'save-entry'): void;
  (e: 'delete-entry'): void;
  (e: 'toggle-mode'): void;
}>();

const handleBookUpload = (file: File) => {
  emit('import-book-file', file);
};

const handleListCommand = (command: string) => {
  if (command === 'copy') emit('copy-book');
  if (command === 'export') emit('export-json');
  if (command === 'clear') emit('clear-all');
};
</script>

<style scoped>
.worldbook-bottom-panel-buttons.is-compact .worldbook-button-text-long,
.worldbook-bottom-panel-buttons.is-compact .worldbook-button-text-short {
  display: none;
}

.worldbook-bottom-panel-buttons.is-compact .worldbook-bottom-button-text {
  padding: 8px;
  min-width: 36px;
  justify-content: center;
}

.worldbook-action-split {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
}

.worldbook-primary-import {
  min-width: 120px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.worldbook-action-dropdown {
  min-width: 40px;
  padding: 6px 10px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.worldbook-action-split .worldbook-bottom-button-text {
  height: 32px;
  box-sizing: border-box;
}

.dropdown-item-icon {
  margin-right: 8px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

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
