<template>
  <div class="project-editor">
    <el-form
      :model="props.project"
      label-position="top"
    >
      <el-form-item label="项目名称">
        <el-input
          v-model="props.project.name"
          placeholder="请输入项目名称"
        ></el-input>
      </el-form-item>
      <el-form-item label="项目描述">
        <el-input
          type="textarea"
          :rows="4"
          v-model="props.project.description"
          placeholder="请输入项目描述"
        ></el-input>
      </el-form-item>
      <div class="project-editor-actions">
        <el-button
          type="primary"
          @click="handleExportProject"
        >
          导出当前项目
        </el-button>
        <el-button @click="handleImportOverwrite">
          导入覆盖当前项目
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import type { Project } from '@/types/world-editor';
import { ElForm, ElFormItem, ElInput, ElButton, ElMessageBox } from 'element-plus';

interface Props {
  project: Project;
  onExportProject?: (projectId: string) => void | Promise<void>;
  onImportProjectOverwrite?: (projectId: string) => void;
}

const props = defineProps<Props>();

const handleExportProject = () => {
  props.onExportProject?.(props.project.id);
};

const handleImportOverwrite = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要导入文件并覆盖当前项目「${props.project.name || '未命名项目'}」吗？该项目下的地标、势力、区域都会被替换。`,
      '确认覆盖导入',
      {
        type: 'warning',
        confirmButtonText: '继续导入',
        cancelButtonText: '取消',
      }
    );
    props.onImportProjectOverwrite?.(props.project.id);
  } catch {
  }
};
</script>

<style scoped>
.project-editor {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.project-editor-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
</style>
