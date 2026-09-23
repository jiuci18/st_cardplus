<template>
  <div class="field-cell" :class="{ 'is-active': active, 'is-empty': !value?.trim() }">
    <button type="button" class="field-trigger" :aria-pressed="active"
      :title="value?.trim() ? `${label}：${value}` : `编辑 ${label}`" @click="emit('select', $event)">
      <span class="field-status" aria-hidden="true">
        <Icon v-if="value?.trim()" icon="material-symbols:check-circle-rounded" width="16" height="16" />
        <span v-else class="field-status-empty">?</span>
      </span>
      <span class="field-label">{{ label }}</span>
      <span class="sr-only">{{ value?.trim() ? '已填写' : '未填写' }}</span>
    </button>
    <el-button text size="small" class="remove-btn" :class="{ 'is-confirming': confirming }"
      :title="confirming ? '再次点击确认删除' : '删除该字段'" :aria-label="`${confirming ? '确认删除' : '删除'} ${label}`" @click="remove">
      <Icon :icon="confirming ? 'material-symbols:delete-forever-outline' : 'material-symbols:delete-outline'"
        width="18" height="18" />
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { ElButton } from 'element-plus';

defineProps<{ label: string; value: string; active: boolean }>();
const emit = defineEmits<{ select: [event: MouseEvent]; remove: [] }>();
const confirming = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
function clearConfirmation() {
  confirming.value = false;
  clearTimeout(timer);
}
function remove() {
  if (confirming.value) {
    clearConfirmation();
    emit('remove');
  } else {
    confirming.value = true;
    timer = setTimeout(clearConfirmation, 3000);
  }
}
onBeforeUnmount(clearConfirmation);
</script>

<style scoped>
.field-cell {
  break-inside: avoid;
  margin-bottom: 6px;
  display: flex;
  align-items: stretch;
  gap: 4px;
}

.field-trigger {
  flex: 1;
  min-width: 0;
  font: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  background: var(--el-bg-color);
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.field-trigger:hover {
  border-color: var(--el-color-primary-light-5);
}

.field-trigger:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

.field-status {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-success);
}

.field-status-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--el-fill-color-dark);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-active .field-trigger {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.is-empty .field-label {
  color: var(--el-text-color-secondary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.remove-btn {
  flex-shrink: 0;
  width: 28px;
  height: auto;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
}

.field-cell:hover .remove-btn,
.field-cell:focus-within .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  color: var(--el-color-danger);
}

.remove-btn.is-confirming {
  color: var(--el-color-danger);
  opacity: 1;
  background: var(--el-color-danger-light-9);
}

@media (hover: none) {
  .remove-btn {
    opacity: 1;
  }
}
</style>
