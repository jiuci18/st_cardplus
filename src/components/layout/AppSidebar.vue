<template>
  <aside
    class="app-sidebar"
    :class="{ 'sidebar-expanded': sidebarExpanded }"
  >
    <!-- 顶部 Logo -->
    <div
      class="sidebar-logo"
      @click="navigateTo('/')"
    >
      <span class="logo-wrap">
        <img
          src="/image/logo.png"
          alt="Logo"
          class="logo-img"
        />
        <span
          v-if="updateAvailable"
          class="logo-update-dot"
        ></span>
      </span>
      <span class="logo-text">ST CardPlus</span>
    </div>

    <!-- 主要导航项 -->
    <nav class="sidebar-nav">
      <el-tooltip
        v-for="item in mainNavItems"
        :key="item.index"
        :content="item.title + (item.beta ? ' (Beta)' : '')"
        placement="right"
        :show-after="200"
        :disabled="sidebarExpanded"
      >
        <router-link
          :to="item.index"
          class="nav-item"
          :class="{ active: isActive(item.index) }"
        >
          <el-icon :size="20">
            <component :is="item.icon" />
          </el-icon>
          <span class="nav-text">{{ item.title }}</span>
          <span
            v-if="item.beta && sidebarExpanded"
            class="beta-tag"
          >
            Beta
          </span>
          <span
            v-if="item.beta && !sidebarExpanded"
            class="beta-dot"
          ></span>
        </router-link>
      </el-tooltip>
    </nav>

    <!-- 底部固定项 -->
    <div class="sidebar-footer">
      <!-- 工具箱 -->
      <el-tooltip
        v-if="toolboxItem"
        :content="toolboxItem.title"
        placement="right"
        :show-after="200"
        :disabled="sidebarExpanded"
      >
        <router-link
          :to="toolboxItem.index"
          class="nav-item"
          :class="{ active: isActive(toolboxItem.index) }"
        >
          <el-icon :size="20">
            <component :is="toolboxItem.icon" />
          </el-icon>
          <span class="nav-text">{{ toolboxItem.title }}</span>
        </router-link>
      </el-tooltip>

      <!-- 分隔线 -->
      <div class="sidebar-divider"></div>

      <!-- 主题切换 -->
      <el-tooltip
        :content="isDark ? '切换浅色模式' : '切换暗黑模式'"
        placement="right"
        :show-after="200"
        :disabled="sidebarExpanded"
      >
        <button
          class="nav-item theme-toggle"
          @click="toggleDark"
        >
          <el-icon :size="20">
            <Moon v-if="!isDark" />
            <Sunny v-else />
          </el-icon>
          <span class="nav-text">{{ isDark ? '浅色模式' : '暗黑模式' }}</span>
        </button>
      </el-tooltip>

      <!-- 设置 -->
      <el-tooltip
        content="设置"
        placement="right"
        :show-after="200"
        :disabled="sidebarExpanded"
      >
        <router-link
          to="/settings"
          class="nav-item"
          :class="{ active: isActive('/settings') }"
        >
          <el-icon :size="20"><Setting /></el-icon>
          <span class="nav-text">设置</span>
        </router-link>
      </el-tooltip>

      <!-- 关于 -->
      <el-tooltip
        content="关于"
        placement="right"
        :show-after="200"
        :disabled="sidebarExpanded"
      >
        <router-link
          to="/about"
          class="nav-item"
          :class="{ active: isActive('/about') }"
        >
          <el-icon :size="20"><InfoFilled /></el-icon>
          <span class="nav-text">关于</span>
        </router-link>
      </el-tooltip>

      <!-- 展开/折叠按钮 -->
      <el-tooltip
        :content="sidebarExpanded ? '收起侧边栏' : '展开侧边栏'"
        placement="right"
        :show-after="200"
        :disabled="sidebarExpanded"
      >
        <button
          class="nav-item toggle-btn"
          @click="toggleSidebar"
        >
          <el-icon :size="20">
            <DArrowLeft v-if="sidebarExpanded" />
            <DArrowRight v-else />
          </el-icon>
          <span class="nav-text">收起</span>
        </button>
      </el-tooltip>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useNavigation } from '@/composables/useNavigation';
import { useAppUpdate } from '@/composables/useAppUpdate';
import { getSetting, setSetting } from '@/utils/localStorageUtils';
import { DArrowLeft, DArrowRight, InfoFilled, Moon, Setting, Sunny } from '@element-plus/icons-vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { mainNavItems, toolboxItem, isActive, isDark, toggleDark } = useNavigation();
const { updateAvailable } = useAppUpdate();
const sidebarExpanded = ref(true);

const toggleSidebar = () => {
  sidebarExpanded.value = !sidebarExpanded.value;
  setSetting('autoExpandSidebar', sidebarExpanded.value);
};

onMounted(() => {
  sidebarExpanded.value = getSetting('autoExpandSidebar') ?? true;
});

const navigateTo = (path: string) => {
  router.push(path);
};
</script>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  flex-shrink: 0;
  transition-property: all;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  width: 52px;
  height: 100%;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
}

.app-sidebar.sidebar-expanded {
  align-items: flex-start;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  width: 200px;
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 0.75rem;
  width: 100%;
  justify-content: center;
  height: 40px;
}

.sidebar-expanded .sidebar-logo {
  justify-content: flex-start;
  padding-left: 0.625rem;
  padding-right: 0.625rem;
}

.logo-wrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.logo-img {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.logo-update-dot {
  position: absolute;
  top: -0.125rem;
  right: -0.125rem;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 9999px;
  background: #f04438;
  box-shadow: 0 0 0 2px var(--el-bg-color);
}

.logo-text {
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 600;
  white-space: nowrap;
  transition-property: all;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--el-text-color-primary);
  opacity: 0;
  max-width: 0;
  overflow: hidden;
  margin-left: 0;
}

.sidebar-expanded .logo-text {
  opacity: 1;
  max-width: 150px;
  margin-left: 8px;
}

/* 主导航 */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1 1 0%;
  width: 100%;
}

/* 导航项 */
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  transition-property: all;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration-line: none;
  width: 40px;
  height: 40px;
  margin: 0 auto;
  color: var(--el-text-color-secondary);
}

.sidebar-expanded .nav-item {
  justify-content: flex-start;
  padding-left: 0.625rem;
  padding-right: 0.625rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  width: 100%;
  gap: 0.75rem;
  height: auto;
  margin: 0;
}

.nav-item:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.nav-item.active {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
}

.nav-text {
  font-size: 0.875rem;
  line-height: 1.25rem;
  white-space: nowrap;
  transition-property: all;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  max-width: 0;
  overflow: hidden;
}

.sidebar-expanded .nav-text {
  opacity: 1;
  max-width: 150px;
}

/* Beta 标记 */
.beta-tag {
  font-size: 10px;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  padding-top: 1px;
  padding-bottom: 1px;
  border-radius: 0.25rem;
  font-weight: 500;
  line-height: 1.25;
  margin-left: auto;
  background: var(--el-color-warning-light-7);
  color: var(--el-color-warning-dark-2);
}

.beta-dot {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--el-color-warning);
}

/* 底部 */
.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: auto;
  width: 100%;
}

.sidebar-divider {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  margin-left: auto;
  margin-right: auto;
  width: calc(100% - 16px);
  height: 1px;
  background: var(--el-border-color-lighter);
}

.theme-toggle,
.toggle-btn {
  border: none;
  cursor: pointer;
  width: 100%;
  background: transparent;
}

:global(.dark) .app-sidebar {
  background: var(--el-bg-color);
}
</style>
