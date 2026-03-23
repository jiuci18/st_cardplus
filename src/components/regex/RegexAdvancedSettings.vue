<template>
  <el-divider>
    <h3>高级配置</h3>
  </el-divider>
  <el-row :gutter="20">
    <el-col :span="12">
      <el-form-item label="应用位置 (placement)">
        <el-checkbox-group :model-value="modelValue.placement" @update:model-value="update('placement', $event)">
          <el-checkbox v-for="(value, key) in REGEX_PLACEMENT" :key="value" :value="value">
            {{ key }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-col>
    <el-col :span="12">
      <el-form-item label="替换模式 (substituteRegex)">
        <el-select :model-value="modelValue.substituteRegex" @update:model-value="update('substituteRegex', $event)">
          <el-option v-for="(value, key) in SUBSTITUTE_FIND_REGEX" :key="value" :label="key" :value="value"></el-option>
        </el-select>
      </el-form-item>
    </el-col>
  </el-row>

  <el-row :gutter="20">
    <el-col :xs="12" :sm="12" :md="8">
      <el-form-item label="最小深度 (minDepth)">
        <el-input-number :model-value="modelValue.minDepth" @update:model-value="update('minDepth', $event)"
          :controls="false" placeholder="无限制" style="width: 100%" />
      </el-form-item>
    </el-col>
    <el-col :xs="12" :sm="12" :md="8">
      <el-form-item label="最大深度 (maxDepth)">
        <el-input-number :model-value="modelValue.maxDepth" @update:model-value="update('maxDepth', $event)"
          :controls="false" placeholder="无限制" style="width: 100%" />
      </el-form-item>
    </el-col>
  </el-row>

  <el-form-item label="选项">
    <el-checkbox :model-value="modelValue.disabled" @update:model-value="update('disabled', $event)">禁用
      (disabled)</el-checkbox>
    <el-checkbox :model-value="modelValue.markdownOnly" @update:model-value="update('markdownOnly', $event)">仅Markdown
      (markdownOnly)</el-checkbox>
    <el-checkbox :model-value="modelValue.promptOnly" @update:model-value="update('promptOnly', $event)">仅Prompt
      (promptOnly)</el-checkbox>
    <el-checkbox :model-value="modelValue.runOnEdit" @update:model-value="update('runOnEdit', $event)">编辑时运行
      (runOnEdit)</el-checkbox>
  </el-form-item>
</template>

<script setup lang="ts">
import { REGEX_PLACEMENT, SUBSTITUTE_FIND_REGEX, type SillyTavernRegexScript } from '@/composables/regex/types';

const props = defineProps<{
  modelValue: SillyTavernRegexScript;
}>();

const emit = defineEmits(['update:modelValue']);

const update = (key: keyof SillyTavernRegexScript, value: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};
</script>
