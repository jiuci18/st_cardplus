<template>
  <div
    class="graph-inspector-popup"
    :style="inspectorStyle"
  >
    <div
      class="graph-inspector-header"
      @mousedown="startDrag"
    >
      <div class="graph-inspector-title">节点信息</div>
      <button
        @click="onClose"
        class="close-button"
      >
        <Icon icon="ph:x" />
      </button>
    </div>
    <div class="graph-inspector-body">
      <div class="inspector-field">
        <label class="inspector-label">名称</label>
        <el-input
          v-model="selectedLandmark.name"
          placeholder="节点名称"
        />
      </div>
      <div class="inspector-field">
        <label class="inspector-label">类型</label>
        <el-select
          v-model="selectedLandmark.type"
          filterable
          allow-create
          default-first-option
          placeholder="选择或输入类型"
        >
          <el-option
            v-for="type in landmarkTypes"
            :key="type"
            :label="localizeLandmarkType(type)"
            :value="type"
          />
        </el-select>
      </div>
      <div class="inspector-field">
        <label class="inspector-label">重要性 (1-5)</label>
        <el-input-number
          v-model.number="selectedLandmark.importance"
          :min="1"
          :max="5"
          controls-position="right"
        />
      </div>
      <div class="inspector-field">
        <label class="inspector-label">人口</label>
        <el-input-number
          v-model.number="selectedLandmark.population"
          controls-position="right"
        />
      </div>
      <div class="inspector-field">
        <label class="inspector-label">区域</label>
        <RegionSelect
          v-model="selectedLandmark.regionId"
          :regions="projectRegions"
          placeholder="所属区域"
          :show-selected-color="true"
        />
      </div>
      <div
        v-if="selectedForces.length > 0"
        class="inspector-field"
      >
        <label class="inspector-label">势力列表</label>
        <div class="inspector-list">
          <div
            v-for="item in selectedForces"
            :key="item.id"
            class="inspector-list-item"
          >
            <span>{{ item.name }}</span>
            <span
              v-if="item.role"
              class="force-role"
            >
              {{ item.role }}
            </span>
          </div>
        </div>
      </div>
      <div class="inspector-actions">
        <el-button
          type="primary"
          @click="onEdit"
        >
          打开详细编辑
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnhancedLandmark, EnhancedRegion } from '@/types/worldeditor/world-editor';
import { LandmarkType } from '@/types/worldeditor/world-editor';
import type { LandmarkNodeForce } from '@/types/worldeditor/worldGraphNodes';
import { getLandmarkTypeLabel } from '@/utils/worldeditor/typeMeta';
import { Icon } from '@iconify/vue';
import { ElButton, ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus';
import type { CSSProperties } from 'vue';
import RegionSelect from '../RegionSelect.vue';

const props = defineProps<{
  selectedLandmark: EnhancedLandmark;
  selectedForces: LandmarkNodeForce[];
  projectRegions: EnhancedRegion[];
  inspectorStyle: CSSProperties;
  startDrag: (event: MouseEvent) => void;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'edit', item: EnhancedLandmark): void;
}>();

const landmarkTypes = Object.values(LandmarkType);
const localizeLandmarkType = (type: string): string => getLandmarkTypeLabel(type);

const onClose = () => emit('close');
const onEdit = () => emit('edit', props.selectedLandmark);
</script>

<style scoped>
.graph-inspector-popup {
  width: 300px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.graph-inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
}

.graph-inspector-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.graph-inspector-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inspector-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inspector-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.inspector-list {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px;
  max-height: 160px;
  overflow-y: auto;
  background: var(--el-fill-color-light);
}

.inspector-list-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  padding: 4px 0;
}

.inspector-empty {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.inspector-actions {
  display: flex;
  gap: 8px;
}

.force-role {
  color: var(--el-color-primary);
}
</style>
