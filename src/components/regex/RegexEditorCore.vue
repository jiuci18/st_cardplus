<template>
  <el-form-item label="规则名称 (scriptName)">
    <el-input v-model="scriptName" />
  </el-form-item>
  <el-form-item label="查找 (findRegex)">
    <el-input v-model="findRegex" type="textarea" :rows="3" placeholder="/pattern/flags" />
  </el-form-item>
  <el-form-item>
    <el-select v-model="substituteRegex" style="width: 100%">
      <el-option :value="0" label="不替换 (NONE) - 使用原始正则表达式" />
      <el-option :value="1" label="原始替换 (RAW) - 替换宏但不转义" />
      <el-option :value="2" label="转义替换 (ESCAPED) - 替换宏并转义特殊字符" />
    </el-select>
    <template #label>
      <span class="label-with-tip">
        <span>查找字符串宏替换模式</span>
        <el-tooltip placement="top" effect="dark">
          <template #content>
            <div style="max-width: 300px">
              <p>
                <strong>NONE (0):</strong>
                不对查找字符串进行宏替换
              </p>
              <p>
                <strong>RAW (1):</strong>
                替换 {{ '{{' }}user}} 等宏，但不转义特殊字符
              </p>
              <p>
                <strong>ESCAPED (2):</strong>
                替换宏并转义正则特殊字符，适合匹配字面文本
              </p>
            </div>
          </template>
          <Icon icon="ph:question-duotone" style="margin-left: 4px; cursor: help" />
        </el-tooltip>
      </span>
    </template>
  </el-form-item>
  <el-form-item>
    <el-input v-model="replaceString" type="textarea" :rows="5" placeholder="Hello, $1! 或 Hello, $<name>!" />
    <template #label>
      <span class="label-with-tip">
        <span>替换 (replaceString)</span>
        <el-tooltip placement="top" effect="dark">
          <template #content>
            <div style="max-width: 300px">
              <p>支持以下替换语法：</p>
              <p>
                •
                <strong>$0</strong>
                或
                <strong>{{ '{{' }}match}}</strong>
                - 完整匹配
              </p>
              <p>
                •
                <strong>$1, $2, ...</strong>
                - 数字捕获组
              </p>
              <p>
                •
                <strong>$&lt;name&gt;</strong>
                - 命名捕获组
              </p>
              <p>
                •
                <strong>{{ '{{' }}user}}, {{ '{{' }}char}}</strong>
                - 宏变量
              </p>
            </div>
          </template>
          <Icon icon="ph:question-duotone" style="margin-left: 4px; cursor: help" />
        </el-tooltip>
      </span>
    </template>
  </el-form-item>
  <el-form-item label="移除字符 (trimStrings)">
    <el-input v-model="trimStrings" type="textarea" :rows="2" placeholder="每行一个需要移除的字符串" />
  </el-form-item>
</template>

<script setup lang="ts">
import type { SillyTavernRegexScript } from '@/composables/regex/types';
import { Icon } from '@iconify/vue';
import { ElTooltip } from 'element-plus';

const scriptName = defineModel<string>('scriptName', { required: true });
const findRegex = defineModel<string>('findRegex', { required: true });
const replaceString = defineModel<string>('replaceString', { required: true });
const trimStrings = defineModel<string>('trimStrings', { required: true });
const substituteRegex = defineModel<SillyTavernRegexScript['substituteRegex']>('substituteRegex', { default: 0 });
</script>

<style scoped>
.label-with-tip {
  display: inline-flex;
  align-items: center;
}
</style>
