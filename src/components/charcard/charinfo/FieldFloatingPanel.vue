<template>
  <Teleport to="body">
    <aside v-show="active && visible && !closed" ref="panel" class="appearance-floating-panel" :aria-label="title"
      :style="positionStyle">
      <div class="floating-header" :class="{ 'is-pinned': pinned }" @pointerdown="startDrag" @pointermove="moveDrag"
        @pointerup="stopDrag" @pointercancel="stopDrag" @lostpointercapture="stopDrag">
        <span>{{ title }}</span>
        <div class="floating-actions" @pointerdown.stop>
          <el-button text size="small" :aria-pressed="pinned" :title="pinned ? '取消固定，可拖动面板' : '固定面板位置'"
            :aria-label="pinned ? '取消固定面板' : '固定面板'" @click="pinned = !pinned">
            <Icon :icon="pinned ? 'ph:push-pin-fill' : 'ph:push-pin'" />
          </el-button>
          <el-button text size="small" :aria-expanded="expanded" :aria-label="`${expanded ? '收起' : '展开'}${title}`"
            :title="expanded ? '收起' : '展开'" @click="expanded = !expanded">
            <Icon :icon="expanded ? 'ph:caret-down' : 'ph:caret-up'" />
          </el-button>
          <el-button text size="small" title="关闭" :aria-label="`关闭${title}`" @click="closePanel">
            <Icon icon="ph:x" />
          </el-button>
        </div>
      </div>
      <div v-show="expanded" class="floating-content">
        <slot />
      </div>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue';
import { ElButton } from 'element-plus';
import { Icon } from '@iconify/vue';

const props = defineProps<{ title: string; fieldKey: string | null; openSignal: number; toggleSignal: number; visible: boolean; anchor?: { x: number; y: number } | null }>();
const panel = ref<HTMLElement>();
const active = ref(true);
const expanded = ref(true);
const closed = ref(props.openSignal === 0 && props.toggleSignal === 0);
const pinned = ref(false);
const position = ref<{ x: number; y: number } | null>(null);
const positionStyle = computed(() => position.value
  ? { left: `${position.value.x}px`, top: `${position.value.y}px`, right: 'auto', bottom: 'auto' }
  : {});
let drag: { id: number; x: number; y: number; left: number; top: number } | null = null;

function clampPosition(x: number, y: number) {
  const rect = panel.value?.getBoundingClientRect();
  return {
    x: Math.max(8, Math.min(x, window.innerWidth - (rect?.width ?? 0) - 8)),
    y: Math.max(8, Math.min(y, window.innerHeight - (rect?.height ?? 0) - 8)),
  };
}
function startDrag(event: PointerEvent) {
  if (pinned.value || event.button !== 0 || !panel.value) return;
  const rect = panel.value.getBoundingClientRect();
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  event.preventDefault();
}
function moveDrag(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return;
  position.value = clampPosition(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
}
function stopDrag() { drag = null; }
function closePanel() {
  stopDrag();
  closed.value = true;
}
function fitViewport() {
  if (!active.value || !props.visible || closed.value) return;
  if (position.value) position.value = clampPosition(position.value.x, position.value.y);
}
async function positionNearAnchor() {
  await nextTick();
  if (closed.value || pinned.value || !props.anchor) return;
  position.value = clampPosition(props.anchor.x + 12, props.anchor.y + 12);
}
watch(() => props.openSignal, () => {
  closed.value = false;
  expanded.value = true;
  void positionNearAnchor();
});
watch(() => props.toggleSignal, () => {
  if (closed.value) {
    closed.value = false;
    expanded.value = true;
    void positionNearAnchor();
  } else {
    closePanel();
  }
});
watch([expanded, active, closed, () => props.fieldKey, () => props.visible], fitViewport, { flush: 'post' });
let observer: ResizeObserver | undefined;
onMounted(() => {
  void positionNearAnchor();
  window.addEventListener('resize', fitViewport);
  observer = new ResizeObserver(fitViewport);
  if (panel.value) observer.observe(panel.value);
});
onActivated(() => { active.value = true; });
onDeactivated(() => { active.value = false; stopDrag(); });
onBeforeUnmount(() => {
  window.removeEventListener('resize', fitViewport);
  observer?.disconnect();
});
</script>

<style scoped>
.appearance-floating-panel {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2000;
  width: min(460px, calc(100vw - 16px));
  min-width: min(300px, calc(100vw - 16px));
  max-width: calc(100vw - 16px);
  resize: horizontal;
  max-height: calc(100dvh - 16px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  box-shadow: var(--el-box-shadow-dark);
}

.floating-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;
  user-select: none;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.floating-header.is-pinned {
  cursor: default;
}

.floating-actions {
  display: flex;
}

.floating-actions .el-button+.el-button {
  margin-left: 4px;
}

.floating-content {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.floating-content :deep(.field-editor-panel) {
  border: 0;
  border-radius: 0;
}

@media (max-width: 600px) {
  .appearance-floating-panel {
    right: 8px;
    bottom: 8px;
  }
}
</style>
