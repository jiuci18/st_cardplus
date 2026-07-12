<template>
  <header class="welcome-toolbar">
    <div class="brand">
      <img src="/image/logo.png" alt="ST CardPlus" />
      <span>ST CardPlus</span>
    </div>
    <div class="toolbar-actions">
      <el-button :type="connected ? 'success' : 'primary'" plain data-testid="open-barkeep-connection"
        @click="$emit('open-connection')">
        <template v-if="connected"><span class="status-dot-mini"></span>Barkeep 已连接</template>
        <template v-else>
          <Icon icon="material-symbols:hub-outline" />连接 Barkeep
        </template>
      </el-button>
      <el-button v-if="connected" type="danger" plain data-testid="logout-barkeep" @click="$emit('logout')">
        <Icon icon="material-symbols:logout-rounded" />断开连接
      </el-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";

defineProps<{ connected: boolean }>();
defineEmits<{ "open-connection": []; logout: [] }>();
</script>

<style scoped>
.welcome-toolbar {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.brand,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand {
  font-size: 1.2rem;
  font-weight: 700;
}

.brand img {
  width: 40px;
  height: 40px;
  border-radius: 10px;
}

.status-dot-mini {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--el-color-success);
  box-shadow: 0 0 0 3px var(--el-color-success-light-7);
}

@media (max-width: 680px) {
  .brand span {
    display: none;
  }

  .toolbar-actions {
    gap: 8px;
  }
}
</style>
