<template>
  <el-dialog
    :model-value="visible"
    :title="isEditing ? '编辑项目' : '新建项目'"
    width="500px"
    @update:model-value="$emit('update:visible', $event)"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item
        label="项目名称"
        prop="name"
      >
        <el-input
          v-model="form.name"
          placeholder="请输入项目名称"
        />
      </el-form-item>
      <el-form-item
        label="项目描述"
        prop="description"
      >
        <el-input
          type="textarea"
          :rows="3"
          v-model="form.description"
          placeholder="请输入项目描述"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="$emit('update:visible', false)">取消</el-button>
        <el-button
          type="primary"
          @click="handleSubmit"
        >
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElDialog, ElForm, ElFormItem, ElInput, ElButton } from 'element-plus';
import type { Project } from '@/types/worldeditor/world-editor';

interface Props {
  visible: boolean;
  projectData: Project | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:visible', 'submit']);

const formRef = ref<FormInstance | null>(null);
const form = ref({
  id: '',
  name: '',
  description: '',
});

const isEditing = computed(() => !!props.projectData);

watch(
  () => props.projectData,
  (newVal) => {
    if (newVal) {
      form.value = { ...newVal };
    } else {
      form.value = { id: '', name: '', description: '' };
    }
  },
  { immediate: true }
);

const rules: FormRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate((valid) => {
    if (valid) {
      emit('submit', form.value);
      emit('update:visible', false);
    }
  });
};
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>
