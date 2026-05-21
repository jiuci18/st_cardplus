<template>
  <div class="regex-editor-page">
    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 移动端布局 -->
      <div v-if="isMobileOrTablet" class="mobile-layout">
        <div class="mobile-nav">
          <el-segmented v-model="mobileActivePanel" :options="[
            { label: '脚本', value: 'scripts' },
            { label: '编辑', value: 'editor' },
            { label: '模拟', value: 'simulator' },
          ]" size="small" />
        </div>
        <div class="mobile-panel-content">
          <div v-show="mobileActivePanel === 'scripts'" class="mobile-panel mobile-scripts-panel">
            <div class="mobile-scripts-content">
              <RegexScriptList :collection="regexCollection" :active-category-id="activeCategoryId"
                :selected-script="selectedScript" :drag-drop-handlers="dragDropHandlers"
                @select-category="handleSelectCategory" @select-script="handleSelectScript"
                @create-category="handleCreateCategory" @rename-category="handleRenameCategory"
                @delete-category="handleDeleteCategory" @add-script="handleAddScript"
                @rename-script="handleRenameScript" @delete-script="handleDeleteScript"
                @export-script="handleExportSingleScript" />
            </div>
            <div class="sidebar-actions mobile-sidebar-actions">
              <el-button-group>
                <el-button :icon="DocumentAdd" @click="handleImportScript" size="small">
                  导入脚本
                </el-button>
                <el-button :icon="Download" @click="handleExportScript" size="small" :disabled="!selectedScriptId">
                  导出脚本
                </el-button>
                <el-button :icon="Plus" @click="handleCreateScript" size="small" type="primary">
                  新建
                </el-button>
              </el-button-group>
            </div>
          </div>
          <div v-show="mobileActivePanel === 'editor'" class="mobile-panel">
            <div v-if="selectedScriptId" class="mobile-editor-content">
              <el-form :model="formState" label-position="top">
                <RegexEditorCore v-model:script-name="formState.scriptName" v-model:find-regex="formState.findRegex"
                  v-model:replace-string="formState.replaceString" v-model:trim-strings="trimStrings"
                  v-model:substitute-regex="formState.substituteRegex" />
                <SmartRegexGenerator v-model:input-text="smartInputText" @regex-generated="handleSmartRegexGenerated" />
                <RegexAdvancedSettings v-model="formState" />
              </el-form>
            </div>
            <div v-else class="empty-state">
              <Icon icon="ph:note-pencil-duotone" class="empty-icon" />
              <p>请先选择或创建一个脚本</p>
            </div>
          </div>
          <div v-show="mobileActivePanel === 'simulator'" class="mobile-panel">
            <div v-if="selectedScriptId" class="mobile-simulator-content">
              <el-form label-position="top">
                <RegexSimulatorPanel v-model:test-string="testString" v-model:render-html="renderHtml"
                  v-model:user-macro-value="userMacroValue" v-model:char-macro-value="charMacroValue"
                  :simulated-result="simulatedResult" />
              </el-form>
            </div>
            <div v-else class="empty-state">
              <Icon icon="ph:test-tube-duotone" class="empty-icon" />
              <p>请先选择或创建一个脚本</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 桌面端布局 -->
      <splitpanes v-else class="default-theme desktop-splitpanes" :horizontal="false">
        <!-- 脚本列表侧边栏 -->
        <pane min-size="10" :size="15">
          <div class="sidebar-panel">
            <div class="sidebar-content">
              <RegexScriptList :collection="regexCollection" :active-category-id="activeCategoryId"
                :selected-script="selectedScript" :drag-drop-handlers="dragDropHandlers"
                @select-category="handleSelectCategory" @select-script="handleSelectScript"
                @create-category="handleCreateCategory" @rename-category="handleRenameCategory"
                @delete-category="handleDeleteCategory" @add-script="handleAddScript"
                @rename-script="handleRenameScript" @delete-script="handleDeleteScript"
                @export-script="handleExportSingleScript" />
            </div>
            <div class="sidebar-actions">
              <el-button @click="toggleTesterPanel" :icon="testerPanelVisible ? Hide : View" size="small">
                {{ testerPanelVisible ? '隐藏测试器' : '显示测试器' }}
              </el-button>
              <el-button-group>
                <el-button :icon="DocumentAdd" @click="handleImportScript" size="small">
                  导入脚本
                </el-button>
                <el-button :icon="Download" @click="handleExportScript" size="small" :disabled="!selectedScriptId">
                  导出脚本
                </el-button>
                <el-button :icon="Plus" @click="handleCreateScript" size="small" type="primary">
                  新建
                </el-button>
              </el-button-group>
            </div>
          </div>
        </pane>

        <pane :min-size="testerPanelVisible ? 40 : 75" :size="testerPanelVisible ? 60 : 85">
          <div class="editor-panel">
            <div v-if="selectedScriptId" class="panel-content">
              <div class="panel-header">
                <h3>规则编辑器</h3>
                <el-text v-if="!isEditingName" type="info" size="small" @click="startEditingName"
                  class="editable-script-name">
                  {{ formState.scriptName || '未命名规则' }}
                  <Icon icon="ph:pencil-simple-duotone" class="edit-icon" />
                </el-text>
                <el-input v-else ref="scriptNameInput" v-model="formState.scriptName" size="small"
                  @blur="finishEditingName" @keyup.enter="finishEditingName" placeholder="请输入规则名称" />
              </div>
              <div class="panel-scroll">
                <el-form :model="formState" label-position="top" class="editor-form">
                  <RegexEditorCore v-model:script-name="formState.scriptName" v-model:find-regex="formState.findRegex"
                    v-model:replace-string="formState.replaceString" v-model:trim-strings="trimStrings"
                    v-model:substitute-regex="formState.substituteRegex" />
                  <el-divider content-position="left">智能生成</el-divider>
                  <SmartRegexGenerator v-model:input-text="smartInputText"
                    @regex-generated="handleSmartRegexGenerated" />
                  <el-divider content-position="left">高级设置</el-divider>
                  <RegexAdvancedSettings v-model="formState" />
                </el-form>
              </div>
            </div>
            <div v-else class="welcome-screen">
              <Icon icon="ph:files-duotone" class="welcome-icon" />
              <h2 class="welcome-title">欢迎使用正则编辑器</h2>
              <p class="welcome-text">从左侧列表选择一个脚本开始编辑，或创建一个新脚本。</p>
              <el-button type="primary" @click="handleCreateScript">
                <Icon icon="ph:plus-circle-duotone" style="margin-right: 8px" />
                创建新脚本
              </el-button>
            </div>
          </div>
        </pane>

        <!-- 模拟测试面板 -->
        <pane :min-size="testerPanelVisible ? 15 : 0" :size="testerPanelVisible ? 25 : 0">
          <div class="simulator-panel">
            <div v-if="selectedScriptId" class="panel-content">
              <div class="panel-header">
                <h3>模拟测试</h3>
                <el-text type="info" size="small">
                  实时查看正则表达式的匹配和替换效果
                </el-text>
              </div>
              <div class="panel-scroll">
                <el-form label-position="top" class="simulator-form">
                  <RegexSimulatorPanel v-model:test-string="testString" v-model:render-html="renderHtml"
                    v-model:user-macro-value="userMacroValue" v-model:char-macro-value="charMacroValue"
                    :simulated-result="simulatedResult" />
                </el-form>
              </div>
            </div>
            <div v-else class="welcome-screen">
              <Icon icon="ph:test-tube-duotone" class="welcome-icon" />
              <h2 class="welcome-title">准备测试</h2>
              <p class="welcome-text">选择一个脚本后，您可以在此进行模拟测试。</p>
            </div>
          </div>
        </pane>
      </splitpanes>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type SillyTavernRegexScript } from '@/composables/regex/types';
import { useRegexCollection } from '@/composables/regex/useRegexCollection';
import { useRegexDragDrop } from '@/composables/regex/useRegexDragDrop';
import { useRegexSimulator } from '@/composables/regex/useRegexSimulator';
import { useDevice } from '@/composables/useDevice';
import { nowIso } from '@/utils/datetime';
import { saveFile } from '@/utils/fileSave';
import { DocumentAdd, Download, Hide, Plus, View } from '@element-plus/icons-vue';
import { Icon } from '@iconify/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Pane, Splitpanes } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { computed, nextTick, ref, watch } from 'vue';

// 组件导入
import RegexAdvancedSettings from '@/components/regex/RegexAdvancedSettings.vue';
import RegexEditorCore from '@/components/regex/RegexEditorCore.vue';
import RegexScriptList from '@/components/regex/RegexScriptList.vue';
import RegexSimulatorPanel from '@/components/regex/RegexSimulatorPanel.vue';
import SmartRegexGenerator from '@/components/regex/Selector/SmartRegexGenerator.vue';

const { isMobileOrTablet } = useDevice();
const testerPanelVisible = ref(true);
const mobileActivePanel = ref('scripts');

// 使用新的集合管理
const {
  regexCollection,
  activeCategoryId,
  activeCategory,
  handleSelectCategory,
  handleCreateCategory: createCategory,
  handleRenameCategory: renameCategory,
  handleDeleteCategory: deleteCategory,
  handleCreateScript: createScriptInCategory,
  handleUpdateScript: updateScript,
  handleDeleteScript: deleteScriptFromCollection,
  moveScriptBetweenCategories,
  updateCategoryScripts,
  saveToStorage,
} = useRegexCollection();

// 拖拽功能
const dragDropHandlers = useRegexDragDrop(regexCollection, moveScriptBetweenCategories, updateCategoryScripts);

const handleCreateCategory = createCategory;
const handleRenameCategory = renameCategory;
const handleDeleteCategory = deleteCategory;
const selectedScript = ref<SillyTavernRegexScript | null>(null);
const selectedScriptId = computed(() => selectedScript.value?.id ?? null);

const createDefaultScript = (): SillyTavernRegexScript => ({
  id: `new-script-${Date.now()}`,
  scriptName: '新规则',
  findRegex: '',
  replaceString: '',
  trimStrings: [],
  placement: [],
  disabled: false,
  markdownOnly: false,
  promptOnly: false,
  runOnEdit: false,
  substituteRegex: 0,
  minDepth: null,
  maxDepth: null,
});

const formState = ref<SillyTavernRegexScript>(createDefaultScript());
const trimStrings = ref('');
const smartInputText = ref('');
const renderHtml = ref(false);
const userMacroValue = ref('测试用户');
const charMacroValue = ref('测试角色');

const isEditingName = ref(false);
const scriptNameInput = ref<any>(null);

function startEditingName() {
  isEditingName.value = true;
  nextTick(() => {
    scriptNameInput.value?.focus();
  });
}

function finishEditingName() {
  isEditingName.value = false;
  if (!formState.value.scriptName) {
    formState.value.scriptName = '未命名规则';
  }
  // 保存脚本名称更新
  if (selectedScript.value) {
    updateScript(selectedScript.value.id, { scriptName: formState.value.scriptName });
  }
}

// 工具栏操作
function toggleTesterPanel() {
  testerPanelVisible.value = !testerPanelVisible.value;
}

async function handleImportScript() {
  if (!activeCategory.value) {
    ElMessage.warning('请先选择一个类别');
    return;
  }

  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        
        const scriptsToParse = Array.isArray(jsonData) ? jsonData : [jsonData];
        const newScripts = scriptsToParse.map((script: any, index: number) => ({
          ...createDefaultScript(),
          ...script,
          id: `imported-script-${Date.now()}-${index}`,
          scriptName: script.scriptName || `导入的规则 ${index + 1}`,
          categoryId: activeCategory.value!.id,
        }));

        if (newScripts.length > 0) {
          activeCategory.value!.scripts.push(...newScripts);
          activeCategory.value!.updatedAt = nowIso();

          saveToStorage();
          selectedScript.value = newScripts[0];
          loadSelectedScript();
          const message = newScripts.length === 1 ? '成功导入 1 条规则' : `成功导入 ${newScripts.length} 条规则`;
          ElMessage.success(message);
        }
      } catch (error) {
        console.error('[导入脚本] 导入失败：', error);
        ElMessage.error('导入失败，检查控制台');
      }
    };

    input.click();
  } catch (error) {
    console.error('[导入脚本] 操作失败：', error);
    ElMessage.error('导入失败');
  }
}

async function handleExportScript() {
  if (!selectedScript.value) return;

  try {
    const scriptToExport = { ...selectedScript.value };
    scriptToExport.trimStrings = trimStrings.value.split('\n').filter((s) => s.length > 0);

    if (scriptToExport.minDepth === null) delete scriptToExport.minDepth;
    if (scriptToExport.maxDepth === null) delete scriptToExport.maxDepth;
    delete scriptToExport.categoryId;

    const jsonString = JSON.stringify(scriptToExport, null, 2);
    await saveFile({
      data: new TextEncoder().encode(jsonString),
      fileName: `${scriptToExport.scriptName.replace(/[\s./\\?*]/g, '_') || 'regex-script'}.json`,
      mimeType: 'application/json',
    });
    ElMessage.success('导出成功!');
  } catch (error) {
    ElMessage.error('导出失败!');
  }
}

async function handleExportSingleScript(scriptId: string) {
  // 在所有类别中查找该脚本
  let script: SillyTavernRegexScript | undefined;
  for (const category of Object.values(regexCollection.value.categories)) {
    script = category.scripts.find((s) => s.id === scriptId);
    if (script) break;
  }

  if (!script) {
    ElMessage.error('未找到要导出的脚本');
    return;
  }

  try {
    const cleanScript = { ...script };
    delete cleanScript.categoryId;
    const jsonString = JSON.stringify(cleanScript, null, 2);
    await saveFile({
      data: new TextEncoder().encode(jsonString),
      fileName: `${cleanScript.scriptName.replace(/[\s./\\?*]/g, '_') || 'regex-script'}.json`,
      mimeType: 'application/json',
    });
    ElMessage.success(`脚本 "${cleanScript.scriptName}" 导出成功!`);
  } catch (error) {
    ElMessage.error('导出失败!');
  }
}

function handleCreateScript() {
  if (!activeCategory.value) {
    ElMessage.warning('请先选择一个类别');
    return;
  }
  const scriptName = `新规则 ${activeCategory.value.scripts.length + 1}`;
  const newScript = createScriptInCategory(scriptName);

  if (newScript) {
    selectedScript.value = newScript;
    loadSelectedScript();
    mobileActivePanel.value = 'editor';
    ElMessage.success('已创建新脚本');
  }
}

function handleAddScript(categoryId: string) {
  handleSelectCategory(categoryId);
  nextTick(() => {
    handleCreateScript();
  });
}

function handleSelectScript(categoryId: string, scriptIndex: number) {
  handleSelectCategory(categoryId);
  if (activeCategory.value && activeCategory.value.scripts[scriptIndex]) {
    selectedScript.value = activeCategory.value.scripts[scriptIndex];
    loadSelectedScript();
    mobileActivePanel.value = 'editor';
  }
}

function loadSelectedScript() {
  if (!selectedScript.value) {
    formState.value = createDefaultScript();
    trimStrings.value = '';
    return;
  }

  Object.assign(formState.value, createDefaultScript(), selectedScript.value);
  trimStrings.value = (selectedScript.value.trimStrings || []).join('\n');
}

async function handleRenameScript(scriptId: string) {
  // 在所有类别中查找该脚本
  let script: SillyTavernRegexScript | undefined;
  for (const category of Object.values(regexCollection.value.categories)) {
    script = category.scripts.find((s) => s.id === scriptId);
    if (script) break;
  }

  if (!script) {
    ElMessage.error('未找到要重命名的脚本');
    return;
  }

  try {
    const renameResult = await ElMessageBox.prompt('请输入新的脚本名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: script.scriptName,
      inputValidator: (val) => !!val || '名称不能为空',
    });
    const { value } = renameResult as { value: string };

    updateScript(scriptId, { scriptName: value });
    if (selectedScript.value?.id === scriptId) {
      formState.value.scriptName = value;
      selectedScript.value.scriptName = value;
    }
    ElMessage.success('重命名成功');
  } catch {
    // Cancelled
  }
}

async function handleDeleteScript(scriptId: string) {
  await deleteScriptFromCollection(scriptId);

  // 如果删除的是当前选中的脚本，清空选择
  if (selectedScript.value?.id === scriptId) {
    selectedScript.value = null;
    formState.value = createDefaultScript();
    trimStrings.value = '';
  }
}

// 正则模拟
const macros = computed(() => ({
  '{{user}}': userMacroValue.value,
  '{{char}}': charMacroValue.value,
}));

const regexScript = computed(() => ({
  findRegex: formState.value.findRegex,
  replaceString: formState.value.replaceString,
  macros: macros.value,
  trimStrings: trimStrings.value.split('\n').filter((s) => s.length > 0),
  substituteRegex: formState.value.substituteRegex ?? 0,
}));

const { testString, simulatedResult } = useRegexSimulator(regexScript);

function handleSmartRegexGenerated({ regex, replaceString }: { regex: string; replaceString: string }) {
  formState.value.findRegex = regex;
  formState.value.replaceString = replaceString;
  testString.value = smartInputText.value;
  mobileActivePanel.value = 'simulator';
}
let saveTimer: NodeJS.Timeout | null = null;

watch(
  () => [
    formState.value.scriptName,
    formState.value.findRegex,
    formState.value.replaceString,
    trimStrings.value,
    formState.value.disabled,
    formState.value.markdownOnly,
    formState.value.promptOnly,
    formState.value.runOnEdit,
    formState.value.substituteRegex,
    formState.value.minDepth,
    formState.value.maxDepth,
  ],
  () => {
    if (!selectedScript.value) return;

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (selectedScript.value && activeCategory.value) {
        const scriptIndex = activeCategory.value.scripts.findIndex((s) => s.id === selectedScript.value!.id);
        if (scriptIndex !== -1) {
          const updatedScript = {
            ...formState.value,
            trimStrings: trimStrings.value.split('\n').filter((s) => s.length > 0),
            categoryId: activeCategory.value.id,
          };
          activeCategory.value.scripts[scriptIndex] = updatedScript;
          selectedScript.value = updatedScript;
          activeCategory.value.updatedAt = nowIso();
          saveToStorage();
        }
      }
      saveTimer = null;
    }, 1000);
  },
  { deep: true }
);
</script>

<style scoped>
.regex-editor-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
}

.sidebar-panel {
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

.main-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-panel,
.editor-panel,
.simulator-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  overflow: hidden;
}

.panel-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
  background: var(--el-bg-color);
}

.editable-script-name {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.editable-script-name .edit-icon {
  opacity: 0;
  transition: opacity 0.2s;
}

.editable-script-name:hover .edit-icon {
  opacity: 1;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  -webkit-overflow-scrolling: touch;
}

.editor-form,
.simulator-form {
  max-width: 100%;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  color: var(--el-text-color-secondary);
  background-color: var(--el-bg-color-page);
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 24px;
  color: var(--el-text-color-placeholder);
}

.welcome-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.welcome-text {
  font-size: 16px;
  margin-bottom: 24px;
  text-align: center;
}

/* Splitpanes 样式 */
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

.desktop-splitpanes .simulator-panel {
  min-width: 280px;
}

.desktop-splitpanes :deep(.splitpanes__pane) {
  overflow: hidden;
}

/* 移动端样式 */
.mobile-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mobile-nav {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  flex-shrink: 0;
}

.mobile-panel-content {
  flex: 1;
  overflow: hidden;
}

.mobile-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--el-bg-color);
  -webkit-overflow-scrolling: touch;
}

.mobile-scripts-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mobile-scripts-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.mobile-sidebar-actions {
  border-top: 1px solid var(--el-border-color-light);
}

.mobile-editor-content,
.mobile-simulator-content {
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  color: var(--el-text-color-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: var(--el-text-color-placeholder);
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* 移动端工具栏优化 */
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
  .mobile-nav {
    padding: 16px 20px;
  }

  .mobile-panel {
    padding: 0 8px;
  }
}
</style>
