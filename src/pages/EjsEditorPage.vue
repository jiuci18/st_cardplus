<template>
  <div class="ejs-editor-page">
    <!-- 错误提示 -->
    <div
      v-if="store.hasErrors"
      class="error-banner"
    >
      <el-alert
        v-for="error in store.errors"
        :key="error.message"
        :title="error.message"
        type="error"
        :closable="false"
        class="mb-2"
      />
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <div
        v-if="isMobileOrTablet"
        class="mobile-layout"
      >
        <div class="mobile-stage-panel">
          <LogicBlockPanel />
        </div>
        <div class="mobile-bookmark-group mobile-bookmark-group--ejs">
          <button
            type="button"
            class="mobile-bookmark-btn"
            :class="{ active: mobileBookmarkTab === 'preview' && mobileDrawerVisible }"
            @click="openMobileDrawer('preview')"
          >
            预览
          </button>
          <button
            type="button"
            class="mobile-bookmark-btn"
            :class="{ active: mobileBookmarkTab === 'simulation' && mobileDrawerVisible }"
            @click="openMobileDrawer('simulation')"
          >
            模拟
          </button>
          <button
            type="button"
            class="mobile-bookmark-btn"
            :class="{ active: mobileBookmarkTab === 'config' && mobileDrawerVisible }"
            @click="openMobileDrawer('config')"
          >
            配置
          </button>
          <button
            type="button"
            class="mobile-bookmark-btn"
            :class="{ active: mobileBookmarkTab === 'project' && mobileDrawerVisible }"
            @click="openMobileDrawer('project')"
          >
            项目
          </button>
        </div>

        <el-drawer
          v-model="mobileDrawerVisible"
          direction="rtl"
          size="88%"
          :with-header="false"
          class="mobile-side-drawer"
        >
          <div class="mobile-drawer-content">
            <el-tabs
              v-model="mobileBookmarkTab"
              class="h-full mobile-bookmark-tabs"
            >
              <el-tab-pane
                label="预览"
                name="preview"
                class="h-full"
              >
                <PreviewPanel />
              </el-tab-pane>
              <el-tab-pane
                label="模拟"
                name="simulation"
                class="h-full"
              >
                <SimulationPanel />
              </el-tab-pane>
              <el-tab-pane
                label="配置"
                name="config"
                class="h-full"
              >
                <div class="mobile-panel mobile-config-panel">
                  <div class="sidebar-actions mobile-sidebar-actions">
                    <el-button-group>
                      <el-button
                        :icon="DocumentAdd"
                        @click="handleImportConfig"
                        size="small"
                      >
                        导入配置
                      </el-button>
                      <el-button
                        :icon="Download"
                        @click="handleExportConfig"
                        size="small"
                      >
                        导出配置
                      </el-button>
                      <el-button
                        :icon="RefreshLeft"
                        @click="handleClearAll"
                        size="small"
                        type="warning"
                      >
                        清空
                      </el-button>
                    </el-button-group>
                  </div>
                  <div class="mobile-config-content">
                    <VariablePanel />
                  </div>
                </div>
              </el-tab-pane>
              <el-tab-pane
                label="项目"
                name="project"
                class="h-full"
              >
                <div class="mobile-panel">
                  <ProjectManager />
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-drawer>
      </div>

      <!-- 桌面端布局 -->
      <splitpanes
        v-else
        class="default-theme"
        :horizontal="false"
      >
        <!-- 项目和方案管理侧边栏 -->
        <pane
          min-size="15"
          size="20"
        >
          <div class="sidebar-panel">
            <div class="sidebar-content">
              <el-tabs
                v-model="activeSidebarTab"
                class="h-full"
              >
                <el-tab-pane
                  label="ejs生成器"
                  name="projects"
                  class="h-full"
                >
                  <ProjectManager />
                </el-tab-pane>
              </el-tabs>
            </div>
            <div class="sidebar-actions">
              <el-button
                @click="toggleCenterPanel"
                :icon="centerPanelVisible ? Hide : View"
                size="small"
              >
                {{ centerPanelVisible ? '隐藏编辑器' : '显示编辑器' }}
              </el-button>
              <el-button-group>
                <el-button
                  :icon="DocumentAdd"
                  @click="handleImportConfig"
                  size="small"
                >
                  导入配置
                </el-button>
                <el-button
                  :icon="Download"
                  @click="handleExportConfig"
                  size="small"
                >
                  导出配置
                </el-button>
                <el-button
                  :icon="RefreshLeft"
                  @click="handleClearAll"
                  size="small"
                  type="warning"
                >
                  清空
                </el-button>
              </el-button-group>
            </div>
          </div>
        </pane>
        <!-- 左侧面板 -->
        <pane
          min-size="20"
          size="50"
        >
          <div class="left-panel">
            <el-tabs
              v-model="activeLeftTab"
              class="h-full"
            >
              <el-tab-pane
                label="变量配置"
                name="variables"
                class="h-full"
              >
                <VariablePanel />
              </el-tab-pane>
              <el-tab-pane
                label="阶段管理"
                name="stages"
                class="h-full"
              >
                <LogicBlockPanel />
              </el-tab-pane>
            </el-tabs>
          </div>
        </pane>
        <pane
          v-if="centerPanelVisible"
          min-size="30"
        >
          <div class="center-panel">
            <div class="panel-header">
              <h3>模板编辑器</h3>
              <div class="header-actions">
                <el-button
                  :icon="CopyDocument"
                  @click="copyToClipboard"
                  size="small"
                  type="primary"
                >
                  复制代码
                </el-button>
                <el-button
                  :icon="RefreshRight"
                  @click="store.generateEjsTemplate"
                  size="small"
                >
                  重新生成
                </el-button>
              </div>
            </div>
            <TemplateEditor />
          </div>
        </pane>
        <pane
          min-size="20"
          size="30"
        >
          <div class="right-panel">
            <el-tabs
              v-model="activeRightTab"
              class="h-full"
            >
              <el-tab-pane
                label="代码预览"
                name="preview"
                class="h-full"
              >
                <PreviewPanel />
              </el-tab-pane>
              <el-tab-pane
                label="模拟测试"
                name="simulation"
                class="h-full"
              >
                <SimulationPanel />
              </el-tab-pane>
            </el-tabs>
          </div>
        </pane>
      </splitpanes>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEjsEditorStore } from '@/composables/ejs/ejsEditor';
import { useDevice } from '@/composables/useDevice';
import { copyToClipboard as copyTextToClipboard } from '@/utils/clipboard';
import { nowIso } from '@/utils/datetime';
import { saveFile } from '@/utils/fileSave';
import { CopyDocument, DocumentAdd, Download, Hide, RefreshLeft, RefreshRight, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Pane, Splitpanes } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { onMounted, ref } from 'vue';

// 组件导入
import LogicBlockPanel from '@/components/ejseditor/LogicBlockPanel.vue';
import PreviewPanel from '@/components/ejseditor/PreviewPanel.vue';
import ProjectManager from '@/components/ejseditor/ProjectManager.vue';
import SimulationPanel from '@/components/ejseditor/SimulationPanel.vue';
import TemplateEditor from '@/components/ejseditor/TemplateEditor.vue';
import VariablePanel from '@/components/ejseditor/VariablePanel.vue';

const store = useEjsEditorStore();
const { isMobileOrTablet } = useDevice();
const activeSidebarTab = ref('projects');
const activeLeftTab = ref('variables');
const activeRightTab = ref('preview');
const centerPanelVisible = ref(false);
const mobileBookmarkTab = ref('preview');
const mobileDrawerVisible = ref(false);

function toggleCenterPanel() {
  centerPanelVisible.value = !centerPanelVisible.value;
}

function openMobileDrawer(tab: 'preview' | 'simulation' | 'config' | 'project') {
  mobileBookmarkTab.value = tab;
  mobileDrawerVisible.value = true;
}

// 工具栏操作
async function handleImportConfig() {
  try {
    const fileResult = await ElMessageBox.prompt('请粘贴配置文件内容 (JSON格式)', '导入配置', {
      inputType: 'textarea',
      inputPlaceholder: '粘贴JSON配置...',
    });
    const { value: file } = fileResult as { value: string };

    if (file) {
      const config = JSON.parse(file);

      // 如果有现有项目，询问用户导入方式
      if (store.projects.length > 0) {
        const importType = await ElMessageBox.confirm('选择导入方式：', '导入配置', {
          confirmButtonText: '创建新项目',
          cancelButtonText: '替换当前项目',
          distinguishCancelAndClose: true,
          type: 'info',
        })
          .then(() => 'new')
          .catch((action: string) => (action === 'cancel' ? 'replace' : null));

        if (importType === 'new') {
          const projectNameResult = await ElMessageBox.prompt('请输入新项目的名称', '新建项目', {
            inputPlaceholder: '项目名称...',
          });
          const { value: projectName } = projectNameResult as { value: string };
          store.importConfig(config, false, projectName);
        } else if (importType === 'replace') {
          store.importConfig(config, true);
        } else {
          return; // 用户取消
        }
      } else {
        // 没有现有项目时直接导入
        store.importConfig(config);
      }

      ElMessage.success('配置导入成功');
    }
  } catch (error) {
    ElMessage.error('配置格式错误，请检查JSON格式');
  }
}

async function handleExportConfig() {
  const config = store.exportConfig();
  const fileName = `ejs-template-${nowIso().slice(0, 10)}.json`;
  await saveFile({
    data: new TextEncoder().encode(JSON.stringify(config, null, 2)),
    fileName,
    mimeType: 'application/json',
  });
  ElMessage.success('配置导出成功');
}

async function handleClearAll() {
  try {
    await ElMessageBox.confirm('确定要清空所有内容吗？此操作不可恢复 ', '确认清空', {
      type: 'warning',
    });
    store.clearAll();
    ElMessage.success('已清空所有内容');
  } catch {
    // 用户取消
  }
}

async function copyToClipboard() {
  if (!store.ejsTemplate) {
    ElMessage.warning('没有可复制的代码');
    return;
  }

  await copyTextToClipboard(store.ejsTemplate, '代码已复制到剪贴板', '复制失败');
}

// 页面加载时的初始化
onMounted(() => {
  // 初始化项目管理
  store.initializeStore();
  // 可以在这里加载本地存储的数据
  const saved = localStorage.getItem('ejs-editor-projects');
  if (saved) {
    try {
      const savedData = JSON.parse(saved);
      if (savedData.projects && Array.isArray(savedData.projects)) {
        store.projects = savedData.projects;
        if (savedData.currentProjectId) {
          store.currentProjectId = savedData.currentProjectId;
          const project = store.projects.find((p) => p.id === savedData.currentProjectId);
          if (project) {
            store.loadProjectState(project);
          }
        }
      }
    } catch {}
  }
});

// 监听状态变化，自动保存到本地存储
import { watch } from 'vue';
let saveStateTimer: NodeJS.Timeout | null = null;

// 监听项目状态变化，自动保存到本地存储
watch(
  [
    () => store.projects.length,
    () => store.currentProjectId,
    () => store.projects.map((p) => `${p.id}-${p.name}-${p.updatedAt}`).join(','),
  ],
  () => {
    if (saveStateTimer) clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => {
      try {
        const saveData = {
          projects: store.projects,
          currentProjectId: store.currentProjectId,
          timestamp: nowIso(),
        };
        localStorage.setItem('ejs-editor-projects', JSON.stringify(saveData));
      } catch {}
      saveStateTimer = null;
    }, 1000); // 1秒防抖，减少保存频率
  },
  { deep: true }
);
</script>

<style scoped>
.ejs-editor-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
}

.error-banner {
  padding: 16px 24px;
  background: var(--el-color-error-light-9);
}

.main-content {
  flex: 1;
  min-height: 0;
}

.sidebar-panel,
.left-panel,
.right-panel,
.center-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  overflow: hidden;
}

.sidebar-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.sidebar-actions :deep(.el-button-group) {
  display: flex;
  width: 100%;
}

.sidebar-actions :deep(.el-button-group .el-button) {
  flex: 1;
  min-width: 0;
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  order: -1; /* 确保 header 在最前面 */
  flex-shrink: 0; /* 防止压缩 */
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* Element Plus 标签页样式覆盖 */
:deep(.el-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__content) {
  flex: 1;
  padding: 0;
  min-height: 0;
}

:deep(.el-tab-pane) {
  height: 100%;
}

:deep(.el-tabs__header) {
  margin: 0;
  border-bottom: 1px solid var(--el-border-color-light);
  padding: 0 16px;
}

:deep(.el-tabs__nav-wrap) {
  padding: 8px 0;
}

:deep(.splitpanes__splitter) {
  background-color: var(--el-border-color-light);
  position: relative;
  z-index: 1;
}

:deep(.splitpanes__splitter:before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  transition: opacity 0.4s;
  background-color: var(--el-color-primary-light-5);
  opacity: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
}

:deep(.splitpanes__splitter:hover:before) {
  opacity: 1;
}

/* 移动端样式 */
.mobile-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px 0 8px 8px;
  position: relative;
}

.mobile-stage-panel {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
  overflow: hidden;
}

.mobile-bookmark-group--ejs {
  top: 50%;
  transform: translateY(-50%);
}

.mobile-drawer-content {
  height: 100%;
  overflow: hidden;
}

.mobile-bookmark-tabs {
  height: 100%;
}

.mobile-bookmark-tabs :deep(.el-tabs__header) {
  padding: 0 12px;
}

:deep(.mobile-side-drawer .el-drawer__body) {
  padding: 0;
  overflow: hidden;
}

.mobile-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--el-bg-color);
  -webkit-overflow-scrolling: touch;
}

.mobile-config-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 8px;
  padding: 8px;
}

.mobile-config-content {
  flex: 1;
  min-height: 180px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.mobile-sidebar-actions {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px;
}

@media screen and (max-width: 768px) {
  .sidebar-actions {
    padding: 10px 12px;
  }

  .mobile-sidebar-actions :deep(.el-button-group) {
    gap: 6px;
  }
}

/* 平板端样式调整 */
@media screen and (min-width: 769px) and (max-width: 1024px) {
  .mobile-panel {
    padding: 0 8px;
  }
}
</style>
