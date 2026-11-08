<template>
  <div class="worldbook-bottom-panel-buttons" v-if="context === 'list'" :class="{ 'is-compact': sidebarWidth < 270 }">
    <div class="worldbook-action-split">
      <el-tooltip content="从文件导入为新世界书" placement="top" :show-arrow="false" :offset="8" :hide-after="0">
        <BrowserFilePicker accept=".json" @select-first="file => emit('import-book-file', file)">
          <button class="btn-adv btn-primary-adv worldbook-bottom-button-text worldbook-primary-import">
            <Icon icon="ph:book-open-duotone" width="16" height="16" class="worldbook-button-text-icon" />
            <span class="worldbook-button-text-short">导入</span>
            <span class="worldbook-button-text-long">导入世界书</span>
          </button>
        </BrowserFilePicker>
      </el-tooltip>
      <el-dropdown trigger="click" placement="bottom-end" @command="handleListCommand">
        <button class="btn-adv btn-primary-adv worldbook-bottom-button-text worldbook-action-dropdown"
          aria-label="更多操作">
          <Icon icon="ph:caret-down-duotone" width="16" height="16" class="worldbook-button-text-icon" />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="copy">
              <Icon icon="ph:books-duotone" class="dropdown-item-icon" />
              复制整个世界书
            </el-dropdown-item>
            <el-dropdown-item command="export">
              <Icon icon="ph:export-duotone" class="dropdown-item-icon" />
              导出当前世界书
            </el-dropdown-item>
            <el-dropdown-item command="clear" divided>
              <Icon icon="ph:trash-simple-duotone" class="dropdown-item-icon" />
              清空所有条目
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>

  <!-- Editor Actions -->
  <div v-if="context === 'editor'" class="worldbook-editor-buttons">
    <div v-if="hasSelection" class="save-button-group">
      <el-tooltip content="复制当前条目 (到剪贴板)" placement="bottom" :show-arrow="false" :offset="8" :hide-after="0">
        <button @click="$emit('copy-entry')" :disabled="!hasSelection"
          class="btn-adv btn-secondary-adv worldbook-editor-button" aria-label="复制当前条目">
          <Icon icon="ph:copy-simple-duotone" class="worldbook-editor-button-icon" />
        </button>
      </el-tooltip>
      <el-tooltip content="手动立即保存" placement="bottom" :show-arrow="false" :offset="8" :hide-after="0">
        <button @click="$emit('save-entry')" class="btn-adv btn-primary-adv worldbook-editor-button"
          aria-label="保存当前条目">
          <Icon icon="ph:floppy-disk-duotone" class="worldbook-editor-button-icon" />
        </button>
      </el-tooltip>
      <SaveStatusBadge :status="saveStatus" :mode="autoSaveMode" @toggle="$emit('toggle-mode')" />
      <el-tooltip content="删除当前条目" placement="bottom" :show-arrow="false" :offset="8" :hide-after="0">
        <button @click="$emit('delete-entry')" class="btn-adv btn-danger-adv worldbook-editor-button"
          aria-label="删除当前条目">
          <Icon icon="ph:trash-duotone" class="worldbook-editor-button-icon-delete" />
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElDropdown, ElDropdownItem, ElDropdownMenu, ElTooltip } from 'element-plus';
import SaveStatusBadge from '@/components/ui/common/SaveStatusBadge.vue';
import BrowserFilePicker from '@/components/ui/common/BrowserFilePicker.vue';

interface Props {
  context: 'list' | 'editor';
  hasSelection?: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  autoSaveMode?: 'auto' | 'watch' | 'manual';
  sidebarWidth?: number;
}

const { sidebarWidth = Infinity } = defineProps<Props>();

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
</style>
