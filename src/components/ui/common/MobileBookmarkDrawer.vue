<template>
  <div class="mobile-bookmark-drawer">
    <div
      class="mobile-bookmark-group"
      :style="groupStyle"
    >
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="mobile-bookmark-btn"
        :class="{ active: activeTab === item.key && visible }"
        @click="openItem(item.key)"
      >
        <Icon
          v-if="item.icon"
          :icon="item.icon"
          class="bookmark-icon"
        />
        <span>{{ item.buttonLabel ?? item.label }}</span>
      </button>
    </div>

    <el-drawer
      v-model="visible"
      direction="rtl"
      :with-header="false"
      :size="drawerSize"
      :append-to-body="appendToBody"
      class="mobile-bookmark-drawer-panel"
    >
      <div class="mobile-bookmark-drawer-inner">
        <div class="mobile-bookmark-drawer-header">
          <div class="mobile-bookmark-drawer-title">{{ activeItemTitle }}</div>
          <el-button
            size="small"
            text
            @click="visible = false"
          >
            关闭
          </el-button>
        </div>

        <div
          class="mobile-bookmark-drawer-tabs"
          :style="{ '--mobile-bookmark-tab-count': String(items.length) }"
        >
          <button
            v-for="item in items"
            :key="item.key"
            type="button"
            class="mobile-bookmark-drawer-tab"
            :class="{ active: activeTab === item.key }"
            @click="activeTab = item.key"
          >
            {{ item.drawerLabel ?? item.label }}
          </button>
        </div>

        <div class="mobile-bookmark-drawer-body">
          <div
            v-for="item in items"
            :key="item.key"
            v-show="activeTab === item.key"
            class="mobile-bookmark-drawer-pane"
          >
            <slot :name="`pane-${item.key}`" />
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, type CSSProperties } from 'vue';

export interface MobileBookmarkDrawerItem {
  key: string;
  label: string;
  icon?: string;
  buttonLabel?: string;
  drawerLabel?: string;
  title?: string;
}

const props = withDefaults(defineProps<{
  items: MobileBookmarkDrawerItem[];
  drawerSize?: string;
  appendToBody?: boolean;
  groupStyle?: CSSProperties;
}>(), {
  drawerSize: '86%',
  appendToBody: true,
  groupStyle: () => ({}),
});

const visible = defineModel<boolean>('visible', { default: false });
const activeTab = defineModel<string>('activeTab', { required: true });

const activeItem = computed(() => props.items.find((item) => item.key === activeTab.value) ?? props.items[0]);
const activeItemTitle = computed(() => activeItem.value?.title ?? activeItem.value?.drawerLabel ?? activeItem.value?.label ?? '');

function openItem(key: string) {
  activeTab.value = key;
  visible.value = true;
}
</script>

<style scoped>
.mobile-bookmark-group {
  position: fixed;
  right: 0;
  top: 50%;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transform: translateY(-50%);
}

.mobile-bookmark-btn {
  width: 42px;
  border: none;
  border-radius: 12px 0 0 12px;
  background: linear-gradient(160deg, var(--el-color-primary-light-7), var(--el-color-primary-light-5));
  color: var(--el-color-primary-dark-2);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--el-color-primary) 20%, transparent);
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
}

.mobile-bookmark-btn.active {
  background: linear-gradient(160deg, var(--el-color-primary), var(--el-color-primary-dark-2));
  color: #fff;
}

.bookmark-icon {
  font-size: 16px;
}

.mobile-bookmark-drawer-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.mobile-bookmark-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.mobile-bookmark-drawer-title {
  font-size: 16px;
  font-weight: 600;
}

.mobile-bookmark-drawer-tabs {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
  grid-template-columns: repeat(var(--mobile-bookmark-tab-count, 3), minmax(0, 1fr));
}

.mobile-bookmark-drawer-tab {
  border: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  border-radius: 999px;
  padding: 6px 8px;
  font-size: 12px;
}

.mobile-bookmark-drawer-tab.active {
  border-color: var(--el-color-primary-light-3);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.mobile-bookmark-drawer-body {
  flex: 1;
  min-height: 0;
}

.mobile-bookmark-drawer-pane {
  height: 100%;
  min-height: 0;
}

:deep(.mobile-bookmark-drawer-panel .el-drawer__body) {
  padding: 14px 10px 10px;
}
</style>
