<template>
  <div class="project-manager">
    <div class="project-selector">
      <div class="selector-section">
        <label class="selector-label">当前项目</label>
        <el-select :model-value="store.currentProjectId" @change="handleProjectChange" placeholder="选择项目"
          class="project-select" style="width: 100%">
          <el-option v-for="project in store.projects" :key="project.id" :label="project.name" :value="project.id">
            <div class="project-option">
              <span class="project-name">{{ project.name }}</span>
              <span class="project-date">{{ formatDateTime(project.updatedAt) }}</span>
            </div>
          </el-option>
        </el-select>
      </div>

      <div class="action-buttons">
        <el-button :icon="Plus" size="small" @click="handleCreateProject" type="primary" style="width: 100%">
          新建项目
        </el-button>
      </div>
      <div class="action-buttons">
        <el-button :icon="Setting" size="small" @click="showProjectDialog = true" :disabled="!store.currentProjectId"
          style="width: 100%">
          项目管理
        </el-button>
      </div>
    </div>

    <div v-if="store.currentProject" class="project-info">
      <div class="project-title">
        <h4>{{ store.currentProject.name }}</h4>
        <el-tag size="small" type="info">
          {{ totalStagesCount }} 个阶段
        </el-tag>
      </div>
      <div class="project-meta">
        <span>创建于: {{ formatDateTime(store.currentProject.createdAt) }}</span>
        <span>更新于: {{ formatDateTime(store.currentProject.updatedAt) }}</span>
      </div>
    </div>

    <div v-if="store.currentProject" class="stage-scheme-section">
      <div class="scheme-content">
        <div class="scheme-meta-tags">
          <el-tag v-if="store.currentScheme" size="small" type="success">
            当前方案: {{ store.currentScheme.name }}
          </el-tag>
          <el-tag size="small" type="info">
            {{ store.currentProjectSchemes.length }} 个方案
          </el-tag>
        </div>

        <div class="scheme-quick-actions">
          <el-button :icon="Plus" size="small" @click="handleSaveCurrentAsScheme" type="primary" style="width: 100%">
            保存当前为新方案
          </el-button>
        </div>

        <div v-if="store.currentProjectSchemes.length > 0" class="scheme-list">
          <div v-for="scheme in store.currentProjectSchemes" :key="scheme.id" class="scheme-item"
            :class="{ 'is-active': scheme.id === store.currentSchemeId }" @click="handleSchemeChange(scheme.id)">
            <div class="scheme-info">
              <span class="scheme-name">{{ scheme.name }}</span>
            </div>
            <div class="scheme-actions" @click.stop>
              <el-button size="small" :icon="Edit" circle @click="handleRenameScheme(scheme.id)" title="重命名方案" />
              <el-button size="small" :icon="CopyDocument" circle @click="handleCopyScheme(scheme.id)" title="复制方案" />
              <el-button size="small" :icon="Delete" circle type="danger" @click="handleDeleteScheme(scheme.id)"
                title="删除方案" :disabled="store.currentProjectSchemes.length <= 1" />
            </div>
          </div>
        </div>

        <div v-else class="empty-schemes">
          <el-empty description="暂无方案" :image-size="40">
            <el-button size="small" type="primary" @click="handleSaveCurrentAsScheme">
              创建第一个方案
            </el-button>
          </el-empty>
        </div>
      </div>
    </div>

    <el-dialog v-model="showProjectDialog" title="项目管理" width="600px" :close-on-click-modal="false">
      <div class="project-management">
        <div v-if="store.currentProject" class="current-project-edit">
          <h5>当前项目</h5>
          <el-form :model="currentProjectForm" label-width="80px">
            <el-form-item label="项目名称">
              <el-input v-model="currentProjectForm.name" placeholder="输入项目名称" @blur="handleRenameCurrentProject" />
            </el-form-item>
            <el-form-item label="创建时间">
              <span>{{ formatDateTime(store.currentProject.createdAt) }}</span>
            </el-form-item>
            <el-form-item label="更新时间">
              <span>{{ formatDateTime(store.currentProject.updatedAt) }}</span>
            </el-form-item>
            <el-form-item label="项目操作">
              <el-button-group>
                <el-tooltip content="导入项目/工作区" placement="top">
                  <el-button :icon="Download" @click="store.importProjectsFromFile" />
                </el-tooltip>
                <el-tooltip content="导出当前项目" placement="top">
                  <el-button :icon="Upload" @click="store.exportCurrentProject" />
                </el-tooltip>
                <el-tooltip content="导出工作区" placement="top">
                  <el-button :icon="FolderOpened" @click="store.exportWorkspace" />
                </el-tooltip>
                <el-tooltip content="删除当前项目" placement="top">
                  <el-button type="danger" :icon="Delete" @click="handleDeleteCurrentProject"
                    :disabled="store.projects.length <= 1" />
                </el-tooltip>
              </el-button-group>
            </el-form-item>
          </el-form>
        </div>

        <el-divider />

        <div class="all-projects">
          <h5>所有项目</h5>
          <el-table :data="store.projects" style="width: 100%">
            <el-table-column prop="name" label="项目名称" min-width="120">
              <template #default="scope">
                <div class="project-name-cell">
                  <span>{{ scope.row.name }}</span>
                  <el-tag v-if="scope.row.id === store.currentProjectId" size="small" type="primary">
                    当前
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="120">
              <template #default="scope">
                {{ formatDateTime(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="updatedAt" label="更新时间" width="120">
              <template #default="scope">
                {{ formatDateTime(scope.row.updatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button-group size="small">
                  <el-button v-if="scope.row.id !== store.currentProjectId" @click="handleSwitchProject(scope.row.id)"
                    size="small">
                    切换
                  </el-button>
                  <el-button type="danger" @click="handleDeleteProject(scope.row.id)"
                    :disabled="store.projects.length <= 1" size="small">
                    删除
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="showProjectDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useEjsEditorStore } from '@/composables/ejs/ejsEditor';
import { formatDateTime } from '@/utils/datetime';
import {
  CopyDocument,
  Delete,
  Download,
  Edit,
  FolderOpened,
  Plus,
  Setting,
  Upload,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, ref, watch } from 'vue';

const store = useEjsEditorStore();
const showProjectDialog = ref(false);

const totalStagesCount = computed(() => {
  if (!store.logicBlocks) return 0;
  return store.logicBlocks.reduce((total, block) => total + block.stages.length, 0);
});

const currentProjectForm = ref({
  name: '',
});

watch(
  () => store.currentProject,
  (project) => {
    if (project) {
      currentProjectForm.value.name = project.name;
    }
  },
  { immediate: true }
);

function handleProjectChange(projectId: string) {
  if (projectId && projectId !== store.currentProjectId) {
    handleSwitchProject(projectId);
  }
}

async function handleCreateProject() {
  try {
    const projectNameResult = await ElMessageBox.prompt('请输入新项目的名称', '新建项目', {
      inputPlaceholder: '项目名称...',
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return '项目名称不能为空';
        }
        if (store.projects.some((p) => p.name === value.trim())) {
          return '项目名称已存在';
        }
        return true;
      },
    });
    const { value: projectName } = projectNameResult as { value: string };

    if (projectName) {
      let copyFromCurrent = false;

      if (totalStagesCount.value > 0 || store.yamlInput.trim()) {
        try {
          await ElMessageBox.confirm('是否复制当前项目的内容到新项目？', '创建选项', {
            confirmButtonText: '复制内容',
            cancelButtonText: '创建空项目',
            distinguishCancelAndClose: true,
            type: 'info',
          });
          copyFromCurrent = true;
        } catch (action) {
          if (action === 'cancel') {
            copyFromCurrent = false;
          } else {
            return; // 用户关闭了对话框
          }
        }
      }

      store.createProject(projectName.trim(), copyFromCurrent);
      ElMessage.success('项目创建成功');
    }
  } catch {
  }
}

async function handleSwitchProject(projectId: string) {
  try {
    await ElMessageBox.confirm('切换项目会保存当前项目的更改，确定继续吗？', '确认切换项目', {
      type: 'info',
    });

    store.switchProject(projectId);
    ElMessage.success('项目切换成功');
  } catch {
  }
}

function handleRenameCurrentProject() {
  if (store.currentProject && currentProjectForm.value.name !== store.currentProject.name) {
    const newName = currentProjectForm.value.name.trim();
    if (newName) {
      const isDuplicate = store.projects.some((p) => p.id !== store.currentProjectId && p.name === newName);

      if (isDuplicate) {
        ElMessage.error('项目名称已存在');
        currentProjectForm.value.name = store.currentProject.name;
        return;
      }

      store.renameProject(store.currentProjectId, newName);
      ElMessage.success('项目名称已更新');
    } else {
      currentProjectForm.value.name = store.currentProject.name;
    }
  }
}

async function handleDeleteCurrentProject() {
  if (!store.currentProject) return;

  try {
    await ElMessageBox.confirm(`确定要删除项目 "${store.currentProject.name}" 吗？此操作不可恢复 `, '确认删除', {
      type: 'warning',
    });

    store.deleteProject(store.currentProjectId);
    ElMessage.success('项目已删除');
    showProjectDialog.value = false;
  } catch {
  }
}

async function handleDeleteProject(projectId: string) {
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return;

  try {
    await ElMessageBox.confirm(`确定要删除项目 "${project.name}" 吗？此操作不可恢复 `, '确认删除', {
      type: 'warning',
    });

    store.deleteProject(projectId);
    ElMessage.success('项目已删除');
  } catch {
  }
}


function handleSchemeChange(schemeId: string) {
  if (schemeId === store.currentSchemeId) return;

  store.switchStageScheme(schemeId);
  ElMessage.success('方案切换成功');
}

async function handleSaveCurrentAsScheme() {
  try {
    const schemeNameResult = await ElMessageBox.prompt('请输入方案名称', '保存方案', {
      inputPlaceholder: '方案名称...',
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return '方案名称不能为空';
        }
        if (store.currentProjectSchemes.some((s) => s.name === value.trim())) {
          return '方案名称已存在';
        }
        return true;
      },
    });
    const { value: schemeName } = schemeNameResult as { value: string };

    if (schemeName) {
      const newSchemeId = store.saveCurrentAsNewScheme(schemeName.trim());
      if (newSchemeId) {
        ElMessage.success('方案保存成功');
        store.switchStageScheme(newSchemeId);
      }
    }
  } catch {
  }
}

async function handleRenameScheme(schemeId: string) {
  const scheme = store.currentProjectSchemes.find((s) => s.id === schemeId);
  if (!scheme) return;

  try {
    const renameSchemeResult = await ElMessageBox.prompt('请输入新的方案名称', '重命名方案', {
      inputValue: scheme.name,
      inputPlaceholder: '方案名称...',
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return '方案名称不能为空';
        }
        if (value.trim() === scheme.name) {
          return '方案名称未更改';
        }
        if (store.currentProjectSchemes.some((s) => s.id !== schemeId && s.name === value.trim())) {
          return '方案名称已存在';
        }
        return true;
      },
    });
    const { value: newName } = renameSchemeResult as { value: string };

    if (newName && newName.trim() !== scheme.name) {
      store.renameStageScheme(schemeId, newName.trim());
      ElMessage.success('方案重命名成功');
    }
  } catch {
  }
}

async function handleCopyScheme(schemeId: string) {
  const scheme = store.currentProjectSchemes.find((s) => s.id === schemeId);
  if (!scheme) return;

  try {
    const copySchemeResult = await ElMessageBox.prompt('请输入新方案名称', '复制方案', {
      inputValue: `${scheme.name} 副本`,
      inputPlaceholder: '方案名称...',
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return '方案名称不能为空';
        }
        if (store.currentProjectSchemes.some((s) => s.name === value.trim())) {
          return '方案名称已存在';
        }
        return true;
      },
    });
    const { value: newName } = copySchemeResult as { value: string };

    if (newName) {
      const newSchemeId = store.copyStageScheme(schemeId, newName.trim());
      if (newSchemeId) {
        ElMessage.success('方案复制成功');
      }
    }
  } catch {
  }
}

async function handleDeleteScheme(schemeId: string) {
  const scheme = store.currentProjectSchemes.find((s) => s.id === schemeId);
  if (!scheme) return;

  try {
    await ElMessageBox.confirm(`确定要删除方案 "${scheme.name}" 吗？此操作不可恢复 `, '确认删除', {
      type: 'warning',
    });

    store.deleteStageScheme(schemeId);
    ElMessage.success('方案已删除');
  } catch {
  }
}
</script>

<style scoped>
.project-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.project-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.selector-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.project-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.project-date {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.project-info {
  padding: 8px 12px;
  background: var(--el-fill-color-extra-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
}

.project-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.project-title h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.project-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.project-management {
  max-height: 500px;
  overflow-y: auto;
}

.current-project-edit h5,
.all-projects h5 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.project-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-scheme-section {
  margin-top: -2px;
}

.scheme-content {
  padding: 0;
}

.scheme-meta-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.scheme-quick-actions {
  margin-bottom: 12px;
}

.scheme-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scheme-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.scheme-item:hover {
  border-color: var(--el-color-primary-light-5);
  background-color: var(--el-fill-color-extra-light);
}

.scheme-item.is-active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.scheme-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scheme-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.scheme-meta {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.scheme-actions {
  display: flex;
  gap: 4px;
}

.empty-schemes {
  text-align: center;
  padding: 20px 0;
}

@media (max-width: 768px) {
  .project-meta {
    flex-direction: column;
    gap: 4px;
  }

  .scheme-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .scheme-actions {
    justify-content: flex-end;
  }

  .project-management {
    max-height: none;
    overflow-y: visible;
  }
}
</style>
