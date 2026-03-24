<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElButton, ElInput, ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { copyToClipboard } from '../../utils/clipboard';

const inputJson = ref('');
const outputJson = ref('');

onMounted(() => {
  localStorage.removeItem('jsonFormatterHistory');
});

const handleCopy = () => {
  if (!outputJson.value) return;
  copyToClipboard(outputJson.value);
};

const formatJson = () => {
  try {
    const trimmed = inputJson.value.replace(/\s+/g, ' ');
    JSON.parse(trimmed);
    outputJson.value = trimmed;
  } catch (error) {
    ElMessage.error('无效的JSON格式');
    console.error(error);
  }
};
</script>

<template>
  <div class="json-formatter">
    <div class="header">
      <div class="header-top">
        <el-button
          type="primary"
          plain
          @click="$router.push('/toolbox')"
          class="back-button"
        >
          <Icon
            icon="material-symbols:arrow-back"
            width="16"
            height="16"
          />
          返回工具箱
        </el-button>
        <el-alert
          title="去除回车可以有效的节省token，也可以在一定程度上增加阅读困难，但是不影响AI的阅读"
          type="info"
          :closable="false"
          class="info-alert"
        />
      </div>
      <div class="json-header">
        <h3>JSON去除换行工具</h3>
        <div class="output-actions">
          <el-button
            type="primary"
            @click="formatJson"
            :disabled="!inputJson"
          >
            <Icon
              icon="material-symbols:autorenew"
              width="16"
              height="16"
            />
            格式化
          </el-button>
          <el-button
            type="primary"
            @click="handleCopy"
            :disabled="!outputJson"
          >
            <Icon
              icon="material-symbols:content-copy"
              width="16"
              height="16"
            />
            复制到剪贴板
          </el-button>
        </div>
      </div>
    </div>
    <div class="content-wrapper">
      <div class="io-columns">
        <el-input
          v-model="inputJson"
          type="textarea"
          :rows="20"
          placeholder="粘贴带换行的JSON内容"
          class="input-area"
        />
        <el-input
          v-model="outputJson"
          type="textarea"
          :rows="20"
          readonly
          placeholder="处理后的JSON将显示在这里"
          class="output-area"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-formatter {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.json-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.io-columns {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 20px;
}


.input-area,
.output-area {
  flex: 1;
  min-width: 0;
}

.header {
  margin-bottom: 20px;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.header-top .info-alert {
  flex: 1;
  margin: 0;
}

/* 响应式设计 - 移动端 */
@media (max-width: 768px) {
  .json-header {
    flex-direction: column;
  }

  .content-wrapper {
    flex-direction: column;
  }

  .io-columns {
    flex-direction: column;
  }

  .input-area,
  .output-area {
    height: 200px;
  }

  .header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .header-top .info-alert {
    width: 100%;
  }
}
</style>
