<template>
  <div class="greetings-panel-container">
    <el-scrollbar>
      <div class="greetings-grid">
        <div
          v-for="(greeting, index) in model"
          :key="index"
          class="greeting-item"
        >
          <el-input
            :model-value="greeting"
            @update:model-value="updateGreeting(index, $event)"
            type="textarea"
            :rows="10"
            placeholder="请输入开场白"
            resize="none"
          />
          <el-button
            type="danger"
            :icon="Delete"
            circle
            @click="removeGreeting(index)"
            class="delete-button"
          />
        </div>
      </div>
    </el-scrollbar>
    <el-button
      type="primary"
      @click="model = [...model, '']"
      class="add-button"
    >
      添加开场白
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ElScrollbar, ElInput, ElButton } from 'element-plus';
import { Delete } from '@element-plus/icons-vue';

const model = defineModel<string[]>({ required: true });

const removeGreeting = (index: number) => {
  const newGreetings = [...model.value];
  newGreetings.splice(index, 1);
  model.value = newGreetings;
};

const updateGreeting = (index: number, value: string) => {
  const newGreetings = [...model.value];
  newGreetings[index] = value;
  model.value = newGreetings;
};
</script>

<style scoped>
.greetings-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.el-scrollbar {
  flex-grow: 1;
  margin-bottom: 16px;
}

.greetings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(550px, 1fr));
  gap: 16px;
  padding: 4px; /* 增加一点内边距，防止卡片在滚动条边缘被切割 */
}

.greeting-item {
  position: relative;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  transition: box-shadow 0.2s ease;
  display: flex;
}

.greeting-item:hover {
  box-shadow: var(--el-box-shadow-light);
}

.greeting-item :deep(.el-textarea__inner) {
  background-color: transparent;
  border: none;
  box-shadow: none !important; /* 强制覆盖 element-plus 的 focus 样式 */
}

.delete-button {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.greeting-item:hover .delete-button {
  opacity: 1;
}

.add-button {
  width: 100%;
}
</style>
