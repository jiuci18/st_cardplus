<template>
  <div class="character-card-tabs">
    <div
      class="tabs-container"
      @wheel="handleWheel"
    >
      <div
        class="tabs-scroll-wrapper"
        ref="scrollWrapper"
      >
        <draggable
          v-model="localTabs"
          class="tabs-list"
          item-key="id"
          :animation="200"
          ghost-class="tab-ghost"
          :disabled="false"
          :delay="200"
          :delay-on-touch-only="true"
          :touch-start-threshold="5"
          @end="handleDragEnd"
        >
          <template #item="{ element: tab }">
            <div
              :class="['tab-item', { active: tab.id === activeTabId, 'is-home': tab.type === 'home' }]"
              @click="handleTabClick(tab.id)"
              :title="tab.label"
            >
              <span class="tab-label">{{ tab.label }}</span>
              <button
                v-if="tab.closable"
                class="tab-close-btn"
                @click.stop="handleCloseTab(tab.id)"
                :title="`关闭 ${tab.label}`"
              >
                <Icon icon="ph:x" />
              </button>
            </div>
          </template>
        </draggable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tab } from '@/composables/characterCard/useTabManager';
import { Icon } from '@iconify/vue';
import { nextTick, ref, watch } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps<{
  tabs: Tab[];
  activeTabId: string;
}>();

const emit = defineEmits<{
  'switch-tab': [tabId: string];
  'close-tab': [tabId: string];
  'reorder-tabs': [tabs: Tab[]];
}>();

const scrollWrapper = ref<HTMLElement>();
const localTabs = ref<Tab[]>([...props.tabs]);

// 同步 props 的 tabs 到 localTabs
watch(
  () => props.tabs,
  (newTabs) => {
    localTabs.value = [...newTabs];
  },
  { deep: true }
);

// 点击标签页
const handleTabClick = (tabId: string) => {
  emit('switch-tab', tabId);
};

// 关闭标签页
const handleCloseTab = (tabId: string) => {
  emit('close-tab', tabId);
};

// 拖拽结束
const handleDragEnd = () => {
  emit('reorder-tabs', localTabs.value);
};

// 鼠标滚轮横向滚动
const handleWheel = (event: WheelEvent) => {
  if (!scrollWrapper.value) return;

  if (event.ctrlKey || event.metaKey) {
    return;
  }

  event.preventDefault();
  scrollWrapper.value.scrollLeft += event.deltaY;
};

// 当激活标签页变化时，滚动到可见区域
watch(
  () => props.activeTabId,
  async () => {
    await nextTick();
    scrollActiveTabIntoView();
  }
);

const scrollActiveTabIntoView = () => {
  if (!scrollWrapper.value) return;

  const activeTab = scrollWrapper.value.querySelector('.tab-item.active') as HTMLElement;
  if (!activeTab) return;

  const container = scrollWrapper.value;
  const containerRect = container.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();

  // 如果标签页在可视区域左侧
  if (tabRect.left < containerRect.left) {
    container.scrollLeft -= containerRect.left - tabRect.left + 20;
  }
  // 如果标签页在可视区域右侧
  else if (tabRect.right > containerRect.right) {
    container.scrollLeft += tabRect.right - containerRect.right + 20;
  }
};
</script>

<style scoped>
.character-card-tabs {
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  height: 48px;
  display: flex;
  align-items: stretch;
}

.tabs-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.tabs-scroll-wrapper {
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  display: flex;
  align-items: stretch;

  /* 隐藏滚动条但保持功能 */
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color-light) transparent;
}

.tabs-scroll-wrapper::-webkit-scrollbar {
  height: 4px;
}

.tabs-scroll-wrapper::-webkit-scrollbar-thumb {
  background-color: var(--el-border-color-light);
  border-radius: 2px;
}

.tabs-scroll-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: var(--el-border-color);
}

.tabs-scroll-wrapper::-webkit-scrollbar-track {
  background-color: transparent;
}

.tabs-list {
  display: flex;
  align-items: stretch;
  height: 100%;
  gap: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 100%;
  min-width: 120px;
  max-width: 200px;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
}

.tab-item:hover {
  background-color: var(--el-fill-color-light);
}

.tab-item.active {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--el-color-primary);
}

.tab-item.is-home {
  min-width: 100px;
  font-weight: 500;
}

.tab-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.tab-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0;
}

.tab-close-btn:hover {
  background-color: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.tab-item.active .tab-close-btn:hover {
  background-color: var(--el-color-primary-light-7);
  color: var(--el-color-primary);
}

.tab-ghost {
  opacity: 0.5;
  background-color: var(--el-color-primary-light-8);
}

/* 拖拽时的占位符 */
.sortable-drag {
  opacity: 0.8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tab-item {
    min-width: 80px;
    max-width: 150px;
    padding: 0 12px;
  }

  .tab-label {
    font-size: 13px;
  }
}
</style>
