<template>
  <div class="app-layout">
    <template v-if="!isMobile">
      <AppSidebar />

      <main
        class="desktop-main"
        :class="{ 'overflow-hidden': isOverflowHidden }"
      >
        <RouterView v-slot="{ Component, route: currentRoute }">
          <transition
            name="fade"
            mode="out-in"
          >
            <component
              :is="Component"
              :key="currentRoute.path"
            />
          </transition>
        </RouterView>
      </main>
    </template>

    <template v-else>
      <MobileDrawer v-model="drawerVisible" />

      <main class="mobile-main">
        <RouterView v-slot="{ Component, route: currentRoute }">
          <transition
            name="fade"
            mode="out-in"
          >
            <component
              :is="Component"
              :key="currentRoute.path"
            />
          </transition>
        </RouterView>
      </main>

      <MobileTabBar @toggle-drawer="drawerVisible = true" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';

import AppSidebar from '@/components/layout/AppSidebar.vue';
import MobileDrawer from '@/components/layout/MobileDrawer.vue';
import MobileTabBar from '@/components/layout/MobileTabBar.vue';
import { useAppUpdate } from '@/composables/useAppUpdate';
import { provideNavigation } from '@/composables/useNavigation';
import { provideOverflowControl } from '@/composables/useOverflowControl';
import { usePersonalization } from '@/composables/usePersonalization';
import { syncUmamiTelemetry } from '@/composables/useUmamiTelemetry';

import { getSetting } from '@/utils/localStorageUtils';

const { isOverflowHidden, setOverflowHidden } = provideOverflowControl();
const route = useRoute();
const { sidebarConfig, refreshSidebarConfig } = usePersonalization();
const { checkForAppUpdate } = useAppUpdate();
const betaFeaturesEnabled = ref(false);
const umamiEnabled = ref(true);
const drawerVisible = ref(false);


const mainMenuItems = computed(() => {
  return sidebarConfig.value.items
    .filter((item) => {
      if (!item.visible) return false;
      if (item.beta && !betaFeaturesEnabled.value) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);
});
const { isMobile } = provideNavigation(mainMenuItems);

watch(
  [() => route.path, isMobile],
  ([newPath, mobile]) => {
    if (mobile) {
      setOverflowHidden(false);
      return;
    }
    const overflowHiddenRoutes = ['/worldbook', '/ejs-editor', '/world', '/regex-editor'];
    if (overflowHiddenRoutes.includes(newPath)) {
      setOverflowHidden(true);
    } else {
      setOverflowHidden(false);
    }
  },
  { immediate: true }
);

const handleBetaFeaturesToggle = (event: Event) => {
  betaFeaturesEnabled.value = (event as CustomEvent<boolean>).detail;
};

const handleSidebarConfigChange = () => {
  refreshSidebarConfig();
};

const handleUmamiToggle = (event: Event) => {
  umamiEnabled.value = (event as CustomEvent<boolean>).detail;
  void syncUmamiTelemetry(umamiEnabled.value).catch((error) => {
    console.error('切换 Umami 遥测失败:', error);
  });
};

onMounted(() => {
  betaFeaturesEnabled.value = getSetting('betaFeaturesEnabled');
  umamiEnabled.value = getSetting('umamiEnabled');
  refreshSidebarConfig();
  void checkForAppUpdate();
  void syncUmamiTelemetry(umamiEnabled.value).catch((error) => {
    console.error('初始化 Umami 遥测失败:', error);
  });
  window.addEventListener('betaFeaturesToggle', handleBetaFeaturesToggle);
  window.addEventListener('umamiToggle', handleUmamiToggle);
  window.addEventListener('sidebarConfigChange', handleSidebarConfigChange as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('betaFeaturesToggle', handleBetaFeaturesToggle);
  window.removeEventListener('umamiToggle', handleUmamiToggle);
  window.removeEventListener('sidebarConfigChange', handleSidebarConfigChange as EventListener);
});
</script>

<style scoped>
.app-layout {
  height: 100vh;
  display: flex;
  background: var(--el-bg-color-page);
}

.desktop-main {
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  min-height: 0;
  min-width: 0;
  width: 0;
}

.desktop-main.overflow-hidden {
  overflow: hidden;
}

@media (max-width: 1023px) {
  .app-layout {
    flex-direction: column;
  }
}

.mobile-main {
  flex: 1 1 0%;
  overflow: auto;
  padding-bottom: calc(48px + env(safe-area-inset-bottom, 0)); /* 48px = 混合式 TabBar 高度 */
}
</style>

<style>
.fade-enter-active,
.fade-leave-active {
  transition-property: opacity;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
