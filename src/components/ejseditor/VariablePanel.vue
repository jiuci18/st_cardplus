<template>
  <div class="variable-panel">
    <div class="panel-content">
      <div class="section">
        <div
          class="section-header"
          :class="{ 'mobile-header': isMobile }"
        >
          <h4 class="section-title">变量定义</h4>
          <el-radio-group
            v-model="store.variableEditMode"
            :size="isMobile ? 'small' : 'small'"
          >
            <el-radio-button value="yaml">YAML</el-radio-button>
            <el-radio-button value="tree">节点树</el-radio-button>
          </el-radio-group>
        </div>

        <div v-if="store.variableEditMode === 'yaml'">
          <div class="yaml-input-section">
            <el-input
              v-model="store.yamlInput"
              type="textarea"
              placeholder="粘贴YAML格式的变量定义...&#10;例如:&#10;世界:&#10;  日期: [0, '记录故事天数']&#10;角色:&#10;  狼蛛:&#10;    好感度: [0, '角色好感度']"
              class="yaml-textarea"
            />
            <div
              class="yaml-actions"
              :class="{ 'mobile-actions': isMobile }"
            >
              <el-button
                type="primary"
                @click="store.importYamlVariables"
                :disabled="!store.yamlInput.trim()"
                :size="isMobile ? 'small' : 'small'"
                class="action-button"
              >
                解析变量
              </el-button>
              <el-button
                @click="clearYaml"
                :size="isMobile ? 'small' : 'small'"
                class="action-button"
              >
                清空
              </el-button>
              <el-button
                @click="showExample"
                :size="isMobile ? 'small' : 'small'"
                type="info"
                class="action-button"
              >
                示例
              </el-button>
            </div>
          </div>
          <div
            v-if="store.variableTree.length > 0"
            class="variable-tree-readonly"
          >
            <h5 class="subsection-title">解析结果预览</h5>
            <VariableTreeNode
              v-for="node in store.variableTree"
              :key="node.path"
              :node="node"
              @select-variable="selectVariable"
            />
          </div>
        </div>

        <div v-if="store.variableEditMode === 'tree'">
          <div class="tree-actions">
            <el-button
              @click="store.addNode(null)"
              :size="isMobile ? 'small' : 'small'"
            >
              添加根节点
            </el-button>
          </div>
          <div class="variable-tree-editable">
            <div
              v-if="store.variableTree.length === 0"
              class="empty-tree"
            >
              <el-text type="info">没有变量，请点击上方按钮添加根节点</el-text>
            </div>
            <EditableVariableTreeNode
              v-for="node in store.variableTree"
              :key="node.path"
              :node="node"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { useEjsEditorStore } from '@/composables/ejs/ejsEditor';
import { useDevice } from '@/composables/useDevice';
import VariableTreeNode from './VariableTreeNode.vue';
import EditableVariableTreeNode from './EditableVariableTreeNode.vue';
import { watch } from 'vue';
import type { VariableNode } from '@/types/ejs-editor';

const store = useEjsEditorStore();
const { isMobile } = useDevice();

watch(
  () => store.variableEditMode,
  (newMode) => {
    if (newMode === 'tree' && store.yamlInput.trim() && store.variableTree.length === 0) {
      store.importYamlVariables();
    }
  }
);

function clearYaml() {
  store.yamlInput = '';
  store.variableTree = [];
}

function showExample() {
  store.yamlInput = `世界:
  日期: [0, 记录故事从开局经过的天数]
  地点: [拉库拾, 字符串：记录当前的位置]
角色:
  狼蛛:
    好感度: [0, 数字：负责好感度]
剧情:
  剧情阶段: [0, 数字：0 为初始值，参考剧情条目更新]
  日常事件计数: [0]
  任务次数计数: [0]
  被摸耳朵计数: [0]
  被摸尾巴计数: [0]`;
  store.importYamlVariables();
}

function selectVariable(node: VariableNode) {
  if (!node.children) {
    const readablePath = store.getReadablePath(node);
    if (readablePath) {
      ElMessage.success(`已选择变量: ${readablePath}`);
    }
  }
}
</script>

<style scoped>
.variable-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.section {
  margin-bottom: 24px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.help-icon {
  color: var(--el-color-info);
  cursor: help;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.yaml-input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.yaml-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.yaml-textarea :deep(.el-textarea__inner) {
  height: 50vh;
  height: 50dvh;
}

.yaml-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.variable-tree-readonly {
  margin-top: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 8px;
  background: var(--el-bg-color-page);
  max-height: 720px;
  overflow-y: auto;
}

.subsection-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  margin: 0 0 8px 0;
}

.tree-actions {
  margin-bottom: 12px;
}

.variable-tree-editable {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 12px;
  background: var(--el-bg-color-page);
}

.empty-tree {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media screen and (max-width: 768px) {
  .variable-panel {
    padding: 8px 12px;
  }

  .section {
    margin-bottom: 16px;
  }

  .mobile-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .mobile-header .section-title {
    text-align: center;
    margin-bottom: 4px;
  }

  .mobile-actions {
    justify-content: center;
  }

  .action-button {
    flex: 1;
    min-width: 0;
    max-width: 120px;
  }

  .yaml-textarea :deep(.el-textarea__inner) {
    font-size: 12px;
  }

  .variable-tree-readonly {
    max-height: 300px;
    margin-top: 12px;
  }

  .variable-tree-editable {
    padding: 8px;
  }

  .content-textarea :deep(.el-textarea__inner) {
    font-size: 14px;
  }
}

@media screen and (min-width: 769px) and (max-width: 1024px) {
  .variable-panel {
    padding: 12px 16px;
  }

  .variable-tree-readonly {
    max-height: 400px;
  }
}
</style>
