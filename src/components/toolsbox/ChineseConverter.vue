<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, ref } from 'vue';
import BrowserFilePicker from '@/components/common/BrowserFilePicker.vue';
import { saveFile } from '@/utils/fileSave';
import {
  CONVERSION_OPTIONS,
  type ConversionConfig,
  type ConversionResult,
  convertPngCharacterCardBatch,
  downloadConvertedPngBatch,
} from '@/utils/chineseConverter';

// 文件列表项接口
interface FileItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
  result?: ConversionResult;
}

// 状态
const fileList = ref<FileItem[]>([]);
const selectedConfig = ref<ConversionConfig>('tw');
const isConverting = ref(false);
const convertProgress = ref(0);

// 计算属性
const hasFiles = computed(() => fileList.value.length > 0);
const hasConvertedFiles = computed(() => fileList.value.some((item) => item.status === 'success'));
const allFilesProcessed = computed(
  () =>
    fileList.value.length > 0 && fileList.value.every((item) => item.status === 'success' || item.status === 'error')
);
const successCount = computed(() => fileList.value.filter((item) => item.status === 'success').length);
const errorCount = computed(() => fileList.value.filter((item) => item.status === 'error').length);

// 文件上传处理
function handleFileChange(files: File[]) {
  if (files.length === 0) return;

  // 验证文件类型
  const pngFiles = Array.from(files).filter((file) => {
    if (file.type !== 'image/png') {
      ElMessage.warning(`${file.name} 不是 PNG 文件，已跳过`);
      return false;
    }
    return true;
  });

  if (pngFiles.length === 0) {
    ElMessage.error('请选择至少一个 PNG 文件');
    return;
  }

  // 添加到文件列表
  const newItems: FileItem[] = pngFiles.map((file) => ({
    id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
    file,
    status: 'pending',
  }));

  fileList.value.push(...newItems);
  ElMessage.success(`已添加 ${pngFiles.length} 个文件`);
}

// 移除单个文件
function removeFile(id: string) {
  const index = fileList.value.findIndex((item) => item.id === id);
  if (index !== -1) {
    fileList.value.splice(index, 1);
  }
}

// 清空文件列表
function clearAllFiles() {
  if (fileList.value.length === 0) return;

  ElMessageBox.confirm('确定要清空所有文件吗？', '确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      fileList.value = [];
      convertProgress.value = 0;
      ElMessage.success('已清空文件列表');
    })
    .catch(() => {
      // 用户取消
    });
}

// 开始批量转换
async function startConversion() {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先上传至少一个 PNG 文件');
    return;
  }

  isConverting.value = true;
  convertProgress.value = 0;

  // 重置所有文件状态为 pending
  fileList.value.forEach((item) => {
    item.status = 'pending';
    item.message = undefined;
    item.result = undefined;
  });

  try {
    // 获取所有文件
    const files = fileList.value.map((item) => item.file);

    // 批量转换，带进度回调
    const results = await convertPngCharacterCardBatch(files, selectedConfig.value, (current, total, _fileName) => {
      // 更新当前文件状态
      const currentItem = fileList.value[current];
      if (currentItem) {
        currentItem.status = 'processing';
      }

      // 更新进度
      convertProgress.value = Math.round((current / total) * 100);
    });

    // 更新文件状态
    results.forEach((result, index) => {
      const item = fileList.value[index];
      if (item) {
        item.result = result;
        item.status = result.success ? 'success' : 'error';
        item.message = result.message;
      }
    });

    // 显示结果统计
    const successNum = results.filter((r) => r.success).length;
    const failNum = results.filter((r) => !r.success).length;

    if (failNum === 0) {
      ElMessage.success(`全部转换成功！共 ${successNum} 个文件`);
    } else if (successNum === 0) {
      ElMessage.error(`转换失败！共 ${failNum} 个文件失败`);
    } else {
      ElMessage.warning(`转换完成！成功 ${successNum} 个，失败 ${failNum} 个`);
    }

    convertProgress.value = 100;
  } catch (error) {
    ElMessage.error('批量转换过程中发生错误');
    console.error(error);
  } finally {
    isConverting.value = false;
  }
}

// 批量下载所有成功的文件
async function downloadAll() {
  const successResults = fileList.value
    .filter((item) => item.status === 'success' && item.result)
    .map((item) => item.result!);

  if (successResults.length === 0) {
    ElMessage.warning('没有可下载的文件');
    return;
  }

  try {
    ElMessage.info(`开始下载 ${successResults.length} 个文件...`);
    await downloadConvertedPngBatch(successResults);
    ElMessage.success(`已完成 ${successResults.length} 个文件的下载`);
  } catch (error) {
    ElMessage.error('下载过程中发生错误');
    console.error(error);
  }
}

// 下载单个文件
async function downloadSingle(item: FileItem) {
  if (!item.result || !item.result.convertedData) {
    ElMessage.error('文件数据不可用');
    return;
  }

  try {
    const baseName = item.file.name.replace(/\.png$/i, '');
    const fileName = `${baseName}_converted.png`;
    await saveFile({
      data: new Uint8Array(item.result.convertedData),
      fileName,
      mimeType: 'image/png',
    });
    ElMessage.success(`已开始下载: ${fileName}`);
  } catch (error) {
    ElMessage.error('下载失败');
    console.error(error);
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// 获取状态标签类型
function getStatusTagType(status: FileItem['status']): '' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'pending':
      return 'info';
    case 'processing':
      return 'warning';
    case 'success':
      return 'success';
    case 'error':
      return 'danger';
    default:
      return '';
  }
}

// 获取状态文本
function getStatusText(status: FileItem['status']): string {
  switch (status) {
    case 'pending':
      return '等待中';
    case 'processing':
      return '处理中';
    case 'success':
      return '成功';
    case 'error':
      return '失败';
    default:
      return '';
  }
}
</script>

<template>
  <div class="converter-container">
    <!-- 头部 -->
    <div class="header">
      <el-button type="primary" plain @click="$router.push('/toolbox')" class="back-button">
        <Icon icon="material-symbols:arrow-back" width="16" height="16" />
        返回工具箱
      </el-button>
      <h1>简繁转换器</h1>
    </div>

    <!-- 说明 -->
    <el-alert title="工具说明" type="info" :closable="false" class="info-alert">
      <p>批量转换角色卡 PNG 文件中的中文文本，支持简体、繁体（台湾）、繁体（香港）等多种方言转换</p>
      <p>1. 上传一个或多个 PNG 角色卡文件</p>
      <p>2. 选择转换方向</p>
      <p>3. 点击"开始转换"进行批量处理</p>
      <p>4. 转换完成后可批量下载或单独下载</p>
    </el-alert>

    <!-- 配置区 -->
    <div class="config-section">
      <div class="config-item">
        <label>转换方向：</label>
        <el-select v-model="selectedConfig" placeholder="请选择转换方向" class="config-select" :disabled="isConverting">
          <el-option v-for="option in CONVERSION_OPTIONS" :key="option.value" :label="option.label"
            :value="option.value">
            <div class="option-content">
              <span class="option-label">{{ option.label }}</span>
              <span class="option-desc">{{ option.description }}</span>
            </div>
          </el-option>
        </el-select>
      </div>
    </div>

    <!-- 上传区 -->
    <div class="action-section">
      <BrowserFilePicker accept=".png" multiple :disabled="isConverting" @select="handleFileChange">
        <el-button type="primary" :disabled="isConverting">
          <Icon icon="material-symbols:upload-file" class="icon-left" />
          选择 PNG 文件（支持多选）
        </el-button>
      </BrowserFilePicker>
      <el-button @click="clearAllFiles" :disabled="!hasFiles || isConverting">
        <Icon icon="material-symbols:delete-outline" class="icon-left" />
        清空列表
      </el-button>
      <el-button type="success" size="large" @click="startConversion" :disabled="!hasFiles || isConverting"
        :loading="isConverting">
        <Icon v-if="!isConverting" icon="material-symbols:sync" class="icon-left" />
        {{ isConverting ? '转换中...' : '开始转换' }}
      </el-button>

      <el-button type="primary" size="large" @click="downloadAll" :disabled="!hasConvertedFiles || isConverting">
        <Icon icon="material-symbols:download" class="icon-left" />
        批量下载全部
      </el-button>
    </div>

    <!-- 文件列表 -->
    <div v-if="hasFiles" class="file-list-section">
      <div class="list-header">
        <h3>文件列表（{{ fileList.length }} 个文件）</h3>
        <div v-if="allFilesProcessed" class="stats">
          <el-tag type="success" size="small">
            成功: {{ successCount }}
          </el-tag>
          <el-tag v-if="errorCount > 0" type="danger" size="small">
            失败: {{ errorCount }}
          </el-tag>
        </div>
      </div>

      <el-table :data="fileList" border stripe class="file-table">
        <el-table-column label="序号" type="index" width="60" align="center" />

        <el-table-column label="文件名" min-width="200">
          <template #default="{ row }">
            <div class="file-name-cell">
              <Icon icon="material-symbols:image-outline" width="18" height="18" />
              <span>{{ row.file.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="大小" width="100" align="center">
          <template #default="{ row }">
            {{ formatFileSize(row.file.size) }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="信息" min-width="150">
          <template #default="{ row }">
            <span v-if="row.message" class="message-text" :class="row.status">
              {{ row.message }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status === 'success'" type="primary" size="small" @click="downloadSingle(row)">
              <Icon icon="material-symbols:download" class="icon-left" />
              下载
            </el-button>
            <el-button v-else type="danger" size="small" plain @click="removeFile(row.id)" :disabled="isConverting">
              <Icon icon="material-symbols:delete-outline" class="icon-left" />
              移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 进度条 -->
    <div v-if="isConverting || convertProgress > 0" class="progress-section">
      <el-progress :percentage="convertProgress" :status="convertProgress === 100 ? 'success' : undefined" />
    </div>

    <!-- 占位提示 -->
    <div v-if="!hasFiles" class="empty-placeholder">
      <Icon icon="material-symbols:upload-file-outline" width="80" height="80" />
      <p>暂无文件，请点击上方按钮上传 PNG 角色卡</p>
    </div>
  </div>
</template>

<style scoped>
.converter-container {
  padding: 20px;
  width: 100%;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 1rem;
}

.info-alert {
  margin-bottom: 20px;
}

.info-alert p {
  margin: 4px 0;
  font-size: 14px;
}

.config-section {
  background: var(--el-fill-color-light);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-item label {
  font-weight: 500;
  min-width: 80px;
}

.option-content {
  display: flex;
  flex-direction: column;
}

.option-label {
  font-weight: 500;
}

.option-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.action-section {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-direction: row;
    align-items: center;
}

.file-list-section {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.list-header h3 {
  margin: 0;
  font-size: 16px;
}

.stats {
  display: flex;
  gap: 8px;
}

.file-table {
  width: 100%;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-text {
  font-size: 13px;
}

.message-text.success {
  color: var(--el-color-success);
}

.message-text.error {
  color: var(--el-color-danger);
}

.progress-section {
  margin-bottom: 20px;
}

.icon-left {
  margin-right: 4px;
}

.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.empty-placeholder p {
  margin-top: 16px;
  font-size: 14px;
}

.config-select {
  width: 300px;
}

/* 响应式 */
@media (max-width: 768px) {
  .converter-container {
    padding: 12px;
  }

  .header {
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .header h1 {
    font-size: 1.3rem;
    width: 100%;
    order: 2;
    margin: 0;
  }

  .back-button {
    order: 1;
  }

  .config-section {
    padding: 12px;
  }

  .config-item {
    flex-direction: column;
    align-items: stretch;
  }

  .config-select {
    width: 100%;
  }

  .upload-section {
    flex-direction: column;
  }

  .upload-section .el-button {
    width: 100%;
    margin-left: 0;
  }

  .action-section {
    flex-direction: column;
  }

  .action-section .el-button {
    width: 100%;
    margin-left: 0;
  }

  .empty-placeholder {
    padding: 40px 16px;
  }
}
</style>
