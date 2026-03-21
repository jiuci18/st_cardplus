<template>
  <nav
    class="mobile-tab-bar"
    v-if="isMobile"
  >
    <!-- 左侧 Logo -->
    <router-link
      to="/"
      class="tab-logo"
    >
      <span class="tab-logo-wrap">
        <img
          src="/image/logo.png"
          alt="Logo"
          class="logo-img"
        />
        <span
          v-if="updateAvailable"
          class="tab-logo-update-dot"
        ></span>
      </span>
    </router-link>

    <!-- 中间导航项 -->
    <div class="tab-items">
      <router-link
        v-for="item in tabBarItems"
        :key="item.index"
        :to="item.index"
        class="tab-item"
        :class="{ active: isActive(item.index) }"
      >
        <el-icon :size="20">
          <component :is="item.icon" />
        </el-icon>
        <span class="tab-label">{{ item.title }}</span>
      </router-link>
    </div>

    <!-- 右侧菜单按钮 -->
    <button
      class="menu-btn"
      @click="$emit('toggle-drawer')"
    >
      <el-icon :size="22">
        <Menu />
      </el-icon>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useNavigation } from '@/composables/useNavigation';
import { useAppUpdate } from '@/composables/useAppUpdate';
import { Menu } from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';

defineEmits<{
  'toggle-drawer': [];
}>();

const { isMobile, tabBarItems, isActive } = useNavigation();
const { updateAvailable } = useAppUpdate();
</script>

<style scoped>
.mobile-tab-bar {
  display: flex;
  align-items: center;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3rem;
  z-index: 100;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  padding-bottom: env(safe-area-inset-bottom, 0);
}

/* 左侧 Logo */
.tab-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 100%;
  flex-shrink: 0;
}

.tab-logo-wrap {
  position: relative;
  display: inline-flex;
}

.logo-img {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  object-fit: contain;
}

.tab-logo-update-dot {
  position: absolute;
  top: -0.125rem;
  right: -0.125rem;
  width: 0.5625rem;
  height: 0.5625rem;
  border-radius: 9999px;
  background: #f04438;
  box-shadow: 0 0 0 2px var(--el-bg-color);
}

/* 中间导航容器 */
.tab-items {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 0%;
  height: 100%;
  gap: 0.25rem;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  text-decoration-line: none;
  gap: 0.125rem;
  transition-property: all;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--el-text-color-secondary);
}

.tab-item:active {
  transform: scale(0.95);
}

.tab-item.active {
  color: var(--el-color-primary);
}

.tab-item.active .el-icon {
  transform: scale(1.1);
}

.tab-label {
  font-size: 10px;
  white-space: nowrap;
}

/* 右侧菜单 */
.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 100%;
  flex-shrink: 0;
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--el-text-color-secondary);
}

.menu-btn:active {
  color: var(--el-color-primary);
}
</style>
