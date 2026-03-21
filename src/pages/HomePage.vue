<template>
  <div class="welcome-container">
    <img
      src="/image/logo.png"
      alt="ST CardPlus"
      class="logo"
    />
    <h1 class="title">欢迎使用 ST CardPlus</h1>
    <p class="subtitle">你今天要创造些什么？</p>
    <p class="hint">请从导航栏选择要编辑的内容 · 或者随便试试？</p>

    <div class="did-you-know-card">
      <div class="did-you-know-head">
        <div class="did-you-know-title">
          你知道吗
          <el-icon class="did-you-know-title-icon"><QuestionFilled /></el-icon>
        </div>
        <el-button
          size="small"
          text
          class="did-you-know-next-btn"
          aria-label="下一条提示"
          title="下一条提示"
          @click="pickRandomTip"
        >
          下一个
        </el-button>
      </div>
      <p class="did-you-know-text">{{ randomTip }}</p>
    </div>

    <div
      v-if="updateAvailable"
      class="update-notice"
      role="status"
      aria-live="polite"
    >
      {{ updateBannerText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { QuestionFilled } from '@element-plus/icons-vue';
import { onActivated, onMounted, ref } from 'vue';
import { useAppUpdate } from '@/composables/useAppUpdate';

const defaultDidYouKnowTips = ['提示加载失败，请点击“下一个”重试。'];
const didYouKnowUrl = '/did-you-know.json';
const didYouKnowTips = ref<string[]>([...defaultDidYouKnowTips]);
const randomTip = ref('');
const { updateAvailable, updateBannerText } = useAppUpdate();

const normalizeTips = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (input && typeof input === 'object' && 'tips' in input && Array.isArray((input as { tips: unknown[] }).tips)) {
    return (input as { tips: unknown[] }).tips.map((item) => String(item).trim()).filter(Boolean);
  }
  return [];
};

const loadRemoteTips = async () => {
  if (!didYouKnowUrl) return;
  try {
    const response = await fetch(didYouKnowUrl, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
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
    randomTip.value = '';
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
  pickRandomTip();
  await loadRemoteTips();
  pickRandomTip();
});

onActivated(() => {
  pickRandomTip();
});
</script>

<style scoped>
.welcome-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 16vh;
}

.logo {
  width: 7.5rem;
  border-radius: 1rem;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--el-text-color-primary);
}

.subtitle {
  font-size: 1.125rem;
  line-height: 1.75rem;
  color: var(--el-text-color-secondary);
}

.hint {
  font-size: 1rem;
  line-height: 1.5rem;
  margin-top: 1rem;
  color: var(--el-text-color-regular);
}

.did-you-know-card {
  margin-top: 1.75rem;
  width: min(90vw, 40rem);
  padding: 0.9rem 1rem;
  border-radius: 0.8rem;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-light);
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
  margin-bottom: 0.4rem;
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
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.45;
}

@media (min-width: 1024px) {
  .update-notice {
    right: 1.25rem;
    bottom: 1.25rem;
  }
}
</style>
