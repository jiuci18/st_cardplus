<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { ElTooltip } from 'element-plus';

const { status = 'idle', mode = 'watch' } = defineProps<{
  status?: 'idle' | 'saving' | 'saved' | 'error';
  mode?: 'auto' | 'watch' | 'manual';
}>();
defineEmits<{ toggle: [] }>();

const modes = {
  auto: { icon: 'ph:clock-countdown-duotone', text: '自动保存', tooltip: '点击切换到监听模式' },
  watch: { icon: 'ph:eye-duotone', text: '监听中', tooltip: '点击切换到手动模式' },
  manual: { icon: 'ph:hand-duotone', text: '已禁用', tooltip: '点击切换到自动保存模式' },
};
const statuses = {
  saving: { icon: 'eos-icons:loading', text: '保存中' },
  saved: { icon: 'ph:check-circle-fill', text: '已保存' },
  error: { icon: 'ph:warning-circle-fill', text: '失败' },
};
const badge = computed(() => status === 'idle' ? modes[mode] : statuses[status]);
</script>

<template>
  <el-tooltip :content="modes[mode].tooltip" placement="bottom" :show-arrow="false" :offset="8" :hide-after="0">
    <button type="button" class="save-status-badge" :class="`status-${status === 'idle' ? mode : status}`"
      @click="$emit('toggle')">
      <Icon :icon="badge.icon" class="badge-icon" :class="{ spinning: status === 'saving' }" />
      <span class="badge-text">{{ badge.text }}</span>
    </button>
  </el-tooltip>
</template>

<style scoped>
.save-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  user-select: none;
  background-color: var(--badge-background);
  color: var(--badge-color);
  border: 1px solid var(--badge-border);
}
.save-status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.save-status-badge:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.status-auto {
  --badge-background: var(--el-color-primary-light-9);
  --badge-color: var(--el-color-primary);
  --badge-border: var(--el-color-primary-light-5);
}
.status-watch {
  --badge-background: var(--el-fill-color);
  --badge-color: var(--el-text-color-secondary);
  --badge-border: var(--el-border-color);
}
.status-manual {
  --badge-background: var(--el-color-warning-light-9);
  --badge-color: var(--el-color-warning-dark-2);
  --badge-border: var(--el-color-warning-light-5);
}
.status-saving {
  --badge-background: var(--el-color-info-light-9);
  --badge-color: var(--el-color-info);
  --badge-border: var(--el-color-info-light-5);
}
.status-saved {
  --badge-background: var(--el-color-success-light-9);
  --badge-color: var(--el-color-success-dark-2);
  --badge-border: var(--el-color-success-light-5);
}
.status-error {
  --badge-background: var(--el-color-danger-light-9);
  --badge-color: var(--el-color-danger);
  --badge-border: var(--el-color-danger-light-5);
}
.badge-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.badge-text {
  line-height: 1;
}
@media (max-width: 768px) {
  .save-status-badge { padding: 4px 10px; font-size: 12px; }
  .badge-icon { font-size: 14px; }
}
</style>
