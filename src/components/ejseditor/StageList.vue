<template>
  <div class="stage-list-container">
    <div class="list-header">
      <el-button
        type="primary"
        :size="isMobile ? 'small' : 'small'"
        :icon="Plus"
        @click="addStage"
      >
        {{ isMobile ? '添加' : '添加阶段' }}
      </el-button>
      <el-input
        :model-value="props.logicBlock.defaultStageContent"
        @update:model-value="updateDefaultContent"
        size="small"
        placeholder="默认情况下的内容"
        class="default-content-input"
      >
        <template #prepend>默认内容</template>
      </el-input>
    </div>

    <div
      v-if="localStages.length === 0"
      class="empty-state"
    >
      <el-empty
        description="暂无阶段"
        :image-size="50"
      >
        <el-button
          type="primary"
          @click="addStage"
          size="small"
        >
          添加第一个阶段
        </el-button>
      </el-empty>
    </div>

    <draggable
      v-else
      :list="localStages"
      item-key="id"
      handle=".drag-handle"
      animation="200"
      ghost-class="ghost"
      chosen-class="chosen"
      class="stage-list"
      @end="onDragEnd"
    >
      <template #item="{ element: stage, index }">
        <div class="stage-item-wrapper">
          <div
            class="stage-item"
            :class="{ 'is-expanded': expandedStageId.includes(stage.id) }"
            @click="toggleExpand(stage.id)"
          >
            <div class="stage-header">
              <div class="stage-info">
                <el-icon
                  class="drag-handle"
                  @click.stop
                >
                  <Menu />
                </el-icon>
                <span class="stage-index">{{ index + 1 }}</span>
                <span class="stage-name">{{ stage.name }}</span>
                <el-tooltip
                  :content="stage.name"
                  placement="top"
                  :enterable="false"
                >
                  <el-icon
                    class="info-icon"
                    @click.stop
                  >
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
              <div class="stage-actions">
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  circle
                  @click.stop="removeStage(stage.id)"
                />
              </div>
            </div>
            <div class="stage-condition">
              <el-tag
                size="small"
                type="info"
              >
                {{ formatStageConditions(stage) }}
              </el-tag>
            </div>
          </div>
          <el-collapse-transition>
            <div v-show="expandedStageId.includes(stage.id)">
              <StageEditor
                :stage="stage"
                :logic-block-id="props.logicBlock.id"
              />
            </div>
          </el-collapse-transition>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, Menu, InfoFilled } from '@element-plus/icons-vue';
import draggable from 'vuedraggable';
import { useEjsEditorStore } from '@/composables/ejs/ejsEditor';
import { formatStageConditions } from '@/composables/ejs/stageConditions';
import { useDevice } from '@/composables/useDevice';
import type { LogicBlock } from '@/types/ejs-editor';
import StageEditor from './StageEditor.vue';

const props = defineProps<{
  logicBlock: LogicBlock;
}>();

const store = useEjsEditorStore();
const { isMobile } = useDevice();
const expandedStageId = ref<string[]>([]);

const localStages = ref([...props.logicBlock.stages]);
watch(
  () => props.logicBlock.stages,
  (newStages) => {
    localStages.value = [...newStages];
  },
  { deep: true }
);

function onDragEnd() {
  store.updateStagesOrder(props.logicBlock.id, localStages.value);
}

function addStage() {
  store.addStage(props.logicBlock.id);
}

function updateDefaultContent(content: string) {
  store.updateLogicBlock(props.logicBlock.id, { defaultStageContent: content });
}

function toggleExpand(stageId: string) {
  const index = expandedStageId.value.indexOf(stageId);
  if (index > -1) {
    expandedStageId.value.splice(index, 1);
  } else {
    expandedStageId.value.push(stageId);
    store.selectedStageId = `${props.logicBlock.id}/${stageId}`;
  }
}

async function removeStage(stageId: string) {
  try {
    await ElMessageBox.confirm('确定要删除这个阶段吗？', '确认删除', { type: 'warning' });
    store.removeStage(props.logicBlock.id, stageId);
    ElMessage.success('阶段已删除');
    const index = expandedStageId.value.indexOf(stageId);
    if (index > -1) {
      expandedStageId.value.splice(index, 1);
    }
  } catch {
  }
}
</script>

<style scoped>
.stage-list-container {
  background-color: var(--el-bg-color-page);
  padding: 8px;
  border-radius: 4px;
}
.list-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}
.default-content-input {
  flex-grow: 1;
}
.empty-state {
  text-align: center;
  padding: 10px;
}
.stage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stage-item-wrapper {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  transition: all 0.2s;
  background-color: var(--el-bg-color);
  overflow: hidden;
}
.stage-item-wrapper:hover {
  border-color: var(--el-color-primary-light-5);
}
.stage-item {
  padding: 12px;
  cursor: pointer;
}
.stage-item.is-expanded {
  background-color: var(--el-color-primary-light-9);
}
.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.stage-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.drag-handle {
  cursor: grab;
  color: var(--el-text-color-secondary);
}
.drag-handle:active {
  cursor: grabbing;
}
.stage-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: var(--el-color-primary);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
}
.stage-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.info-icon {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  margin-left: 4px;
}
.ghost {
  opacity: 0.5;
  background: #c8ebfb;
  border: 1px dashed var(--el-color-primary);
}
.chosen {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.stage-condition {
  margin-top: 4px;
}
</style>
