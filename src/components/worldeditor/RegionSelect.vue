<template>
  <div class="region-select">
    <span
      v-if="props.showSelectedColor"
      class="region-select-dot"
      :class="{ 'is-empty': !selectedColor }"
      :style="{ backgroundColor: selectedColor || 'transparent' }"
    ></span>
    <el-select
      class="region-select-input"
      :model-value="props.modelValue"
      :clearable="props.clearable"
      :filterable="props.filterable"
      :allow-create="props.allowCreate"
      :default-first-option="props.allowCreate"
      :reserve-keyword="false"
      :placeholder="props.placeholder"
      @change="handleChange"
    >
      <el-option
        v-for="region in props.regions"
        :key="region.id"
        :label="region.name"
        :value="region.id"
      >
        <div class="region-option">
          <span
            class="region-option-dot"
            :style="{ backgroundColor: region.color }"
          ></span>
          <span>{{ region.name }}</span>
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElSelect, ElOption } from 'element-plus';
import type { EnhancedRegion } from '@/types/worldeditor/world-editor';

interface Props {
  modelValue?: string;
  regions: EnhancedRegion[];
  projectId?: string;
  allowCreate?: boolean;
  placeholder?: string;
  clearable?: boolean;
  filterable?: boolean;
  showSelectedColor?: boolean;
  createRegion?: (name: string, projectId: string) => EnhancedRegion;
}

const props = withDefaults(defineProps<Props>(), {
  allowCreate: false,
  placeholder: '选择区域',
  clearable: true,
  filterable: true,
  showSelectedColor: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value?: string): void;
}>();

const selectedColor = computed(() => {
  const match = props.regions.find((region) => region.id === props.modelValue);
  return match?.color || '';
});

const handleChange = (value?: string) => {
  if (!value) {
    emit('update:modelValue', undefined);
    return;
  }
  const existing = props.regions.find((region) => region.id === value);
  if (existing) {
    emit('update:modelValue', value);
    return;
  }
  if (!props.allowCreate || !props.createRegion || !props.projectId) {
    emit('update:modelValue', undefined);
    return;
  }
  const created = props.createRegion(value, props.projectId);
  emit('update:modelValue', created.id);
};
</script>

<style scoped>
.region-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.region-select-input {
  width: 100%;
}

.region-select-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid var(--el-border-color);
  flex-shrink: 0;
}

.region-select-dot.is-empty {
  background-color: transparent;
}

.region-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.region-option-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid var(--el-border-color);
  flex-shrink: 0;
}
</style>
