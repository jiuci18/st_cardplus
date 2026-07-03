<template>
  <div class="new-welcome-page">
    <header class="welcome-toolbar">
      <div class="brand">
        <img src="/image/logo.png" alt="ST CardPlus" />
        <span>ST CardPlus</span>
      </div>
      <div class="toolbar-actions">
        <el-button
          :type="status ? 'success' : 'primary'"
          plain
          data-testid="open-barkeep-connection"
          @click="barkeepDrawerVisible = true"
        >
          <template v-if="status">
            <div class="status-dot-mini"></div>
            Barkeep 已连接
          </template>
          <template v-else>
            <Icon icon="material-symbols:hub-outline" />
            连接 Barkeep
          </template>
        </el-button>
        <el-button
          v-if="status"
          type="danger"
          plain
          data-testid="logout-barkeep"
          @click="logout"
        >
          <Icon icon="material-symbols:logout-rounded" />
          断开连接
        </el-button>
      </div>
    </header>

    <main class="welcome-content">
      <!-- Connected State Dashboard -->
      <div v-if="status" class="dashboard-section">
        <div class="welcome-header">
          <h2>欢迎回来，<span class="user-name">{{ status.user }}</span></h2>
          <p class="connection-info">
            已成功连接到 Barkeep 服务 ({{ mode === 'sillytavern' ? 'SillyTavern 内嵌' : '独立 HTTP' }} · {{ baseUrl }})
          </p>
        </div>

        <div class="stats-grid">
          <div class="stat-card" @click="router.push('/cardmanager')">
            <div class="stat-icon char-icon">
              <Icon icon="material-symbols:person-outline" />
            </div>
            <div class="stat-info">
              <span class="stat-number">{{ status.counts.characters }}</span>
              <span class="stat-label">角色卡</span>
            </div>
          </div>

          <div class="stat-card" @click="router.push('/worldbook')">
            <div class="stat-icon world-icon">
              <Icon icon="material-symbols:book-outline" />
            </div>
            <div class="stat-info">
              <span class="stat-number">{{ status.counts.worlds }}</span>
              <span class="stat-label">世界书</span>
            </div>
          </div>

          <div class="stat-card" @click="router.push('/presetmanager')">
            <div class="stat-icon preset-icon">
              <Icon icon="material-symbols:settings-input-component-outline" />
            </div>
            <div class="stat-info">
              <span class="stat-number">{{ status.counts.presets }}</span>
              <span class="stat-label">预设</span>
            </div>
          </div>

          <div class="stat-card" @click="router.push('/toolbox')">
            <div class="stat-icon tools-icon">
              <Icon icon="material-symbols:build-outline" />
            </div>
            <div class="stat-info">
              <span class="stat-number">{{ status.counts.chats || 0 }}</span>
              <span class="stat-label">聊天记录</span>
            </div>
          </div>
        </div>

        <div class="quick-actions-section">
          <h3>快捷入口</h3>
          <div class="actions-grid">
            <el-button type="primary" @click="router.push('/cardmanager')">
              <Icon icon="material-symbols:add-circle-outline" />
              管理角色卡
            </el-button>
            <el-button @click="router.push('/world')">
              <Icon icon="material-symbols:map-outline" />
              世界地标编辑器
            </el-button>
            <el-button @click="router.push('/worldbook')">
              <Icon icon="material-symbols:library-books-outline" />
              管理世界书
            </el-button>
            <el-button @click="router.push('/toolbox')">
              <Icon icon="material-symbols:construction" />
              打开工具箱
            </el-button>
          </div>
        </div>
      </div>

      <!-- Disconnected State: Welcome Message & Guide -->
      <div v-else class="welcome-section">
        <div class="welcome-container">
          <img src="/image/logo.png" alt="ST CardPlus" class="logo" />
          <h1 class="title">欢迎使用 ST CardPlus</h1>
          <p class="subtitle">你今天要创造些什么？</p>
          <p class="hint">请先在右上方连接到你的 Barkeep 账户，同步你的角色卡和世界书等资产。</p>
          <p class="hint hint-secondary">如果你的内嵌模式启用了增强式安全（API_PASSWORD_FORCE），请在连接面板额外填写 Barkeep API 密码。</p>
          
          <div class="welcome-actions">
            <el-button type="primary" size="large" @click="barkeepDrawerVisible = true">
              <Icon icon="material-symbols:hub-outline" style="margin-right: 6px;" />
              立即连接 Barkeep
            </el-button>
          </div>
        </div>
      </div>

      <!-- Did You Know Tips Section (Shown when disconnected) -->
      <div v-if="!status" class="tips-section">
        <div class="did-you-know-card">
          <div class="did-you-know-head">
            <div class="did-you-know-title">
              你知道吗
              <el-icon class="did-you-know-title-icon">
                <QuestionFilled />
              </el-icon>
            </div>
            <el-button size="small" text class="did-you-know-next-btn" aria-label="下一条提示" title="下一条提示"
              @click="pickRandomTip">
              下一个
            </el-button>
          </div>
          <p class="did-you-know-text">{{ randomTip }}</p>
        </div>
      </div>
    </main>

    <!-- Floating Update Notice (Moved from HomePage) -->
    <div v-if="updateAvailable" class="update-notice" role="status" aria-live="polite" tabindex="0"
      @click="goToSettings" @keydown.enter.prevent="goToSettings" @keydown.space.prevent="goToSettings">
      <p class="update-notice-title">{{ updateBannerText }}</p>
      <p v-if="updateNoteText" class="update-notice-note">
        {{ updateNoteText }}
      </p>
    </div>

    <BarkeepConnectionDrawer v-model="barkeepDrawerVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { QuestionFilled } from "@element-plus/icons-vue";
import BarkeepConnectionDrawer from "@/components/home/BarkeepConnectionDrawer.vue";
import { useBarkeepConnection } from "@/composables/useBarkeepConnection";
import { useAppUpdate } from "@/composables/useAppUpdate";
import { fetchJsonResource } from "@/utils/fetchResource";

const barkeepDrawerVisible = ref(false);
const router = useRouter();

const connection = useBarkeepConnection();
const { status, mode, baseUrl, canPing, multiUser, password } = connection.state;
const { initialize, ping, login, logout } = connection.actions;

const { updateAvailable, updateBannerText, updateNoteText } = useAppUpdate();

const goToSettings = () => {
  router.push("/settings");
};

// "Did You Know" Tips
const defaultDidYouKnowTips = ["提示加载失败，请点击“下一个”重试。"];
const didYouKnowUrl = "/did-you-know.json";
const didYouKnowTips = ref<string[]>([...defaultDidYouKnowTips]);
const randomTip = ref("");

const normalizeTips = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (
    input &&
    typeof input === "object" &&
    "tips" in input &&
    Array.isArray((input as { tips: unknown[] }).tips)
  ) {
    return (input as { tips: unknown[] }).tips
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  return [];
};

const loadRemoteTips = async () => {
  if (!didYouKnowUrl) return;
  try {
    const { data } = await fetchJsonResource(didYouKnowUrl, {
      cache: "no-store",
    });
    const remoteTips = normalizeTips(data);
    if (remoteTips.length > 0) {
      didYouKnowTips.value = remoteTips;
    }
  } catch {
    didYouKnowTips.value = [...defaultDidYouKnowTips];
  }
};

const pickRandomTip = () => {
  if (didYouKnowTips.value.length === 0) {
    randomTip.value = "";
    return;
  }

  if (didYouKnowTips.value.length === 1) {
    randomTip.value = didYouKnowTips.value[0];
    return;
  }

  let index = Math.floor(Math.random() * didYouKnowTips.value.length);
  while (didYouKnowTips.value[index] === randomTip.value) {
    index = Math.floor(Math.random() * didYouKnowTips.value.length);
  }
  randomTip.value = didYouKnowTips.value[index];
};

onMounted(async () => {
  initialize();

  // Auto connect in the background on load/refresh
  if (canPing.value) {
    try {
      await ping(true); // silent ping
    } catch {
      // ignore
    }
  } else if (baseUrl.value) {
    // If no active session, but we have saved settings, try to silent auto-login
    const canAutoLogin = !multiUser.value || (multiUser.value && password.value);
    if (canAutoLogin) {
      try {
        await login(true); // silent login
      } catch {
        // ignore
      }
    }
  }

  pickRandomTip();
  await loadRemoteTips();
  pickRandomTip();
});
</script>

<style scoped>
.new-welcome-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px clamp(16px, 5vw, 48px);
  background: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
  box-sizing: border-box;
}

.welcome-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.2rem;
  font-weight: 700;
}

.brand img {
  width: 40px;
  height: 40px;
  border-radius: 10px;
}

.status-dot-mini {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-success);
  margin-right: 6px;
  display: inline-block;
  box-shadow: 0 0 0 3px var(--el-color-success-light-7);
}

.welcome-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 0;
  box-sizing: border-box;
}

/* Disconnected welcome state */
.welcome-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeIn 0.4s ease-out;
}

.welcome-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
}

.logo {
  width: 120px;
  height: 120px;
  border-radius: 24px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 8px 0;
  background: linear-gradient(120deg, var(--el-color-primary), var(--el-color-primary-light-3));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 1.25rem;
  color: var(--el-text-color-secondary);
  margin: 0 0 16px 0;
}

.hint {
  font-size: 1rem;
  color: var(--el-text-color-regular);
  max-width: 500px;
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.hint-secondary {
  margin-top: -16px;
  font-size: 0.92rem;
  color: var(--el-text-color-secondary);
}

.welcome-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

/* Connected Dashboard State */
.dashboard-section {
  width: 100%;
  animation: fadeIn 0.4s ease-out;
}

.welcome-header {
  margin-bottom: 32px;
  text-align: center;
}

.welcome-header h2 {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0 0 8px 0;
}

.user-name {
  color: var(--el-color-primary);
}

.connection-info {
  font-size: 0.95rem;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
  width: 100%;
}

.stat-card {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.char-icon {
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  color: var(--el-color-primary);
}

.world-icon {
  background: color-mix(in srgb, var(--el-color-success) 10%, transparent);
  color: var(--el-color-success);
}

.preset-icon {
  background: color-mix(in srgb, var(--el-color-warning) 10%, transparent);
  color: var(--el-color-warning);
}

.tools-icon {
  background: color-mix(in srgb, var(--el-color-danger) 10%, transparent);
  color: var(--el-color-danger);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.quick-actions-section {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  box-sizing: border-box;
}

.quick-actions-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.1rem;
  font-weight: 700;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.actions-grid .el-button {
  height: 48px;
  font-size: 0.95rem;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
}

/* Did You Know section */
.tips-section {
  margin-top: 32px;
  width: 100%;
  max-width: 550px;
}

.did-you-know-card {
  width: 100%;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-light);
  box-sizing: border-box;
}

.did-you-know-title {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--el-color-warning-dark-2);
}

.did-you-know-title-icon {
  font-size: 0.95rem;
}

.did-you-know-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.did-you-know-text {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.did-you-know-next-btn {
  color: var(--el-text-color-secondary);
}

/* Floating Update Notice */
.update-notice {
  position: fixed;
  right: 1rem;
  bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  z-index: 40;
  max-width: min(90vw, 22rem);
  padding: 0.75rem 1rem;
  border-radius: 0.85rem;
  border: 1px solid var(--el-color-warning-light-5);
  background: color-mix(in srgb, var(--el-color-warning-light-9) 90%, white 10%);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.12),
    0 4px 10px rgba(0, 0, 0, 0.08);
  color: var(--el-color-warning-dark-2);
  line-height: 1.45;
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease,
    border-color 150ms ease;
}

.update-notice:hover,
.update-notice:focus-visible {
  transform: translateY(-2px);
  border-color: var(--el-color-warning);
  box-shadow:
    0 16px 28px rgba(0, 0, 0, 0.16),
    0 6px 12px rgba(0, 0, 0, 0.1);
  outline: none;
}

.update-notice-title,
.update-notice-note {
  margin: 0;
}

.update-notice-note {
  white-space: pre-wrap;
}

.update-notice-title {
  font-size: 0.9rem;
  font-weight: 600;
}

.update-notice-note {
  margin-top: 0.35rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--el-text-color-regular);
  word-break: break-word;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (min-width: 1024px) {
  .update-notice {
    right: 1.25rem;
    bottom: 1.25rem;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .new-welcome-page {
    padding: 16px;
  }

  .brand span {
    display: none;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
