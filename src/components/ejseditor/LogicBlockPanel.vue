<template>
  <div class="logic-block-panel">
    <div class="panel-header">
      <h3>逻辑块管理</h3>
      <el-button type="primary" :icon="Plus" @click="store.addLogicBlock" size="small">
        添加逻辑块
      </el-button>
    </div>

    <div v-if="store.logicBlocks.length === 0" class="empty-state">
      <el-empty description="暂无逻辑块" :image-size="60">
        <el-button type="primary" @click="store.addLogicBlock">
          创建第一个逻辑块
        </el-button>
      </el-empty>
    </div>

    <el-collapse v-model="activeBlockIds" class="logic-block-list">
      <el-collapse-item v-for="block in store.logicBlocks" :key="block.id" :name="block.id">
        <template #title>
          <div class="block-title">
            <el-input v-if="editingBlockId === block.id" :model-value="block.name"
              @update:model-value="renameBlock(block.id, $event)" @blur="editingBlockId = null"
              @keyup.enter="editingBlockId = null" size="small" class="title-input" @click.stop />
            <div v-else class="title-display">
              <span @dblclick="startEditing(block.id)">{{ block.name }}</span>
              <el-button :icon="Edit" text circle size="small" @click.stop="startEditing(block.id)" />
            </div>
            <el-switch :model-value="block.enabled" @change="toggleBlockEnabled(block.id, $event as boolean)"
              size="small" class="title-switch" @click.stop />
          </div>
        </template>

        <div class="block-content">
          <StageList :logic-block="block" />
        </div>

        <div class="block-actions">
          <el-button type="danger" :icon="Delete" @click.stop="removeBlock(block.id)" size="small">
            删除该逻辑块
          </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useEjsEditorStore } from '@/composables/ejs/ejsEditor';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Plus, Delete, Edit } from '@element-plus/icons-vue';
import StageList from './StageList.vue';

const store = useEjsEditorStore();
const activeBlockIds = ref<string[]>([]);
const editingBlockId = ref<string | null>(null);
const previousBlockIds = ref<string[]>([]);

watch(
  () => store.logicBlocks.map((block) => block.id),
  (nextBlockIds) => {
    const nextBlockIdSet = new Set(nextBlockIds);
    const preserved = activeBlockIds.value.filter((id) => nextBlockIdSet.has(id));
    const previousBlockIdSet = new Set(previousBlockIds.value);
    const addedBlockIds = nextBlockIds.filter((id) => !previousBlockIdSet.has(id));

    addedBlockIds.forEach((id) => {
      if (!preserved.includes(id)) {
        preserved.push(id);
      }
    });

    if (preserved.length === 0 && nextBlockIds.length > 0) {
      preserved.push(nextBlockIds[0]);
    }

    activeBlockIds.value = preserved;
    previousBlockIds.value = nextBlockIds.slice();
  },
  { immediate: true }
);

watch(
  () => editingBlockId.value,
  (blockId) => {
    if (!blockId) return;
    if (!activeBlockIds.value.includes(blockId)) {
      activeBlockIds.value.push(blockId);
    }
  }
);

function startEditing(blockId: string) {
  editingBlockId.value = blockId;
}

function renameBlock(blockId: string, newName: string) {
  store.updateLogicBlock(blockId, { name: newName });
}

function toggleBlockEnabled(blockId: string, enabled: boolean) {
  store.updateLogicBlock(blockId, { enabled });
}

async function removeBlock(blockId: string) {
  try {
    await ElMessageBox.confirm('确定要删除这个逻辑块及其所有阶段吗？', '确认删除', {
      type: 'warning',
    });
    store.removeLogicBlock(blockId);
    ElMessage.success('逻辑块已删除');
  } catch {
  }
}
</script>

<style scoped>
.logic-block-panel {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
}

.empty-state {
  text-align: center;
  padding: 20px;
}

.logic-block-list {
  border-top: none;
  border-bottom: none;
}

.block-title {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.title-display {
  display: flex;
  align-items: center;
  flex-grow: 1;
  gap: 4px;
}

.title-input {
  flex-grow: 1;
}

.title-switch {
  margin-left: auto;
  margin-right: 16px;
}

.block-content {
  padding: 0 8px;
}

.block-actions {
  padding: 16px 8px 8px;
  text-align: right;
}

:deep(.el-collapse-item__header) {
  padding: 0 8px;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 0;
}
</style>
