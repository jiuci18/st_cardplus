<template>
  <div class="settings-page">
    <!-- Tabs -->
    <el-tabs
      v-model="activeTab"
      class="settings-tabs"
    >
      <el-tab-pane
        label="应用设置"
        name="settings"
      >
        <div class="tab-content">
          <AppSettings />
        </div>
      </el-tab-pane>
      <el-tab-pane
        label="迁移与同步"
        name="data"
      >
        <div class="tab-content">
          <DataManagement />
        </div>
      </el-tab-pane>
      <el-tab-pane
        label="个性化"
        name="personalization"
      >
        <div class="tab-content">
          <PersonalizationSettings />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import AppSettings from '@/components/settingPage/AppSettings.vue';
import DataManagement from '@/components/settingPage/DataManagement.vue';
import PersonalizationSettings from '@/components/settingPage/PersonalizationSettings.vue';
import { ref } from 'vue';

const activeTab = ref('settings');
</script>

<style scoped>
.settings-page {
  width: 100%;
  min-height: 100%;
  padding: 1.25rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

/* Tabs 样式 */
.settings-tabs {
  margin-top: 0;
}

:deep(.el-tabs__header) {
  margin-bottom: 1.25rem;
  padding-bottom: 0;
  border-bottom: 2px solid var(--el-border-color-lighter);
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__item) {
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: 500;
  padding: 0.75rem 1.25rem;
  color: var(--el-text-color-secondary);
  transition: all 0.2s ease;
}

:deep(.el-tabs__item:hover) {
  color: var(--el-color-primary);
}

:deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
  font-weight: 600;
}

:deep(.el-tabs__active-bar) {
  height: 3px;
  border-radius: 9999px;
  background: linear-gradient(90deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
}

.tab-content {
  text-align: left;
}
</style>
