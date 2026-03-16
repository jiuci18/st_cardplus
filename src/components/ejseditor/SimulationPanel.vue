<template>
  <div class="simulation-panel">
    <div class="panel-content">
      <div
        class="simulation-header"
        :class="{ 'mobile-header': isMobile }"
      >
        <h4 class="section-title">模拟测试</h4>
        <el-tooltip
          content="通过输入不同的变量值来测试模板输出"
          placement="top"
        >
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>

      <div class="simulation-controls">
        <div
          v-if="store.flatVariables.length === 0"
          class="empty-state"
        >
          <el-text type="info">没有可模拟的变量</el-text>
          <el-text
            type="info"
            size="small"
          >
            请先在“变量定义”中添加变量
          </el-text>
        </div>

        <div v-else>
          <div class="add-variable-section">
            <el-select
              v-model="variableToAdd"
              placeholder="选择要模拟的变量"
              filterable
              style="flex-grow: 1"
            >
              <el-option
                v-for="variable in availableVariables"
                :key="variable.id"
                :label="variable.alias"
                :value="variable.readablePath"
              >
                <span style="float: left">{{ variable.alias }}</span>
                <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
                  {{ variable.readablePath }}
                </span>
              </el-option>
            </el-select>
            <el-button
              @click="addVariable"
              :disabled="!variableToAdd"
            >
              添加
            </el-button>
          </div>

          <div class="simulated-variables-list">
            <div
              v-if="Object.keys(store.simulationValues).length === 0"
              class="no-sim-vars"
            >
              <el-text
                type="info"
                size="small"
              >
                请从上方添加变量进行模拟
              </el-text>
            </div>
            <div
              v-else
              v-for="variable in simulatedVariables"
              :key="variable.id"
              class="form-item"
            >
              <label>
                {{ variable.alias || '变量' }}
                <el-text
                  type="info"
                  size="small"
                >
                  ({{ variable.readablePath }})
                </el-text>
              </label>
              <div class="input-with-delete">
                <el-input
                  v-model="store.simulationValues[`stat_data.${variable.readablePath}`]"
                  style="width: 100%"
                  :placeholder="`输入 ${variable.alias} 的测试值`"
                />
                <el-button
                  :icon="Delete"
                  @click="removeVariable(`stat_data.${variable.readablePath}`)"
                  circle
                  plain
                  type="danger"
                  class="delete-btn"
                />
              </div>
            </div>
          </div>
        </div>

        <el-button
          type="primary"
          @click="store.testSimulation"
          :disabled="!store.ejsTemplate"
          :icon="VideoPlay"
          :size="isMobile ? 'default' : 'default'"
          style="width: 100%; margin-top: 10px"
        >
          {{ isMobile ? '运行测试' : '运行测试' }}
        </el-button>
      </div>

      <div class="test-result">
        <h5>输出结果</h5>
        <div class="result-container">
          <div
            v-if="!store.testResult && !store.ejsTemplate"
            class="empty-result"
          >
            <el-empty
              description="请先配置模板"
              :image-size="60"
            >
              <el-text type="info">需要先设置变量路径和阶段，生成模板后才能进行测试</el-text>
            </el-empty>
          </div>

          <div
            v-else-if="!store.testResult"
            class="no-result"
          >
            <el-text type="info">点击"运行测试"查看输出结果</el-text>
          </div>

          <div
            v-else
            class="result-content"
          >
            <pre>{{ store.testResult }}</pre>
          </div>
        </div>
      </div>

      <div
        v-if="allStages.length > 0"
        class="stage-comparison"
      >
        <h5>所有阶段一览</h5>
        <div class="comparison-table">
          <div
            v-for="(stage, index) in allStages"
            :key="stage.id"
            class="comparison-row"
            :class="{ 'is-matched': isStageMatched(stage) }"
          >
            <div class="row-index">{{ index + 1 }}</div>
            <div class="row-name">{{ stage.name }}</div>
            <div class="row-condition">{{ formatStageConditions(stage) }}</div>
            <div class="row-status">
              <el-tag
                v-if="isStageMatched(stage)"
                type="success"
                size="small"
              >
                匹配
              </el-tag>
              <el-tag
                v-else
                type="info"
                size="small"
              >
                未匹配
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEjsEditorStore } from '@/composables/ejs/ejsEditor';
import { formatStageConditions, matchesStage } from '@/composables/ejs/stageConditions';
import { useDevice } from '@/composables/useDevice';
import type { Stage } from '@/types/ejs-editor';
import { Delete, QuestionFilled, VideoPlay } from '@element-plus/icons-vue';
import { computed, ref } from 'vue';

const store = useEjsEditorStore();
const { isMobile } = useDevice();
const variableToAdd = ref<string | null>(null);

const allStages = computed(() => store.logicBlocks.flatMap((block) => block.stages));

const availableVariables = computed(() => {
  const simulatedPaths = Object.keys(store.simulationValues);
  return store.flatVariables.filter((v) => {
    const statDataPath = `stat_data.${v.readablePath}`;
    return !simulatedPaths.includes(v.readablePath) && !simulatedPaths.includes(statDataPath);
  });
});

const simulatedVariables = computed(() => {
  const simulatedPaths = Object.keys(store.simulationValues);
  return store.flatVariables.filter((v) => {
    const statDataPath = `stat_data.${v.readablePath}`;
    return simulatedPaths.includes(v.readablePath) || simulatedPaths.includes(statDataPath);
  });
});

function addVariable() {
  if (variableToAdd.value) {
    // 如果变量路径不包含stat_data前缀，则添加它
    const key = variableToAdd.value.startsWith('stat_data.') ? variableToAdd.value : `stat_data.${variableToAdd.value}`;
    store.simulationValues[key] = ''; // 默认值为空字符串
    variableToAdd.value = null;
  }
}

function removeVariable(path: string) {
  // 尝试删除带stat_data前缀和不带前缀的版本
  delete store.simulationValues[path];
  const statDataPath = path.startsWith('stat_data.') ? path : `stat_data.${path}`;
  const plainPath = path.startsWith('stat_data.') ? path.substring(10) : path;
  delete store.simulationValues[statDataPath];
  delete store.simulationValues[plainPath];
}

function isStageMatched(stage: Stage): boolean {
  return matchesStage(stage, store.simulationValues);
}
</script>

<style scoped>
.add-variable-section {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.simulated-variables-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-sim-vars {
  text-align: center;
  padding: 20px 0;
  color: var(--el-text-color-secondary);
}

.input-with-delete {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-btn {
  flex-shrink: 0;
}

.simulation-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.simulation-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin: 0;
}

.help-icon {
  color: var(--el-color-info);
  cursor: help;
}

.simulation-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  display: flex;
  align-items: center;
  gap: 4px;
}

.quick-values {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-values label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.value-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.matched-stage h5,
.test-result h5,
.stage-comparison h5,
.test-suggestions h5 {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.stage-card {
  border: 1px solid var(--el-color-success-light-5);
  background-color: var(--el-color-success-light-9);
}

.stage-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.stage-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stage-description code {
  background-color: var(--el-fill-color-light);
  padding: 2px 4px;
  border-radius: 2px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.result-container {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  min-height: 100px;
  background-color: var(--el-bg-color-page);
}

.empty-result {
  display: flex;
  padding: 20px;
  text-align: center;
}

.no-result {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}

.result-content {
  padding: 12px;
}

.result-content pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.comparison-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.comparison-row {
  display: grid;
  grid-template-columns: 30px 1fr 80px 60px;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.2s;
}

.comparison-row:hover {
  background-color: var(--el-fill-color-extra-light);
}

.comparison-row.is-matched {
  border-color: var(--el-color-success);
  background-color: var(--el-color-success-light-9);
}

.comparison-row.is-active {
  border-color: var(--el-color-warning);
  background-color: var(--el-color-warning-light-9);
}

.row-index {
  text-align: center;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.row-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-condition {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: var(--el-text-color-secondary);
}

.row-status {
  display: flex;
  justify-content: center;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.suggestion-item:hover {
  border-color: var(--el-color-primary-light-5);
  background-color: var(--el-color-primary-light-9);
}

.suggestion-value {
  font-weight: 500;
  color: var(--el-color-primary);
  min-width: 30px;
  text-align: center;
}

.suggestion-desc {
  color: var(--el-text-color-secondary);
  flex: 1;
}

.empty-state {
  padding: 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .simulation-panel {
    padding: 8px 12px;
  }

  .panel-content {
    padding: 0;
    gap: 12px;
  }

  .mobile-header {
    justify-content: center;
    align-items: center;
    gap: 6px;
  }

  .mobile-header .section-title {
    text-align: center;
  }

  .form-item label {
    font-size: 11px;
  }

  .form-item .el-input {
    font-size: 14px;
  }

  .value-buttons {
    justify-content: center;
    gap: 3px;
  }

  .value-buttons .el-button {
    padding: 4px 8px;
    font-size: 11px;
  }

  .comparison-row {
    grid-template-columns: 20px 1fr 60px 45px;
    gap: 3px;
    padding: 4px;
    font-size: 11px;
  }

  .row-name {
    font-size: 11px;
  }

  .row-condition {
    font-size: 10px;
  }

  .suggestion-item {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 8px;
    gap: 4px;
  }

  .suggestion-value {
    min-width: auto;
    font-size: 14px;
  }

  .suggestion-desc {
    font-size: 11px;
  }

  .result-container {
    min-height: 80px;
  }

  .result-content pre {
    font-size: 11px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .panel-content {
    padding: 12px;
  }

  .comparison-row {
    grid-template-columns: 25px 1fr 80px 55px;
  }
}
</style>
