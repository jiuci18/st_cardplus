<template>
  <div class="setting-card">
    <div class="setting-content">
      <div class="setting-header">
        <div class="setting-info">
          <span class="setting-label">存储空间使用情况</span>
          <Icon icon="material-symbols:database-outline" width="20" height="20"
            style="margin-left: 8px; color: var(--el-color-primary)" />
        </div>
        <el-button class="storage-refresh" text @click="handleRefresh" :disabled="isRefreshing">
          <Icon icon="material-symbols:refresh" width="18" height="18" :class="{ 'spin-refresh': isRefreshing }" />
        </el-button>
      </div>
      <div class="storage-info">
        <div class="storage-bar">
          <span>IndexedDB</span>
          <el-progress :percentage="indexedDBUsage.percentage" :text-inside="true" :stroke-width="20"
            :status="getProgressStatus(indexedDBUsage.percentage)">
            <span>{{ indexedDBUsage.text }}</span>
          </el-progress>
          <div class="storage-details" v-if="worldBookStats && characterCardStats && worldEditorStats">
            <span>
              世界书：{{ worldBookStats.bookCount }} 本，{{ worldBookStats.entryCount }} 条目，约
              {{ formatBytes(worldBookStats.approxBytes) }}
            </span>
            <span>
              角色卡：{{ characterCardStats.cardCount }} 张，约 {{ formatBytes(characterCardStats.approxBytes) }}
            </span>
            <span>
              世界编辑器：{{ worldEditorStats.projectCount }} 个项目，{{ worldEditorStats.landmarkCount }} 个地标，约
              {{ formatBytes(worldEditorStats.approxBytes) }}
            </span>
          </div>
        </div>
        <div class="storage-bar">
          <span>浏览器缓存 (localStorage)</span>
          <el-progress :percentage="localStorageUsage.percentage" :text-inside="true" :stroke-width="20"
            :status="getProgressStatus(localStorageUsage.percentage)">
            <span>{{ localStorageUsage.text }}</span>
          </el-progress>
        </div>
      </div>
      <p class="setting-description" style="margin-top: 12px">
        存储大小由浏览器自动管理
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStorageInfo } from '@/composables/dataManagement/useStorageInfo';
import { Icon } from '@iconify/vue';
import { onMounted, ref } from 'vue';

const {
  indexedDBUsage,
  localStorageUsage,
  worldBookStats,
  characterCardStats,
  worldEditorStats,
  formatBytes,
  getProgressStatus,
  updateStorageInfo,
} = useStorageInfo();

const isRefreshing = ref(false);
const handleRefresh = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  await updateStorageInfo();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 600);
};

onMounted(updateStorageInfo);
</script>

<style scoped>
.storage-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 12px;
}

.storage-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.storage-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.storage-bar span {
  font-size: 14px;
  color: var(--el-text-color-regular);
  text-align: left;
}

.storage-refresh {
  padding: 4px;
  color: var(--el-text-color-secondary);
}

.spin-refresh {
  animation: storage-refresh-spin 0.6s linear;
}

@keyframes storage-refresh-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
