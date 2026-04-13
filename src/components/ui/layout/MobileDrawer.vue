<template>
  <el-drawer
    v-model="visible"
    direction="rtl"
    :with-header="false"
    size="300px"
    class="mobile-drawer"
  >
    <div class="drawer-container">
      <!-- 菜单 -->
      <div class="drawer-menu">
        <div
          v-for="item in allMenuItems"
          :key="item.id"
          class="menu-item"
          :class="{ active: isActive(item.index) }"
          @click="handleMenuClick(item.index)"
        >
          <el-icon :size="20">
            <component :is="item.icon" />
          </el-icon>
          <span class="menu-text">{{ item.title }}</span>
          <span
            v-if="item.beta"
            class="beta-tag"
          >
            Beta
          </span>
        </div>
      </div>

      <!-- 底部 -->
      <div class="drawer-footer">
        <div class="footer-actions">
          <div
            class="action-item"
            @click="toggleDark()"
          >
            <el-icon :size="20">
              <Moon v-if="!isDark" />
              <Sunny v-else />
            </el-icon>
            <span>{{ isDark ? '浅色模式' : '暗黑模式' }}</span>
          </div>
          <div
            class="action-item"
            @click="handleMenuClick('/settings')"
          >
            <el-icon :size="20"><Setting /></el-icon>
            <span>设置</span>
          </div>
          <div
            class="action-item"
            @click="handleMenuClick('/about')"
          >
            <el-icon :size="20"><InfoFilled /></el-icon>
            <span>关于</span>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { useNavigation } from '@/composables/useNavigation';
import { InfoFilled, Moon, Setting, Sunny } from '@element-plus/icons-vue';
import { ElDrawer, ElIcon } from 'element-plus';

const visible = defineModel<boolean>({ default: false });

const { allMenuItems, isDark, toggleDark, isActive, navigateTo } = useNavigation();

const handleMenuClick = (path: string) => {
  navigateTo(path);
  visible.value = false;
};
</script>

<style scoped>
.drawer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.drawer-menu {
  flex: 1 1 0%;
  padding: 0.75rem;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
  margin-bottom: 0.25rem;
  transition-property: all;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--el-text-color-regular);
}

.menu-item:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.menu-item:active {
  transform: scale(0.98);
}

.menu-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.menu-text {
  flex: 1 1 0%;
  font-size: 15px;
}

.beta-tag {
  font-size: 10px;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 500;
  background: var(--el-color-warning-light-7);
  color: var(--el-color-warning-dark-2);
}

/* 底部 */
.drawer-footer {
  padding: 1rem;
  border-top: 1px solid var(--el-border-color-lighter);
}

.footer-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
  transition-property: all;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--el-text-color-secondary);
}

.action-item:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.action-item:active {
  transform: scale(0.98);
}
</style>
