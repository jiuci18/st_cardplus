<template>
  <div class="setting-card">
    <div class="setting-content">
      <div class="setting-header">
        <div class="setting-info">
          <span class="setting-label">本地数据目录</span>
          <Icon
            icon="material-symbols:folder-open-outline"
            width="20"
            height="20"
            style="margin-left: 8px; color: var(--el-color-primary)"
          />
        </div>
        <div>
          <el-button
            @click="openLocalDir"
            :type="isDesktopApp ? 'primary' : 'info'"
            :disabled="!isDesktopApp"
            plain
          >
            <Icon
              :icon="
                isDesktopApp
                  ? 'material-symbols:folder-open'
                  : 'material-symbols:folder-off-outline'
              "
              width="20"
              height="20"
              style="margin-right: 8px"
            />
            {{ isDesktopApp ? "打开本地目录" : "web 不支持本地目录" }}
          </el-button>
        </div>
      </div>
      <p class="setting-description">
        直接打开本地存储图片、配置文件和备份数据的应用数据存储目录
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { ElMessage } from "element-plus";

import { isTauriApp } from "@/utils/system/tauri";

const isDesktopApp = isTauriApp();

const openLocalDir = async () => {
  if (!isDesktopApp) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_local_directory");
  } catch (error) {
    console.error(error);
    ElMessage.error(
      `打开本地目录失败: ${error instanceof Error ? error.message : error}`,
    );
  }
};
</script>
