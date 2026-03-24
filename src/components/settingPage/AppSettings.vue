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
      <ExternalLink
        href="https://github.com/awaae001/doc"
      >
        https://github.com/awaae001/doc
      </ExternalLink>
    </template>
  </el-alert>
  <div class="app-settings">
    <div
      class="setting-card update-card"
      :class="{ 'is-web-masked': showWebUpdateMask }"
    >
      <div class="setting-content">
        <div class="update-header-row">
          <p class="update-eyebrow">当前更新 - {{ updateStatusText }}</p>
          <el-button
            type="primary"
            size="small"
            @click="openUpdateGuide"
          >
            前往更新
          </el-button>
        </div>

        <div class="update-body">
          <div class="update-body-content">
            <p class="update-copy">
              更新一般包括新的功能和历史问题的修复，或者 UI 更新，请时刻检查更新确保你使用的是最新的更新和修复
            </p>

            <div class="update-section">
              <p class="update-section-label">元数据 / 提交内容</p>
              <p class="update-metadata-text">{{ remoteMetadataText }}</p>
              <div
                ref="updateQuoteRef"
                class="update-quote-wrapper overflow-hidden transition-[max-height] duration-300 ease-out"
                :class="{ 'is-collapsed': isUpdateContentOverflowing && !isUpdateContentExpanded }"
                :style="{ maxHeight: updateQuoteMaxHeight }"
              >
                <p class="update-quote">{{ updateContentText }}</p>
              </div>
              <div
                v-if="isUpdateContentOverflowing"
                class="update-quote-actions"
              >
                <el-button
                  link
                  size="small"
                  @click="isUpdateContentExpanded = !isUpdateContentExpanded"
                >
                  {{ isUpdateContentExpanded ? '收起' : '展开全文' }}
                </el-button>
              </div>
            </div>

            <p
              v-if="updateCheckError"
              class="update-error-note"
            >
              检查失败：{{ updateCheckError }}
            </p>
          </div>
        </div>
        <div
          v-if="showWebUpdateMask"
          class="update-web-mask"
        >
          <div class="update-web-mask-content">
            <div class="update-web-mask-text">
              网页端滚动更新
              <br />
              记得备份
            </div>
            <div class="update-web-mask-actions">
              <el-button
                type="primary"
                plain
                size="small"
                class="update-web-mask-action"
                @click.stop="showWebUpdateMask = false"
              >
                窝就要看
              </el-button>
            </div>
          </div>
        </div>

        <div class="update-footer">
          <div class="update-location">
            <span class="update-footer-label">你的位置：</span>
            <span class="update-footer-text">{{ currentLocationText }}</span>
          </div>
          <div class="update-ignore-control">
            <el-select
              v-model="ignoreUpdateDays"
              size="small"
              class="ignore-days-select"
            >
              <el-option
                v-for="day in ignoreDayOptions"
                :key="day"
                :label="day < 0 ? '永久' : `${day} 天`"
                :value="day"
              />
            </el-select>
            <el-button
              type="warning"
              plain
              @click="handleUpdateIgnoreAction"
            >
              {{
                isUpdateIgnored ? '解除忽略' : `忽略更新（${ignoreUpdateDays < 0 ? '永久' : `${ignoreUpdateDays} 天`}`
              }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

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
        <p
          class="setting-description"
          v-html="setting.description"
        ></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ExternalLink from '@/components/common/ExternalLink.vue';
import { getAppSettings } from '@/composables/appSettings';
import { useAppUpdate } from '@/composables/useAppUpdate';
import { openExternalUrl } from '@/utils/externalLink';
import { isTauriApp } from '@/utils/imageHosting';
import { getSetting, setSetting } from '@/utils/localStorageUtils';
import { Icon } from '@iconify/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const betaFeaturesEnabled = ref(false);
const umamiEnabled = ref(true);
const autoSaveInterval = ref(5);
const autoSaveDebounce = ref(1.5);
const imgbbApiKey = ref('');
const ignoreUpdateDays = ref(7);
const ignoreDayOptions = [-1, 1, 3, 7, 14, 30];
const showWebUpdateMask = ref(!isTauriApp());
const updateQuoteRef = ref<HTMLElement | null>(null);
const updateQuoteMaxHeight = ref('none');
const isUpdateContentExpanded = ref(false);
const isUpdateContentOverflowing = ref(false);
const UPDATE_CONTENT_COLLAPSED_LINES = 6;
const {
  currentVersion,
  currentCommitHash,
  currentChannel,
  updateGuideUrl,
  resolvedUpdateBranch,
  latestVersion,
  latestCommitHash,
  latestBuildTime,
  latestUpdateTitle,
  latestUpdateDescription,
  detectedUpdateAvailable,
  updateAvailable,
  hasCheckedForUpdate,
  updateCheckError,
  isUpdateIgnored,
  checkForAppUpdate,
  ignoreAppUpdateForDays,
  clearIgnoredAppUpdate,
} = useAppUpdate();

const onBetaFeaturesToggle = (value: boolean) => {
  if (value) {
    ElMessageBox.confirm(
      `
          <div style="text-align: left;">
            <p>测试版功能尚在开发中，可能存在未知问题和不稳定性</p>
            <p>这些功能可能会在没有事先通知的情况下发生变化或被移除</p>
            <p>在一般情况下，测试版将会带来更多<b>破坏性更新</b>，这可能导致您的创意丢失或者难以寻回</p>
            <p><strong>使用测试版功能即表示您理解并接受这些风险</strong></p>
            <p>我鼓励您通过 <a href="https://github.com/jiuci18/st_cardplus/issues" target="_blank" rel="noopener noreferrer" data-external-link="true" style="color: var(--el-color-primary);">GitHub Issues</a> 反馈问题，但请注意，我可能无法提供即时支持 </p>
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

const formatMetadataDate = (value: string) => {
  if (!value) return '---- -- --';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const remoteMetadataText = computed(() => {
  if (!hasCheckedForUpdate.value) return '读取中……';
  if (!latestVersion.value) return '暂时没有读到远端元数据';
  const remoteBranchLabel = resolvedUpdateBranch.value === 'main' ? 'main' : 'dev';
  return `${currentChannel} -> ${remoteBranchLabel}[${latestCommitHash.value || '----'}](V - ${latestVersion.value}) - ${formatMetadataDate(latestBuildTime.value)}`;
});

const updateStatusText = computed(() => {
  if (isUpdateIgnored.value) return '已暂停';
  if (updateAvailable.value) return '需要更新';
  return '一切正常';
});

const updateContentText = computed(() => {
  const title = latestUpdateTitle.value.trim();
  const description = latestUpdateDescription.value.trim();
  if (title && description) return `${title}\n${description}`;
  if (title) return title;
  if (description) return description;
  if (detectedUpdateAvailable.value) return '这次更新没有附带额外说明。';
  if (!hasCheckedForUpdate.value) return '正在读取提交内容……';
  return '目前没有新的提交说明。';
});

const currentLocationText = computed(() => {
  return `${currentChannel}[${currentCommitHash}](V - ${currentVersion})`;
});

const resolveCollapsedUpdateContentHeight = (element: HTMLElement) => {
  const computedStyle = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight);
  const fontSize = Number.parseFloat(computedStyle.fontSize);
  const resolvedLineHeight = Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.6;

  return resolvedLineHeight * UPDATE_CONTENT_COLLAPSED_LINES;
};

const measureUpdateContentOverflow = () => {
  const element = updateQuoteRef.value;

  if (!element) {
    updateQuoteMaxHeight.value = 'none';
    isUpdateContentOverflowing.value = false;
    return;
  }

  const collapsedMaxHeight = resolveCollapsedUpdateContentHeight(element);
  const fullHeight = element.scrollHeight;

  isUpdateContentOverflowing.value = fullHeight > collapsedMaxHeight + 1;

  if (!isUpdateContentOverflowing.value) {
    isUpdateContentExpanded.value = false;
  }

  updateQuoteMaxHeight.value = `${Math.max(
    0,
    Math.ceil(isUpdateContentOverflowing.value && !isUpdateContentExpanded.value ? collapsedMaxHeight : fullHeight)
  )}px`;
};

const syncUpdateContentOverflow = async () => {
  await nextTick();
  measureUpdateContentOverflow();
};

const handleUpdateContentResize = () => {
  void syncUpdateContentOverflow();
};

const handleIgnoreUpdate = () => {
  ignoreAppUpdateForDays(ignoreUpdateDays.value);
  ElMessage.success(ignoreUpdateDays.value < 0 ? '已永久忽略更新提醒' : `已忽略更新提醒 ${ignoreUpdateDays.value} 天`);
};

const handleClearIgnoredUpdate = () => {
  clearIgnoredAppUpdate();
  ElMessage.success('已恢复更新提醒');
};

const handleUpdateIgnoreAction = () => {
  if (isUpdateIgnored.value) {
    handleClearIgnoredUpdate();
    return;
  }

  handleIgnoreUpdate();
};

const openUpdateGuide = () => {
  void openExternalUrl(updateGuideUrl.value).catch((error) => {
    console.error('打开更新说明失败:', error);
  });
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
  window.addEventListener('resize', handleUpdateContentResize);
  void syncUpdateContentOverflow();
  void checkForAppUpdate();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleUpdateContentResize);
});

watch(updateContentText, () => {
  isUpdateContentExpanded.value = false;
  void syncUpdateContentOverflow();
});

watch(isUpdateContentExpanded, () => {
  void syncUpdateContentOverflow();
});
</script>

<style scoped>
/* 使用全局 settings.css 中定义的通用样式 */

.setting-password-input {
  width: min(320px, 100%);
}

.update-card {
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.update-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.update-body {
  position: relative;
  margin-top: 0.65rem;
}

.update-body-content {
  position: relative;
  z-index: 1;
}

.update-card.is-web-masked .update-body-content {
  filter: blur(10px);
  pointer-events: none;
  user-select: none;
}

.update-web-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: calc(52px + 0.95rem);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  text-align: center;
  background: color-mix(in srgb, var(--el-bg-color) 78%, transparent 22%);
  backdrop-filter: blur(10px);
}

.update-web-mask-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.update-web-mask-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
}

.update-web-mask-text {
  font-size: 0.92rem;
  line-height: 1.7;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.update-web-mask-action {
  pointer-events: auto;
}

.update-eyebrow {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.update-copy {
  margin: 0.45rem 0 0;
  font-size: 0.84rem;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.update-section {
  margin-top: 0.75rem;
  padding: 0.85rem 0.95rem;
  border-radius: 0.25rem;
  background: var(--el-fill-color-light);
}

.update-section-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--el-text-color-secondary);
}

.update-metadata-text,
.update-quote {
  margin: 0.45rem 0 0;
  font-size: 0.84rem;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.update-metadata-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.update-quote {
  margin-top: 0;
  white-space: pre-wrap;
}

.update-quote-wrapper {
  position: relative;
  margin-top: 0.45rem;
}

.update-quote-wrapper.is-collapsed::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2.8rem;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, var(--el-fill-color-light) 100%);
}

.update-quote-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.35rem;
}

.update-error-note {
  margin: 0.9rem 0 0;
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--el-color-danger);
}

.update-footer {
  margin-top: 0.95rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.update-location {
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.update-footer-label {
  font-weight: 700;
}

.update-footer-text {
  margin-left: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--el-text-color-regular);
  word-break: break-word;
}

.update-ignore-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ignore-days-select {
  width: 96px;
}
</style>
