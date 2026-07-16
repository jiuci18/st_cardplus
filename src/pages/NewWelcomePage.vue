<template>
  <div class="new-welcome-page">
    <WelcomeToolbar :connected="Boolean(status)" @open-connection="barkeepDrawerVisible = true" @logout="logout" />

    <main class="resource-workspace" aria-label="资源同步工作区">
      <WelcomeResourceSidebar
        title="本地资源"
        header-icon="material-symbols:computer-outline"
        :tree-data="localResourceTree"
        :tree-props="resourceTreeProps"
        :expanded-keys="localResourceExpandedKeys"
        @node-click="handleLocalResourceNodeClick"
      />
      <WelcomeSyncWorkspace />
      <WelcomeResourceSidebar
        title="远端资源"
        header-icon="material-symbols:cloud-outline"
        :tree-data="remoteResourceTree"
        :tree-props="resourceTreeProps"
        :expanded-keys="remoteResourceExpandedKeys"
        :hint="status ? undefined : '连接 Barkeep 后查看远端资源。'"
        @node-click="handleRemoteResourceNodeClick"
      />
    </main>

    <WelcomeOverlay
      :visible="welcomeOverlayVisible"
      :status="status"
      :mode="mode"
      :base-url="baseUrl"
      :stats="localStats"
      :random-tip="randomTip"
      @begin-sync="welcomeOverlayVisible = false"
      @open-connection="barkeepDrawerVisible = true"
      @next-tip="pickRandomTip"
      @navigate="router.push"
    />

    <div
      v-if="updateAvailable"
      class="update-notice"
      role="status"
      aria-live="polite"
      tabindex="0"
      @click="goToSettings"
      @keydown.enter.prevent="goToSettings"
      @keydown.space.prevent="goToSettings"
    >
      <p class="update-notice-title">{{ updateBannerText }}</p>
      <p v-if="updateNoteText" class="update-notice-note">{{ updateNoteText }}</p>
    </div>

    <BarkeepConnectionDrawer v-model="barkeepDrawerVisible" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BarkeepConnectionDrawer from "@/components/home/BarkeepConnectionDrawer.vue";
import WelcomeOverlay from "@/components/home/WelcomeOverlay.vue";
import WelcomeResourceSidebar from "@/components/home/WelcomeResourceSidebar.vue";
import WelcomeSyncWorkspace from "@/components/home/WelcomeSyncWorkspace.vue";
import WelcomeToolbar from "@/components/home/WelcomeToolbar.vue";
import { useAppUpdate } from "@/composables/useAppUpdate";
import { useBarkeepConnection } from "@/composables/useBarkeepConnection";
import { useWelcomeResources } from "@/composables/wellcome/useWelcomeResources";
import { useWelcomeTips } from "@/composables/wellcome/useWelcomeTips";

const barkeepDrawerVisible = ref(false);
const welcomeOverlayVisible = ref(true);
const router = useRouter();
const connection = useBarkeepConnection();
const { status, mode, baseUrl, canPing, multiUser, password } = connection.state;
const { initialize, ping, login, logout } = connection.actions;
const { updateAvailable, updateBannerText, updateNoteText } = useAppUpdate();
const {
  localStats,
  localResourceTree,
  remoteResourceTree,
  resourceTreeProps,
  localResourceExpandedKeys,
  remoteResourceExpandedKeys,
  loadLocalStats,
  handleLocalResourceNodeClick,
  handleRemoteResourceNodeClick,
} = useWelcomeResources(status, (route) => {
  void router.push(route);
});
const { randomTip, loadRemoteTips, pickRandomTip } = useWelcomeTips();

const goToSettings = (): void => {
  void router.push("/settings");
};

onMounted(async () => {
  initialize();
  await loadLocalStats();

  if (canPing.value) {
    await ping(true).catch(() => undefined);
  } else if (baseUrl.value && (!multiUser.value || password.value)) {
    await login(true).catch(() => undefined);
  }

  pickRandomTip();
  await loadRemoteTips();
  pickRandomTip();
});
</script>

<style scoped>
.new-welcome-page {
  position: relative;
  min-height: 100%;
  padding: 24px clamp(16px, 3vw, 48px);
  box-sizing: border-box;
  color: var(--el-text-color-primary);
}

.resource-workspace {
  display: grid;
  grid-template-columns: minmax(220px, .85fr) minmax(360px, 1.45fr) minmax(220px, .85fr);
  gap: 24px;
  height: calc(100vh - 128px);
  min-height: 0;
  padding: 30px 0 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.update-notice {
  position: fixed;
  right: 1rem;
  bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  z-index: 4;
  max-width: min(90vw, 22rem);
  padding: .75rem 1rem;
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: .85rem;
  background: var(--el-color-warning-light-9);
  box-shadow: 0 12px 24px rgb(0 0 0 / 12%);
  color: var(--el-color-warning-dark-2);
  cursor: pointer;
}

.update-notice-title,
.update-notice-note {
  margin: 0;
}

.update-notice-title {
  font-size: .9rem;
  font-weight: 600;
}

.update-notice-note {
  margin-top: .35rem;
  color: var(--el-text-color-regular);
  font-size: .82rem;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1023px) {
  .resource-workspace {
    grid-template-columns: minmax(180px, .8fr) minmax(300px, 1.2fr);
  }

  .resource-workspace > :last-child {
    grid-column: 1 / -1;
    height: 260px;
  }
}

@media (max-width: 680px) {
  .new-welcome-page {
    padding: 16px;
  }

  .resource-workspace {
    grid-template-columns: 1fr;
    gap: 16px;
    height: auto;
    padding-top: 20px;
    overflow: visible;
  }

  .resource-workspace > :first-child,
  .resource-workspace > :last-child {
    height: min(520px, calc(100vh - 120px));
  }

  .resource-workspace > :last-child {
    grid-column: auto;
  }
}
</style>
