<template>
  <el-scrollbar class="worldbook-editor-scrollbar">
    <div class="content-panel-body">
      <div
        v-if="!region"
        class="worldbook-editor-empty-state"
      >
        <el-empty
          description="请在列表中选择或新增一个区域进行编辑"
          :image-size="80"
        ></el-empty>
      </div>
      <el-form
        v-if="region"
        :model="region"
        label-position="top"
        class="worldbook-editor-form"
        @submit.prevent
      >
        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:info-duotone"
              class="form-section-icon"
            />
            基础信息
          </h3>
          <div class="form-section-content">
            <div>
              <label class="form-label">名称</label>
              <el-input
                v-model="region.name"
                placeholder="例如：北境"
              />
            </div>
            <div>
              <label class="form-label">介绍</label>
              <el-input
                v-model="region.description"
                type="textarea"
                :rows="4"
                placeholder="描述这个区域的总体特征..."
              />
            </div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:paint-brush-duotone"
              class="form-section-icon"
            />
            展示设置
          </h3>
          <div class="form-grid-2-col">
            <div>
              <label class="form-label">区域颜色</label>
              <el-color-picker v-model="region.color" />
            </div>
          </div>
          <div class="color-palette">
            <button
              v-for="color in REGION_COLOR_PALETTE"
              :key="color"
              type="button"
              class="color-swatch"
              :style="{ backgroundColor: color }"
              :class="{ active: region.color === color }"
              @click="region.color = color"
            ></button>
          </div>
        </section>

        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:note-pencil-duotone"
              class="form-section-icon"
            />
            备注
          </h3>
          <div>
            <label class="form-label">备注</label>
            <el-input
              v-model="region.notes"
              type="textarea"
              :rows="3"
              placeholder="内部备注或额外信息..."
            />
          </div>
        </section>
      </el-form>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { ElScrollbar, ElForm, ElInput, ElColorPicker, ElEmpty } from 'element-plus';
import { Icon } from '@iconify/vue';
import type { EnhancedRegion } from '@/types/worldeditor/world-editor';
import { REGION_COLOR_PALETTE } from '@/utils/worldeditor/regionColors';
import '@/css/worldbook.css';

interface Props {
  region: EnhancedRegion | null;
}

defineProps<Props>();
</script>

<style scoped>
.worldbook-editor-scrollbar {
  height: 100%;
}

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  cursor: pointer;
  padding: 0;
}

.color-swatch.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
}
</style>
