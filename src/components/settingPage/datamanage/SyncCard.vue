<template>
  <div class="setting-card">
    <div class="setting-content">
      <div class="setting-header">
        <div class="setting-info">
          <span class="setting-label">云同步</span>
          <Icon icon="material-symbols:cloud-sync-outline" width="20" height="20"
            style="margin-left: 8px; color: var(--el-color-primary)" />
        </div>
      </div>

      <!-- 同步提供商选择 -->
      <div class="sync-provider-selector">
        <span class="provider-label">同步提供商</span>
        <el-segmented v-model="selectedProvider" :options="providerOptions" size="default" />
      </div>

      <!-- WebDAV 配置 -->
      <div v-show="selectedProvider === 'webdav'" class="sync-config-container">
        <el-input v-model="webdavConfig.url" placeholder="WebDAV URL" />
        <el-input v-model="webdavConfig.username" placeholder="用户名" />
        <el-input v-model="webdavConfig.password" placeholder="密码" type="password" show-password />
        <p class="provider-description">
          将数据备份到你的 WebDAV 服务器
          <br />
          <span style="color: var(--el-color-warning)">请注意前端该死的跨域问题，尽量使用自建服务</span>
          <br />
          <br />
          <span v-if="!isDesktopApp">
            出现问题？试试安装桌面APP获取更好的兼容性
          </span>
        </p>
      </div>

      <!-- GitHub Gist 配置 -->
      <div v-show="selectedProvider === 'gist'" class="sync-config-container">
        <el-input v-model="gistConfig.token" placeholder="GitHub Personal Access Token" type="password" show-password>
          <template #append>
            <el-button @click="openGistTokenHelp">
              <Icon icon="material-symbols:help-outline" />
            </el-button>
          </template>
        </el-input>
        <el-input v-model="gistConfig.gistId" placeholder="Gist ID (可选，留空将创建新 Gist)">
          <template #append>
            <el-button @click="listGists" :disabled="!gistConfig.token">
              <Icon icon="material-symbols:list" />
            </el-button>
          </template>
        </el-input>
        <div class="sync-time-display" v-if="gistConfig.lastSyncTime">
          <Icon icon="material-symbols:schedule" style="margin-right: 4px" />
          <span>上次同步: {{ formatSyncTime(gistConfig.lastSyncTime) }}</span>
        </div>
        <p class="provider-description">
          将数据备份到 GitHub Gist (私密 Gist)
          <br />
          需要创建 Personal Access Token 并赋予
          <code>gist</code>
          权限
          <ExternalLink href="https://github.com/settings/tokens/new?scopes=gist&description=ST-CardPlus-Sync"
            style="color: var(--el-color-primary)">
            创建 Token
          </ExternalLink>
          <br />
          <span style="color: var(--el-color-info); font-size: 12px">
            💡 单文件最大 100MB, Gist 总计最大 1GB · 首次推送自动创建 Gist, 后续更新同一个 Gist
          </span>
        </p>
      </div>

      <!-- 统一操作按钮 -->
      <div class="sync-action-buttons">
        <el-button @click="handleTestConnection" :disabled="syncProgressActive">
          <Icon icon="material-symbols:add-link-rounded" style="margin-right: 8px" />
          {{ testButtonText }}
        </el-button>
        <el-button @click="handlePush" type="primary" plain :disabled="!canPush || syncProgressActive">
          <Icon icon="material-symbols:cloud-upload" style="margin-right: 8px" />
          {{ pushButtonText }}
        </el-button>
        <el-button @click="handlePull" type="success" plain :disabled="!canPull || syncProgressActive">
          <Icon icon="material-symbols:cloud-download-outline" style="margin-right: 8px" />
          {{ pullButtonText }}
        </el-button>
      </div>

      <transition name="sync-progress" appear>
        <div v-if="syncProgressActive" class="sync-progress">
          <div class="sync-progress-label">
            <Icon icon="material-symbols:hourglass-top" width="16" height="16" />
            <span>{{ syncProgressText || '处理中...' }}</span>
          </div>
          <el-progress :percentage="100" :indeterminate="true" :stroke-width="12" :show-text="false" />
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { syncInjectionKey } from '@/composables/dataManagement/useSync';
import ExternalLink from '@/components/ui/common/ExternalLink.vue';
import { Icon } from '@iconify/vue';
import { computed, inject } from 'vue';

const sync = inject(syncInjectionKey);
if (!sync) {
  throw new Error('Sync provider is missing');
}

const isDesktopApp = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const {
  state: {
    webdavConfig,
    gistConfig,
    selectedProvider,
    providerOptions,
    canPush,
    canPull,
    syncProgressActive,
    syncProgressText,
    syncCurrentAction,
  },
  actions: {
    testConnection: handleTestConnection,
    push: handlePush,
    pull: handlePull,
    openGistTokenHelp,
    listGists,
  },
  utils: { formatSyncTime },
} = sync;

const testButtonText = computed(() => {
  return syncProgressActive.value ? '等待中...' : '测试连接';
});

const pushButtonText = computed(() => {
  if (!syncProgressActive.value) return '推送';
  return syncCurrentAction.value === 'push' ? '推送中...' : '等待中...';
});

const pullButtonText = computed(() => {
  if (!syncProgressActive.value) return '拉取';
  return syncCurrentAction.value === 'pull' ? '下载中...' : '等待中...';
});
</script>

<style scoped>
.sync-provider-selector {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 16px;
}

.provider-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  font-weight: 500;
  min-width: 80px;
}

.sync-config-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.provider-description {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  margin: 8px 0 0 0;
  text-align: left;
}

.sync-time-display {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 8px 0;
}

.sync-action-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

@media (max-width: 480px) {
  .sync-action-buttons {
    flex-direction: column;
  }

  .sync-action-buttons .el-button {
    width: 100%;
    margin-left: 0 !important;
  }
}

.sync-progress {
  margin-top: 14px;
}

.sync-progress-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.sync-progress-enter-active,
.sync-progress-leave-active {
  transition:
    max-height 240ms ease,
    opacity 240ms ease,
    margin-top 240ms ease;
  overflow: hidden;
}

.sync-progress-enter-from,
.sync-progress-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
}

.sync-progress-enter-to,
.sync-progress-leave-from {
  max-height: 120px;
  opacity: 1;
  margin-top: 14px;
}
</style>
