<template>
  <div class="advanced-info-panel">
    <el-row :gutter="20">
      <el-col
        :xs="24"
        :sm="12"
      >
        <el-form-item label="性格">
          <el-input
            :model-value="character.data.personality"
            @update:model-value="updateField('personality', $event)"
            type="textarea"
            :rows="4"
            placeholder="角色的性格特点"
          />
        </el-form-item>
      </el-col>
      <el-col
        :xs="24"
        :sm="12"
      >
        <el-form-item label="场景">
          <el-input
            :model-value="character.data.scenario"
            @update:model-value="updateField('scenario', $event)"
            type="textarea"
            :rows="4"
            placeholder="角色所处的场景或世界观"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="对话">
      <el-input
        :model-value="character.data.mes_example"
        @update:model-value="updateField('mes_example', $event)"
        type="textarea"
        :rows="6"
        placeholder="示例对话，用于展示角色风格"
      />
    </el-form-item>

    <el-row :gutter="20">
      <el-col
        :xs="24"
        :sm="12"
      >
        <el-form-item label="提示">
          <el-input
            :model-value="character.data.system_prompt"
            @update:model-value="updateField('system_prompt', $event)"
            type="textarea"
            :rows="4"
            placeholder="用于指导 AI 的系统级提示"
          />
        </el-form-item>
      </el-col>
      <el-col
        :xs="24"
        :sm="12"
      >
        <el-form-item label="指令">
          <el-input
            :model-value="character.data.post_history_instructions"
            @update:model-value="updateField('post_history_instructions', $event)"
            type="textarea"
            :rows="4"
            placeholder="在生成回复时追加到历史记录后的指令"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col
        :xs="24"
        :sm="12"
      >
        <el-form-item label="作注">
          <el-input
            :model-value="character.data.creator_notes"
            @update:model-value="updateField('creator_notes', $event)"
            type="textarea"
            :rows="3"
            placeholder="创作者的内部备注"
          />
        </el-form-item>
      </el-col>
      <el-col
        :xs="24"
        :sm="12"
      >
        <el-form-item label="作者">
          <el-input
            :model-value="character.data.creator"
            @update:model-value="updateField('creator', $event)"
            placeholder="请输入作者名"
          />
        </el-form-item>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ElFormItem, ElInput, ElRow, ElCol } from 'element-plus';
import type { CharacterCardV3 } from '@/types/character-card-v3';

defineProps<{
  character: CharacterCardV3;
}>();

type AdvancedInfoField =
  | 'personality'
  | 'scenario'
  | 'mes_example'
  | 'system_prompt'
  | 'post_history_instructions'
  | 'creator_notes'
  | 'creator';

const emit = defineEmits<{
  (e: 'update-field', payload: { field: AdvancedInfoField; value: string }): void;
}>();

const updateField = (field: AdvancedInfoField, value: string) => {
  emit('update-field', {
    field,
    value,
  });
};
</script>

<style scoped>
.advanced-info-panel {
  padding-top: 12px;
}
</style>
