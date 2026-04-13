<template>
  <div class="info-display-container">
    <!-- 正则脚本信息展示 -->
    <div
      v-if="type === 'regex'"
      class="regex-panel"
    >
      <div
        v-if="character.data.extensions?.regex_scripts?.length"
        class="regex-content"
      >
        <!-- 单个正则脚本时显示类似世界书的样式 -->
        <div
          v-if="character.data.extensions.regex_scripts.length === 1"
          class="regex-single-script"
        >
          <el-descriptions
            :column="1"
            border
          >
            <el-descriptions-item label="正则脚本">
              <el-tag
                type="success"
                size="large"
              >
                {{ character.data.extensions.regex_scripts[0].scriptName }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 多个正则脚本时显示列表 -->
        <div
          v-else
          class="regex-multiple-scripts"
        >
          <el-scrollbar max-height="200px">
            <div class="regex-scripts-list">
              <el-tag
                v-for="script in character.data.extensions.regex_scripts"
                :key="script.id"
                class="regex-script-tag"
              >
                {{ script.scriptName }}
              </el-tag>
            </div>
          </el-scrollbar>
        </div>
      </div>
      <el-empty
        v-else
        description="无正则脚本"
        :image-size="60"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElDescriptions, ElDescriptionsItem, ElTag, ElScrollbar, ElEmpty } from 'element-plus';
import type { CharacterCardV3 } from '@/types/character/character-card-v3';

defineProps<{
  type: 'regex';
  character: CharacterCardV3;
}>();
</script>

<style scoped>
.info-display-container {
  height: 100%;
}

.regex-panel {
  height: 100%;
}

.regex-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.regex-single-script,
.regex-multiple-scripts {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.regex-scripts-list {
  padding: 8px;
}

.regex-script-tag {
  margin: 4px;
}

.el-scrollbar {
  height: 100%;
}
</style>
