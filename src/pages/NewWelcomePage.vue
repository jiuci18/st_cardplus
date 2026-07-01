<template>
  <div class="new-welcome-page">
    <header class="welcome-toolbar">
      <div class="brand">
        <img src="/image/logo.png" alt="ST CardPlus" />
        <span>ST CardPlus</span>
      </div>
      <el-button
        type="primary"
        plain
        data-testid="open-barkeep-connection"
        @click="barkeepDrawerVisible = true"
      >
        <Icon icon="material-symbols:hub-outline" />
        连接 Barkeep
      </el-button>
    </header>

    <BarkeepConnectionDrawer v-model="barkeepDrawerVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import BarkeepConnectionDrawer from "@/components/home/BarkeepConnectionDrawer.vue";

const barkeepDrawerVisible = ref(false);
</script>

<style scoped>
.new-welcome-page {
  min-height: 100%;
  padding: 20px clamp(16px, 4vw, 48px);
}

.welcome-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 700;
}

.brand img {
  width: 36px;
  height: 36px;
  border-radius: 9px;
}

.welcome-toolbar :deep(.el-button span) {
  gap: 6px;
}

@media (max-width: 480px) {
  .new-welcome-page {
    padding: 14px;
  }

  .brand span {
    display: none;
  }
}
</style>
