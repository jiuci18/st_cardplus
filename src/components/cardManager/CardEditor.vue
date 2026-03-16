<template>
  <div class="card-editor-form">
    <!-- 基础信息与图片 -->
    <section class="form-section">
      <h3 class="form-section-title">
        <Icon
          icon="ph:user-circle-gear-duotone"
          class="form-section-icon"
        />
        核心设定
      </h3>
      <div class="form-section-content two-column">
        <div class="image-panel-container">
          <h4 class="sub-section-title">角色图片</h4>
          <p class="image-persistence-notice">注意：本地上传图片仅用于导出；通过 🔗 设置的 URL 会随角色卡保存。</p>
          <ImagePanel
            :preview-url="imagePreviewUrl"
            :avatar-url="avatarUrl"
            :is-desktop-app="isDesktopApp"
            :selected-provider="selectedProvider"
            @image-change="emit('imageChange', $event)"
            @image-url-change="emit('imageUrlChange', $event)"
            @provider-change="emit('providerChange', $event)"
            @upload-to-hosting="emit('uploadToHosting', $event)"
          />
        </div>
        <div class="basic-info-container">
          <h4 class="sub-section-title">基础信息</h4>
          <BasicInfoPanel
            :character="character"
            :all-tags="props.allTags"
            @update-field="emit('update-field', $event)"
          />
        </div>
      </div>
    </section>

    <!-- 开场白 -->
    <section class="form-section">
      <h3 class="form-section-title">
        <Icon
          icon="ph:chat-teardrop-dots-duotone"
          class="form-section-icon"
        />
        多开场白
      </h3>
      <div class="form-section-content">
        <GreetingsPanel
          :model-value="character.data.alternate_greetings"
          @update:model-value="emit('update-field', { field: 'alternate_greetings', value: $event })"
        />
      </div>
    </section>

    <!-- 其他与正则 -->
    <section class="form-section">
      <h3 class="form-section-title">
        <Icon
          icon="ph:puzzle-piece-duotone"
          class="form-section-icon"
        />
        其他与正则
      </h3>
      <InfoDisplayPanel
        type="regex"
        :character="character"
      />
    </section>

    <!-- 高级选项 -->
    <div
      class="form-section-title advanced-options-toggle"
      @click="toggleAdvancedOptions"
    >
      <Icon
        :icon="advancedOptionsVisible ? 'ph:caret-down-duotone' : 'ph:caret-right-duotone'"
        class="form-section-icon"
      />
      <span>高级设定</span>
      <span class="advanced-options-hint">{{ advancedOptionsVisible ? '点击折叠' : '点击展开' }}</span>
    </div>

    <el-collapse-transition>
      <div v-show="advancedOptionsVisible">
        <section class="form-section">
          <div class="form-section-content">
            <AdvancedInfoPanel
              :character="character"
              @update-field="emit('update-field', $event)"
            />
          </div>
        </section>
      </div>
    </el-collapse-transition>
  </div>
</template>

<script setup lang="ts">
import AdvancedInfoPanel from '@/components/cardManager/main/AdvancedInfoPanel.vue';
import BasicInfoPanel from '@/components/cardManager/main/BasicInfoPanel.vue';
import GreetingsPanel from '@/components/cardManager/main/GreetingsPanel.vue';
import ImagePanel from '@/components/cardManager/main/ImagePanel.vue';
import InfoDisplayPanel from '@/components/cardManager/main/InfoDisplayPanel.vue';
import type { CharacterCardV3 } from '@/types/character-card-v3';
import { Icon } from '@iconify/vue';
import { ElCollapseTransition } from 'element-plus';

const props = defineProps<{
  character: CharacterCardV3;
  imagePreviewUrl?: string;
  avatarUrl?: string;
  isDesktopApp?: boolean;
  selectedProvider?: 'catbox' | 'imgbb';
  advancedOptionsVisible: boolean;
  allTags?: string[];
}>();

const emit = defineEmits<{
  (e: 'imageChange', file: File): void;
  (e: 'imageUrlChange', url: string): void;
  (e: 'providerChange', provider: 'catbox' | 'imgbb'): void;
  (e: 'uploadToHosting', provider: 'catbox' | 'imgbb'): void;
  (e: 'update-field', payload: {
    field: keyof CharacterCardV3['data'];
    value: CharacterCardV3['data'][keyof CharacterCardV3['data']];
  }): void;
  (e: 'update:advancedOptionsVisible', value: boolean): void;
}>();

const toggleAdvancedOptions = () => {
  emit('update:advancedOptionsVisible', !props.advancedOptionsVisible);
};
</script>

<style scoped>
.card-editor-form {
  padding: 12px;
}

.form-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-extra-light);
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.form-section-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.form-section-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section-content.two-column {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  align-items: start;
}

.image-panel-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.basic-info-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sub-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin: 0 0 12px 0;
}

.advanced-options-toggle {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-bottom: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.advanced-options-toggle:hover {
  background-color: var(--el-fill-color-light);
}

.advanced-options-hint {
  margin: auto 6px 0 auto;
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-placeholder);
}

.image-persistence-notice {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  margin-bottom: 8px;
  padding: 0;
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .form-section-content.two-column {
    grid-template-columns: 1fr;
  }
}
</style>
