<template>
  <div class="field-editor-panel">
    <div v-if="!fieldKey" class="panel-empty">
      <Icon icon="ph:cursor-click-duotone" width="28" height="28" />
      <span>点击左侧任意字段开始编辑</span>
    </div>

    <template v-else>
      <div class="panel-header">
        <div class="panel-title">
          <Icon icon="ph:pencil-simple-duotone" width="18" height="18" />
          <span>{{ label }}</span>
        </div>
        <el-button text size="small" :disabled="!modelValue" title="清空该字段内容" @click="clearValue">
          <Icon icon="material-symbols:backspace-outline" width="16" height="16" />
          <span style="margin-left: 4px">清空</span>
        </el-button>
      </div>

      <!-- 预设信息 -->
      <div class="panel-presets" :style="{ height: `${presetHeight}px` }">
        <el-scrollbar height="100%">
          <div v-if="presetGroups.length === 0" class="panel-presets-empty">
            该字段暂无内置预设，可直接在下方输入
          </div>
          <div v-for="group in presetGroups" :key="group.label" class="preset-group">
            <div class="preset-group-label">{{ group.label }}</div>
            <div class="preset-chips">
              <button v-for="item in group.items" :key="item" type="button" class="preset-chip"
                :class="{ 'is-active': activeTokens.has(item) }"
                :aria-pressed="activeTokens.has(item)"
                :title="activeTokens.has(item) ? '点击移除该预设' : '点击追加该预设'" @click="togglePreset(item)">
                {{ item }}
              </button>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- 分隔条：拖动调节上下高度 -->
      <div class="panel-splitter" :class="{ 'is-dragging': isDragging }" role="separator"
        aria-orientation="horizontal" aria-label="拖动调节预设区域高度" tabindex="0"
        @pointerdown="startDrag" @keydown="handleSplitterKeydown">
        <span class="panel-splitter-grip" />
      </div>

      <!-- 多行输入 -->
      <div class="panel-input">
        <el-input :model-value="modelValue" type="textarea" resize="none" class="panel-textarea"
          :placeholder="`请输入 ${label} 特征`" @update:model-value="emit('update:modelValue', $event)" />
        <div class="panel-input-footer">
          <span>{{ (modelValue || '').length }} 字</span>
          <span>点击预设可追加 / 移除，多条以「，」分隔</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElButton, ElInput, ElScrollbar } from 'element-plus';
import { computed, onBeforeUnmount, ref } from 'vue';
import { resolveAppearancePresets } from '@/config/appearancePresets';

const props = defineProps<{
  fieldKey: string | null;
  label: string;
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const MIN_PRESET_HEIGHT = 120;
const MAX_PRESET_HEIGHT = 520;

const presetGroups = computed(() =>
  props.fieldKey ? resolveAppearancePresets(props.fieldKey, props.label) : [],
);

const SEPARATOR = '，';
const splitTokens = (value: string): string[] =>
  value
    .split(/[，,、;；\n]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

const activeTokens = computed(() => new Set(splitTokens(props.modelValue || '')));

const togglePreset = (item: string) => {
  const current = props.modelValue || '';
  if (activeTokens.value.has(item)) {
    const next = splitTokens(current).filter((token) => token !== item);
    emit('update:modelValue', next.join(SEPARATOR));
    return;
  }
  const trimmed = current.trim();
  emit('update:modelValue', trimmed ? `${trimmed}${SEPARATOR}${item}` : item);
};

const clearValue = () => emit('update:modelValue', '');

// 分隔条拖动
const presetHeight = ref(240);
const isDragging = ref(false);
let dragStartY = 0;
let dragStartHeight = 0;

const clampHeight = (value: number) =>
  Math.min(MAX_PRESET_HEIGHT, Math.max(MIN_PRESET_HEIGHT, value));

const onPointerMove = (event: PointerEvent) => {
  presetHeight.value = clampHeight(dragStartHeight + (event.clientY - dragStartY));
};

const stopDrag = () => {
  isDragging.value = false;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', stopDrag);
  window.removeEventListener('pointercancel', stopDrag);
};

const startDrag = (event: PointerEvent) => {
  event.preventDefault();
  isDragging.value = true;
  dragStartY = event.clientY;
  dragStartHeight = presetHeight.value;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
};

const handleSplitterKeydown = (event: KeyboardEvent) => {
  const step = event.shiftKey ? 40 : 16;
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    presetHeight.value = clampHeight(presetHeight.value - step);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    presetHeight.value = clampHeight(presetHeight.value + step);
  }
};

onBeforeUnmount(stopDrag);
</script>

<style scoped>
.field-editor-panel {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 12px;
  gap: 8px;
  min-height: 320px;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-height: 280px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.panel-presets {
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-fill-color-extra-light);
}

.panel-presets-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.preset-group {
  padding: 10px 10px 0;
}

.preset-group:last-child {
  padding-bottom: 10px;
}

.preset-group-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-chip {
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background-color 0.15s;
}

.preset-chip:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.preset-chip:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

.preset-chip.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 600;
}

.panel-splitter {
  height: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
  touch-action: none;
  border-radius: 4px;
}

.panel-splitter:hover .panel-splitter-grip,
.panel-splitter:focus-visible .panel-splitter-grip,
.panel-splitter.is-dragging .panel-splitter-grip {
  background: var(--el-color-primary);
}

.panel-splitter:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

.panel-splitter-grip {
  width: 48px;
  height: 4px;
  border-radius: 999px;
  background: var(--el-border-color);
  transition: background-color 0.15s;
}

.panel-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-height: 160px;
}

.panel-textarea {
  flex: 1;
}

.panel-textarea :deep(.el-textarea__inner) {
  height: 100%;
  min-height: 150px;
  font-size: 13px;
  line-height: 1.6;
}

.panel-input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
