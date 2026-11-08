<template>
  <el-divider><h3>智能正则生成器</h3></el-divider>
  <el-form-item label="原始文本 (用于智能选择)">
    <el-input
      v-model="inputText"
      type="textarea"
      :rows="6"
      placeholder="在这里输入你要分析的原始文本..."
    />
  </el-form-item>
  <SmartTextSelector
    :input-text="inputText"
    @regex-generated="(data: any) => $emit('regex-generated', data)"
  />
</template>

<script setup lang="ts">
import SmartTextSelector from './SmartTextSelector.vue';

const inputText = defineModel<string>('inputText', { required: true });

defineEmits(['regex-generated']);
</script>
