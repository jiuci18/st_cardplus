<template>
  <el-alert
    type="info"
    show-icon
    :closable="false"
    style="margin-bottom: 12px"
  >
    <template #title>想要贡献？来贡献文档吧！</template>
    <template #default>
      文档贡献地址：
      <a
        href="https://github.com/awaae001/doc"
        target="_blank"
        rel="noopener noreferrer"
      >
        https://github.com/awaae001/doc
      </a>
    </template>
  </el-alert>
  <div class="app-settings">
    <div
      v-for="setting in settings"
      :key="setting.id"
      class="setting-card"
    >
      <div class="setting-content">
        <div class="setting-header">
          <div class="setting-info">
            <span class="setting-label">{{ setting.label }}</span>
            <Icon
              :icon="setting.icon"
              width="20"
              height="20"
              :style="{ marginLeft: '8px', color: setting.iconColor }"
            />
          </div>
          <template v-if="setting.type === 'switch'">
            <el-switch
              v-model="setting.model.value"
              @change="setting.handler"
              size="large"
              :disabled="setting.disabled"
            />
          </template>
          <template v-else-if="setting.type === 'numberInput'">
            <div class="interval-control">
              <el-input-number
                v-model="setting.model.value"
                @change="setting.handler"
                :min="setting.min"
                :max="setting.max"
                :step="setting.step"
                size="small"
                style="width: 100px"
              />
              <span class="interval-unit">{{ setting.unit }}</span>
            </div>
          </template>
          <template v-else-if="setting.type === 'passwordInput'">
            <el-input
              v-model="setting.model.value"
              @input="setting.handler"
              type="password"
              show-password
              clearable
              :placeholder="setting.placeholder"
              class="setting-password-input"
            />
          </template>
        </div>
        <p class="setting-description" v-html="setting.description"></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getAppSettings } from '@/composables/appSettings';
import { getSetting, setSetting } from '@/utils/localStorageUtils';
import { Icon } from '@iconify/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref } from 'vue';

const betaFeaturesEnabled = ref(false);
const umamiEnabled = ref(true);
const autoSaveInterval = ref(5);
const autoSaveDebounce = ref(1.5);
const imgbbApiKey = ref('');

const onBetaFeaturesToggle = (value: boolean) => {
  if (value) {
    ElMessageBox.confirm(
      `
          <div style="text-align: left;">
            <p>测试版功能尚在开发中，可能存在未知问题和不稳定性</p>
            <p>这些功能可能会在没有事先通知的情况下发生变化或被移除</p>
            <p>在一般情况下，测试版将会带来更多<b>破坏性更新</b>，这可能导致您的创意丢失或者难以寻回</p>
            <p><strong>使用测试版功能即表示您理解并接受这些风险</strong></p>
            <p>我鼓励您通过 <a href="https://github.com/awaae001/st_cardplus/issues" target="_blank" style="color: var(--el-color-primary);">GitHub Issues</a> 反馈问题，但请注意，我可能无法提供即时支持 </p>
          </div>
        `,
      '启用测试版功能',
      {
        confirmButtonText: '我理解并同意',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true,
      }
    )
      .then(() => {
        setSetting('betaFeaturesEnabled', true);
        window.dispatchEvent(new CustomEvent('betaFeaturesToggle', { detail: true }));
        ElMessage({
          type: 'success',
          message: '测试版功能已开启',
        });
      })
      .catch(() => {
        betaFeaturesEnabled.value = false;
        ElMessage({
          type: 'info',
          message: '已取消开启测试版功能',
        });
      });
  } else {
    setSetting('betaFeaturesEnabled', false);
    window.dispatchEvent(new CustomEvent('betaFeaturesToggle', { detail: false }));
  }
};

const onAutoSaveIntervalChange = (value: number | undefined) => {
  if (value === undefined) return;
  setSetting('autoSaveInterval', value);
  window.dispatchEvent(new CustomEvent('autoSaveIntervalChange', { detail: value }));
};

const onAutoSaveDebounceChange = (value: number | undefined) => {
  if (value === undefined) return;
  setSetting('autoSaveDebounce', value);
  window.dispatchEvent(new CustomEvent('autoSaveDebounceChange', { detail: value }));
};

const onUmamiToggle = (value: boolean) => {
  setSetting('umamiEnabled', value);
  window.dispatchEvent(new CustomEvent('umamiToggle', { detail: value }));
};

const onImgbbApiKeyChange = (value: string) => {
  setSetting('imgbbApiKey', value);
};

const settings = computed(() =>
  getAppSettings(
    {
      betaFeaturesEnabled,
      umamiEnabled,
      autoSaveInterval,
      autoSaveDebounce,
      imgbbApiKey,
    },
    {
      onBetaFeaturesToggle,
      onUmamiToggle,
      onAutoSaveIntervalChange,
      onAutoSaveDebounceChange,
      onImgbbApiKeyChange,
    }
  )
);

onMounted(() => {
  betaFeaturesEnabled.value = getSetting('betaFeaturesEnabled');
  umamiEnabled.value = getSetting('umamiEnabled');
  autoSaveInterval.value = getSetting('autoSaveInterval');
  autoSaveDebounce.value = getSetting('autoSaveDebounce');
  imgbbApiKey.value = getSetting('imgbbApiKey');
});
</script>

<style scoped>
/* 使用全局 settings.css 中定义的通用样式 */

.setting-password-input {
  width: min(320px, 100%);
}
</style>
