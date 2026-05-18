<template>
  <div style="display: flex; flex-direction: column; gap: 16px">
    <div class="setting-card">
      <div class="setting-content">
        <div class="setting-header">
          <div class="setting-info">
            <span class="setting-label">侧边栏默认展开</span>
            <Icon
              icon="ph:sidebar-simple"
              width="20"
              height="20"
              :style="{ marginLeft: '8px', color: 'var(--el-color-primary)' }"
            />
          </div>
          <el-switch
            v-model="autoExpandSidebar"
            @change="onAutoExpandSidebarToggle"
            size="large"
          />
        </div>
        <p class="setting-description">
          开启后，桌面端侧边栏将默认展开显示菜单文字
          <br />
          关闭后，侧边栏仅显示图标
        </p>
      </div>
    </div>

    <div class="setting-card">
      <div class="setting-content">
        <div class="setting-header">
          <div class="setting-info">
            <span class="setting-label">移动端书签停靠位置（惯用手）</span>
            <Icon
              icon="ph:hand-pointing-duotone"
              width="20"
              height="20"
              :style="{ marginLeft: '8px', color: 'var(--el-color-primary)' }"
            />
          </div>
          <el-radio-group v-model="mobileDominantHand" @change="onMobileDominantHandChange">
            <el-radio-button label="left" value="left">左手 (停靠左侧)</el-radio-button>
            <el-radio-button label="right" value="right">右手 (停靠右侧)</el-radio-button>
          </el-radio-group>
        </div>
        <p class="setting-description">
          设置在移动端界面中，书签/侧边工具栏停靠的位置。
        </p>
      </div>
    </div>

    <!-- 导航栏管理 -->
    <SidebarManagement />
  </div>
</template>

<script setup lang="ts">
import { getSetting, setSetting } from '@/utils/localStorageUtils';
import { Icon } from '@iconify/vue';
import { onMounted, ref } from 'vue';
import SidebarManagement from './SidebarManagement.vue';

const autoExpandSidebar = ref(false);
const mobileDominantHand = ref<'left' | 'right'>('right');

onMounted(() => {
  autoExpandSidebar.value = getSetting('autoExpandSidebar');
  mobileDominantHand.value = getSetting('mobileDominantHand');
});

const onAutoExpandSidebarToggle = (value: boolean) => {
  setSetting('autoExpandSidebar', value);
};

const onMobileDominantHandChange = (value: 'left' | 'right') => {
  setSetting('mobileDominantHand', value);
};
</script>
<style scoped>
/* 使用全局 settings.css 样式 */
</style>
