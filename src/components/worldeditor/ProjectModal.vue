<template>
  <el-dialog v-model="visible" :title="isEditing ? '编辑项目' : '新建项目'" width="500px" :close-on-click-modal="false">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="项目名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入项目名称" />
      </el-form-item>
      <el-form-item label="项目描述" prop="description">
        <el-input type="textarea" :rows="3" v-model="form.description" placeholder="请输入项目描述" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">
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
import type { Project, ProjectInput } from '@/types/worldeditor/world-editor';

const props = defineProps<{ projectData: Project | null }>();
const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ submit: [project: ProjectInput] }>();

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
      visible.value = false;
    }
  });
};
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>
