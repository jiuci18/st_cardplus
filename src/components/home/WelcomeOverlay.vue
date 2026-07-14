<template>
  <transition name="welcome-overlay">
    <section v-if="visible" class="welcome-overlay" aria-label="欢迎面板">
      <div v-if="status" class="welcome-overlay-card dashboard-section">
        <div class="welcome-header">
          <h1>欢迎回来，<span class="user-name">{{ status.user }}</span></h1>
          <p class="connection-info">已连接到 Barkeep（{{ mode === "sillytavern" ? "SillyTavern 内嵌" : "独立 HTTP" }} · {{ baseUrl }}）</p>
        </div>
        <div class="stats-grid">
          <button v-for="card in statCards" :key="card.label" class="stat-card" type="button" @click="$emit('navigate', card.route)">
            <div class="stat-icon" :class="card.colorClass"><Icon :icon="card.icon" /></div>
            <div class="stat-info"><span class="stat-number">{{ card.count }}</span><span class="stat-label">{{ card.label }}</span></div>
          </button>
        </div>
        <div class="welcome-actions"><el-button type="primary" size="large" @click="$emit('begin-sync')"><Icon icon="material-symbols:sync" />开始同步</el-button></div>
      </div>
      <div v-else class="welcome-overlay-card welcome-section">
        <img src="/image/logo.png" alt="ST CardPlus" class="logo" />
        <h1 class="title">欢迎使用 ST CardPlus</h1>
        <p class="subtitle">你今天要创造些什么？</p>
        <p class="hint">请先连接 Barkeep，再进入资源同步工作区。</p>
        <div class="welcome-actions"><el-button type="primary" size="large" @click="$emit('open-connection')"><Icon icon="material-symbols:hub-outline" />立即连接 Barkeep</el-button></div>
        <div class="did-you-know-card">
          <div class="did-you-know-head"><div class="did-you-know-title">你知道吗 <el-icon><QuestionFilled /></el-icon></div><el-button size="small" text class="did-you-know-next-btn" @click="$emit('next-tip')">下一个</el-button></div>
          <p class="did-you-know-text">{{ randomTip }}</p>
        </div>
      </div>
    </section>
  </transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import { QuestionFilled } from "@element-plus/icons-vue";
import type { LocalWelcomeStats } from "@/composables/wellcome/useWelcomeResources";
import type { BarkeepConnectionMode, BarkeepStatus } from "@/types/barkeep";

const props = defineProps<{
  visible: boolean;
  status: BarkeepStatus | null;
  mode: BarkeepConnectionMode;
  baseUrl: string;
  stats: LocalWelcomeStats;
  randomTip: string;
}>();
defineEmits<{
  "begin-sync": [];
  "open-connection": [];
  "next-tip": [];
  navigate: [route: string];
}>();

const statCards = computed(() => [
  { label: "角色卡", count: props.stats.characters, route: "/cardmanager", icon: "material-symbols:person-outline", colorClass: "char-icon" },
  { label: "世界书", count: props.stats.worlds, route: "/worldbook", icon: "material-symbols:book-outline", colorClass: "world-icon" },
  { label: "预设", count: props.stats.presets, route: "/presetmanager", icon: "material-symbols:settings-input-component-outline", colorClass: "preset-icon" },
  { label: "地标", count: props.stats.landmarks, route: "/world", icon: "material-symbols:map-outline", colorClass: "tools-icon" },
]);
</script>

<style scoped>
.welcome-overlay { position: absolute; z-index: 2; inset: 85px 0 0; display: flex; align-items: center; justify-content: center; padding: 30px clamp(16px, 6vw, 96px); background: color-mix(in srgb, var(--el-bg-color-page) 68%, transparent); backdrop-filter: blur(5px); box-sizing: border-box; }
.welcome-overlay-card { width: min(100%, 900px); padding: clamp(24px, 5vw, 48px); box-sizing: border-box; }
.welcome-header { margin-bottom: 28px; text-align: center; }
.welcome-header h1, .title { margin: 0 0 8px; font-size: clamp(1.65rem, 3vw, 2.2rem); font-weight: 800; }
.user-name { color: var(--el-color-primary); }
.connection-info, .subtitle { margin: 0; color: var(--el-text-color-secondary); }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.stat-card { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 16px; border: 1px solid var(--el-border-color-light); border-radius: 14px; background: color-mix(in srgb, var(--el-bg-color-overlay) 88%, transparent); color: inherit; font: inherit; text-align: left; cursor: pointer; transition: transform 150ms ease, border-color 150ms ease; }
.stat-card:hover { transform: translateY(-2px); border-color: var(--el-color-primary-light-5); }
.stat-icon { display: grid; flex: 0 0 42px; width: 42px; height: 42px; place-items: center; border-radius: 10px; font-size: 21px; }
.char-icon { color: var(--el-color-primary); background: color-mix(in srgb, var(--el-color-primary) 12%, transparent); }
.world-icon { color: var(--el-color-success); background: color-mix(in srgb, var(--el-color-success) 12%, transparent); }
.preset-icon { color: var(--el-color-warning); background: color-mix(in srgb, var(--el-color-warning) 12%, transparent); }
.tools-icon { color: var(--el-color-danger); background: color-mix(in srgb, var(--el-color-danger) 12%, transparent); }
.stat-info { display: flex; flex-direction: column; min-width: 0; }
.stat-number { font-size: 1.5rem; font-weight: 800; line-height: 1.15; }
.stat-label { color: var(--el-text-color-secondary); font-size: .82rem; white-space: nowrap; }
.welcome-actions { display: flex; justify-content: center; margin-top: 28px; }
.welcome-actions .iconify { margin-right: 6px; }
.welcome-section { display: flex; flex-direction: column; align-items: center; text-align: center; }
.logo { width: 88px; height: 88px; margin-bottom: 22px; border-radius: 20px; }
.hint { max-width: 420px; margin: 12px 0 0; color: var(--el-text-color-regular); line-height: 1.6; }
.did-you-know-card { width: min(100%, 540px); margin-top: 28px; padding: 14px 16px; border: 1px solid var(--el-border-color-light); border-radius: 12px; background: var(--el-fill-color-extra-light); text-align: left; box-sizing: border-box; }
.did-you-know-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.did-you-know-title { display: inline-flex; align-items: center; gap: 5px; color: var(--el-color-warning-dark-2); font-size: .9rem; font-weight: 700; }
.did-you-know-text { margin: 8px 0 0; color: var(--el-text-color-secondary); font-size: .88rem; line-height: 1.5; }
.did-you-know-next-btn { color: var(--el-text-color-secondary); }
.welcome-overlay-enter-active, .welcome-overlay-leave-active { transition: opacity 220ms ease; }
.welcome-overlay-enter-from, .welcome-overlay-leave-to { opacity: 0; }
@media (max-width: 1023px) { .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { .welcome-overlay { inset: 73px 0 0; align-items: flex-start; padding: 24px 16px; overflow: auto; } .welcome-overlay-card { padding: 24px 18px; } .stats-grid { grid-template-columns: 1fr; } .stat-card { padding: 12px; } .welcome-actions { margin-top: 20px; } }
</style>

