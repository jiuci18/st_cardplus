<template>
  <div class="sidebar-management">
    <div class="nav-card">
      <div class="nav-card-header">
        <div class="nav-card-title">
          <Icon
            icon="fluent:navigation-24-regular"
            width="20"
            height="20"
            class="title-icon"
          />
          <span>导航栏管理</span>
        </div>
        <el-button
          @click="resetToDefault"
          size="small"
          type="info"
          plain
        >
          <Icon
            icon="material-symbols:refresh"
            width="16"
            height="16"
          />
          重置默认
        </el-button>
      </div>

      <p class="nav-card-description">管理 PC 侧边栏与移动端快捷入口，支持拖拽排序和显示控制</p>

      <!-- 标签栏 -->
      <div class="tab-container">
        <button
          @click="activeTab = 'desktop'"
          class="tab-button"
          :class="{ active: activeTab === 'desktop' }"
        >
          <Icon
            icon="heroicons:computer-desktop"
            width="20"
            height="20"
          />
          <span class="tab-text">PC 视图</span>
        </button>
        <button
          @click="activeTab = 'tabbar'"
          class="tab-button"
          :class="{ active: activeTab === 'tabbar' }"
        >
          <Icon
            icon="heroicons:device-phone-mobile"
            width="20"
            height="20"
          />
          <span class="tab-text">移动视图</span>
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="nav-card-content">
        <div
          v-show="activeTab === 'desktop'"
          class="pc-view-grid"
        >
          <section class="view-panel">
            <div class="view-panel-header">
              <h3 class="view-panel-title">导航栏</h3>
            </div>

            <div class="menu-list">
              <draggable
                v-model="localVisibleItems"
                item-key="id"
                handle=".drag-handle"
                :animation="150"
                :move="checkMove"
                ghost-class="sortable-ghost"
                chosen-class="sortable-chosen"
                drag-class="sortable-drag"
                :force-fallback="true"
                :fallback-class="'sortable-fallback'"
                :fallback-on-body="true"
                :touch-start-threshold="3"
                @end="handleDragEnd"
              >
                <template #item="{ element: item }">
                  <div
                    class="menu-item"
                    :class="{ 'is-fixed': item.fixed }"
                  >
                    <div class="item-content">
                      <Icon
                        :icon="getIconName(item.icon)"
                        width="20"
                        height="20"
                        class="item-icon"
                      />
                      <div class="item-info">
                        <div class="item-main-line">
                          <span class="item-title">{{ item.title }}</span>
                          <div class="item-tags">
                            <span
                              v-if="item.type === 'tool'"
                              class="item-type"
                            >
                              工具
                            </span>
                            <span
                              v-if="item.beta"
                              class="item-type beta"
                            >
                              测试版
                            </span>
                          </div>
                        </div>
                        <span
                          v-if="item.description"
                          class="item-description"
                        >
                          {{ item.description }}
                        </span>
                      </div>
                    </div>
                    <div class="item-actions">
                      <el-switch
                        :model-value="true"
                        :disabled="item.fixed"
                        @change="toggleItemVisibility(item.id, false)"
                        size="small"
                      />
                      <Icon
                        icon="material-symbols:drag-indicator"
                        width="20"
                        height="20"
                        class="drag-handle"
                        :class="{ disabled: item.fixed }"
                      />
                    </div>
                  </div>
                </template>
              </draggable>

              <div
                v-if="visibleItems.length === 0"
                class="empty-state"
              >
                <Icon
                  icon="heroicons:inbox"
                  width="32"
                  height="32"
                />
                <p>暂无导航栏项目</p>
              </div>
            </div>
          </section>

          <section class="view-panel">
            <div class="view-panel-header">
              <h3 class="view-panel-title">工具箱</h3>
            </div>

            <div class="menu-list">
              <TransitionGroup
                name="list"
                tag="div"
                class="menu-list-inner"
              >
                <div
                  v-for="item in hiddenItems"
                  :key="item.id"
                  class="menu-item hidden-item"
                >
                  <div class="item-content">
                    <Icon
                      :icon="getIconName(item.icon)"
                      width="20"
                      height="20"
                      class="item-icon"
                    />
                    <div class="item-info">
                      <div class="item-main-line">
                        <span class="item-title">{{ item.title }}</span>
                        <div class="item-tags">
                          <span
                            v-if="item.type === 'tool'"
                            class="item-type"
                          >
                            工具
                          </span>
                          <span
                            v-if="item.beta"
                            class="item-type beta"
                          >
                            测试版
                          </span>
                        </div>
                      </div>
                      <span
                        v-if="item.description"
                        class="item-description"
                      >
                        {{ item.description }}
                      </span>
                    </div>
                  </div>
                  <div class="item-actions">
                    <el-switch
                      :model-value="false"
                      @change="toggleItemVisibility(item.id, true)"
                      size="small"
                    />
                  </div>
                </div>
              </TransitionGroup>

              <div
                v-if="hiddenItems.length === 0"
                class="empty-state empty-state-success"
              >
                <Icon
                  icon="heroicons:check-circle"
                  width="32"
                  height="32"
                />
                <p>所有项目都已在导航栏中</p>
              </div>
            </div>
          </section>
        </div>

        <!-- 移动视图配置 -->
        <div
          v-show="activeTab === 'tabbar'"
          class="menu-list"
        >
          <div class="tabbar-tips">
            <Icon
              icon="heroicons:information-circle"
              width="20"
              height="20"
            />
            <span>选择要在移动端底部快捷入口显示的项目（建议 3-4 个，避免过多导致拥挤）</span>
          </div>

          <TransitionGroup
            name="list"
            tag="div"
            class="menu-list-inner"
          >
            <div
              v-for="item in visibleItems"
              :key="item.id"
              class="menu-item tabbar-item"
            >
              <div class="item-content">
                <Icon
                  :icon="getIconName(item.icon)"
                  width="20"
                  height="20"
                  class="item-icon"
                />
                <div class="item-info">
                  <div class="item-main-line">
                    <span class="item-title">{{ item.title }}</span>
                    <div class="item-tags">
                      <span
                        v-if="item.showInTabBar"
                        class="item-type tabbar-active"
                      >
                        已添加
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="item-actions">
                <el-switch
                  :model-value="item.showInTabBar === true"
                  @change="toggleTabBarVisibility(item.id, $event as boolean)"
                  size="small"
                />
              </div>
            </div>
          </TransitionGroup>

          <div
            v-if="visibleItems.length === 0"
            class="empty-state"
          >
            <Icon
              icon="heroicons:inbox"
              width="32"
              height="32"
            />
            <p>没有可添加到快捷入口的项目</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getIconifyIconName } from '@/config/menuConfig';
import {
  type MenuItemConfig,
  getSidebarConfig,
  resetSidebarConfig,
  setSidebarConfig,
  updateMenuItemTabBar,
  updateMenuItemVisibility,
  updateMenuItemsOrder,
} from '@/utils/localStorageUtils';
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import draggable from 'vuedraggable';

const sidebarConfig = ref(getSidebarConfig());
const activeTab = ref<'desktop' | 'tabbar'>('desktop');
const localVisibleItems = ref<MenuItemConfig[]>([]);

const visibleItems = computed(() =>
  sidebarConfig.value.items.filter((item) => item.visible).sort((a, b) => a.order - b.order)
);

const hiddenItems = computed(() =>
  sidebarConfig.value.items.filter((item) => !item.visible).sort((a, b) => a.order - b.order)
);

watch(
  visibleItems,
  (newItems) => {
    localVisibleItems.value = [...newItems];
  },
  { immediate: true }
);

const getIconName = (iconName: string): string => {
  return getIconifyIconName(iconName);
};

const toggleItemVisibility = (itemId: string, visible: boolean) => {
  const item = sidebarConfig.value.items.find((i) => i.id === itemId);

  if (item?.fixed && !visible) {
    ElMessage.warning('该项目为固定项目，不能隐藏');
    return;
  }

  updateMenuItemVisibility(itemId, visible);

  sidebarConfig.value = getSidebarConfig();

  // 如果是导航栏，需要重新排序
  if (visible) {
    const updatedItem = sidebarConfig.value.items.find((i) => i.id === itemId);
    if (updatedItem) {
      const sortedVisibleItems = visibleItems.value.filter((i) => i.id !== itemId).sort((a, b) => a.order - b.order);

      const firstFixedIndex = sortedVisibleItems.findIndex((i) => i.fixed);

      if (firstFixedIndex !== -1) {
        const insertIndex = firstFixedIndex + 1;

        const prevItem = sortedVisibleItems[firstFixedIndex];
        const nextItem = sortedVisibleItems[insertIndex];

        if (nextItem) {
          updatedItem.order = (prevItem.order + nextItem.order) / 2;
        } else {
          updatedItem.order = prevItem.order + 1;
        }
      } else {
        const maxVisibleOrder = Math.max(...sortedVisibleItems.map((i) => i.order), -1);
        updatedItem.order = maxVisibleOrder + 1;
      }

      setSidebarConfig(sidebarConfig.value);
      sidebarConfig.value = getSidebarConfig();
    }
  }

  ElMessage.success(visible ? '已添加到导航栏' : '已移至工具箱');
};

const toggleTabBarVisibility = (itemId: string, showInTabBar: boolean) => {
  updateMenuItemTabBar(itemId, showInTabBar);

  sidebarConfig.value = getSidebarConfig();

  ElMessage.success(showInTabBar ? '已添加到移动端快捷入口' : '已从快捷入口移除');
};

// 检查是否允许移动
const checkMove = (event: {
  draggedContext: { element: MenuItemConfig };
  relatedContext: { element?: MenuItemConfig };
}) => {
  const draggedItem = event.draggedContext.element;
  const relatedItem = event.relatedContext.element;

  if (draggedItem?.fixed) {
    return false;
  }

  if (relatedItem?.fixed) {
    return false;
  }

  return true;
};

// 拖拽结束时保存排序
const handleDragEnd = () => {
  const fixedItems = localVisibleItems.value.filter((item) => item.fixed);
  const movableItems = localVisibleItems.value.filter((item) => !item.fixed);
  const fixedAtStart = fixedItems.filter((item) => item.id === 'home');
  const fixedAtEnd = fixedItems.filter((item) => item.id !== 'home');

  const finalOrder: MenuItemConfig[] = [];
  let orderIndex = 0;

  fixedAtStart.forEach((item) => {
    item.order = orderIndex++;
    finalOrder.push(item);
  });

  movableItems.forEach((item) => {
    item.order = orderIndex++;
    finalOrder.push(item);
  });

  fixedAtEnd.forEach((item) => {
    item.order = orderIndex++;
    finalOrder.push(item);
  });

  updateMenuItemsOrder(finalOrder);
  sidebarConfig.value = getSidebarConfig();
  ElMessage.success('排序已更新');
};

const resetToDefault = () => {
  resetSidebarConfig();
  sidebarConfig.value = getSidebarConfig();
  ElMessage.success('已重置为默认配置');
};

const handleSidebarConfigChange = () => {
  sidebarConfig.value = getSidebarConfig();
};

onMounted(() => {
  sidebarConfig.value = getSidebarConfig();
  window.addEventListener('sidebarConfigChange', handleSidebarConfigChange as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('sidebarConfigChange', handleSidebarConfigChange as EventListener);
});
</script>

<style scoped>
.nav-card {
  border-radius: 0.5rem;
  border-width: 1px;
  border-style: solid;
  overflow: hidden;
  background-color: var(--el-bg-color-overlay);
  border-color: var(--el-border-color);
}

.nav-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid;
  border-color: var(--el-border-color);
}

.nav-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.title-icon {
  color: var(--el-color-primary);
}

.nav-card-description {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  margin: 0;
  border-bottom: 1px solid;
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color-lighter);
}

/* 标签栏 */
.tab-container {
  display: flex;
  border-bottom: 1px solid;
  border-color: var(--el-border-color);
}

.tab-button {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0.875rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  transition-property: color, background-color, border-color;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--el-text-color-secondary);
  border-bottom: 2px solid transparent;
  min-width: 0;
}

@media (max-width: 480px) {
  .tab-button {
    gap: 0.375rem;
    padding: 0.75rem 0.5rem;
  }

  .tab-button .tab-text {
    font-size: 0.75rem;
    line-height: 1rem;
  }
}

/* 超小屏幕 */
@media (max-width: 360px) {
  .tab-button .tab-text {
    display: none;
  }

  .tab-button {
    gap: 0.25rem;
  }
}

.tab-button:hover {
  color: var(--el-text-color-primary);
  background-color: var(--el-fill-color);
}

.tab-button.active {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.tab-text {
  white-space: nowrap;
}

/* TabBar 配置提示 */
.tabbar-tips {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  background-color: var(--el-color-info-light-9);
  color: var(--el-text-color-regular);
}

.tabbar-tips .iconify {
  color: var(--el-color-info);
  flex-shrink: 0;
}

.item-type.tabbar-active {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

/* 内容区域 */
.nav-card-content {
  padding: 1rem;
}

.pc-view-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.view-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--el-border-color-light);
  border-radius: 0.75rem;
  overflow: hidden;
}

.view-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.view-panel-title {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.4;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 12rem;
  padding: 1rem;
}

.menu-list-inner {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.375rem;
  cursor: default;
  transition-property: all;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
}

.menu-item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.menu-item.hidden-item {
  opacity: 0.7;
}

/* 固定项目样式 */
.menu-item.is-fixed {
  background-color: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-5);
}

.menu-item.is-fixed:hover {
  border-color: var(--el-color-warning);
  background-color: var(--el-color-warning-light-8);
}

.menu-item.is-fixed .item-icon {
  color: var(--el-color-warning);
}

.menu-item.is-fixed .item-title {
  font-weight: 600;
  color: var(--el-color-warning-dark-2);
}

/* 项目内容 */
.item-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1 1 0%;
}

.item-icon {
  flex-shrink: 0;
  color: var(--el-color-primary);
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1 1 0%;
}

.item-main-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-title {
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  line-height: 1;
  color: var(--el-text-color-primary);
}

.item-description {
  font-size: 0.75rem;
  line-height: 1rem;
  line-height: 1.375;
  color: var(--el-text-color-secondary);
}

.item-tags {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.item-type {
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  width: fit-content;
  color: var(--el-color-info);
  background-color: var(--el-color-info-light-9);
}

.item-type.beta {
  color: var(--el-color-warning);
  background-color: var(--el-color-warning-light-9);
}

/* 操作区域 */
.item-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.drag-handle {
  padding: 0.25rem;
  margin: -0.25rem;
  cursor: grab;
  color: var(--el-text-color-secondary);
  touch-action: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle.disabled {
  cursor: not-allowed !important;
  color: var(--el-text-color-disabled);
}

@media (max-width: 768px) {
  .pc-view-grid {
    grid-template-columns: 1fr;
  }

  .view-panel-header {
    padding: 0.875rem 0.875rem 0.75rem;
  }

  .menu-list {
    padding: 0.875rem;
  }

  .drag-handle {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0.625rem;
    margin: -0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition-property: color, background-color, border-color;
    transition-duration: 150ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  .drag-handle:not(.disabled) {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }

  .drag-handle:not(.disabled):active {
    background-color: var(--el-color-primary-light-7);
  }

  .item-actions {
    gap: 0.75rem;
  }

  .drag-handle :deep(svg) {
    width: 24px !important;
    height: 24px !important;
  }
}

/* 拖拽时句柄样式 */
.sortable-chosen .drag-handle:not(.disabled),
.sortable-fallback .drag-handle:not(.disabled) {
  background-color: transparent !important;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 2rem;
  padding-bottom: 2rem;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.empty-state p {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  margin-bottom: 0;
}

.empty-state-success {
  color: var(--el-color-success);
}

/* 列表动画 */
.list-move,
.list-enter-active,
.list-leave-active {
  transition-property: all;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(2rem);
}

.list-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}
</style>

<style>
/* VueDraggable 拖拽状态样式 */

/* 占位符（插入位置指示线） */
.sidebar-management .sortable-ghost {
  position: relative;
  opacity: 1 !important;
  height: 4px !important;
  min-height: 4px !important;
  max-height: 4px !important;
  padding: 0 !important;
  margin: 4px 0 !important;
  border: none !important;
  background: linear-gradient(90deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%) !important;
  border-radius: 2px !important;
  overflow: hidden !important;
  box-shadow: 0 0 8px var(--el-color-primary-light-5);
}

.sidebar-management .sortable-ghost::before,
.sidebar-management .sortable-ghost::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  background-color: var(--el-color-primary);
  border-radius: 50%;
  transform: translateY(-50%);
}

.sidebar-management .sortable-ghost::before {
  left: 0;
}

.sidebar-management .sortable-ghost::after {
  right: 0;
}

.sidebar-management .sortable-ghost > * {
  display: none !important;
}

/* 被选中的元素 - 拖拽时隐藏 */
.sidebar-management .sortable-chosen {
  opacity: 0.3 !important;
  transform: scale(0.98);
  border-color: transparent !important;
  box-shadow: none !important;
}

/* 跟随手指/鼠标移动的元素 */
.sortable-fallback {
  opacity: 1 !important;
  background-color: var(--el-bg-color) !important;
  border: 2px solid var(--el-color-primary) !important;
  border-radius: 8px !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25) !important;
  z-index: 9999 !important;
  pointer-events: none;
}

/* 拖拽中的元素 */
.sidebar-management .sortable-drag {
  opacity: 0 !important;
}
</style>
