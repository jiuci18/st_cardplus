<template>
  <div class="image-panel-container">
    <el-image :src="previewUrl" fit="contain" class="character-image">
      <template #error>
        <div class="image-placeholder">
          <span>暂无图片</span>
        </div>
      </template>
    </el-image>

    <div class="image-actions">
      <el-button type="primary" class="upload-button" @click="openUploadDialog">
        🖼️ 选择图片
      </el-button>

      <el-button type="default" class="link-button" @click="openImageUrlEditor">
        🔗
      </el-button>
    </div>

    <el-dialog v-model="uploadDialogVisible" title="选择图片" width="420px" append-to-body>
      <div class="upload-dialog-content">
        <el-upload ref="uploadRef" action="#" :show-file-list="false" :auto-upload="false" @change="handleImageChange"
          @error="handleError" accept="image/png, image/jpeg, image/webp" class="dialog-upload-button" :limit="1">
          <el-button type="primary">选择图片</el-button>
        </el-upload>
        <p v-if="selectedImageName" class="upload-dialog-selected">
          已选择：{{ selectedImageName }}
        </p>
        <p v-else class="upload-dialog-selected upload-dialog-selected--placeholder">
          未选择图片
        </p>
        <el-divider border-style="dashed" />
        <p class="upload-dialog-tip">选择托管提供商后上传，成功后会自动写入角色 image URL。</p>
        <el-select v-model="providerModel" class="provider-select" :disabled="!isDesktopApp">
          <el-option label="Catbox" value="catbox" />
          <el-option label="ImgBB" value="imgbb" />
        </el-select>
        <p v-if="!isDesktopApp" class="upload-dialog-disabled">
          Web 无法激活上传模块绕过CORS跨域拦截，请使用桌面版。
        </p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :disabled="!isDesktopApp || !selectedImageName" @click="handleUploadInDialog">
            上传
          </el-button>
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <span class="dialog-divider">|</span>
          <el-button @click="handleConfirmProvider">
            确认
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElImage, ElUpload, ElButton, ElMessage, ElMessageBox, ElSelect, ElOption, ElDialog } from 'element-plus';
import type { UploadFile, UploadFiles, UploadInstance } from 'element-plus';
import type { HostingProvider } from '@/utils/imageHosting';

const props = defineProps<{
  previewUrl?: string;
  avatarUrl?: string;
  isDesktopApp?: boolean;
  selectedProvider?: HostingProvider;
}>();

const emit = defineEmits<{
  (e: 'image-change', file: File): void;
  (e: 'image-url-change', url: string): void;
  (e: 'provider-change', provider: HostingProvider): void;
  (e: 'upload-to-hosting', provider: HostingProvider): void;
}>();

const uploadRef = ref<UploadInstance>();
const uploadDialogVisible = ref(false);
const selectedImageName = ref('');
const providerModel = computed<HostingProvider>({
  get: () => props.selectedProvider || 'catbox',
  set: (value) => emit('provider-change', value),
});

const handleImageChange = (uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  console.log('ImagePanel: handleImageChange called with:', uploadFile);
  console.log('ImagePanel: uploadFiles length:', uploadFiles.length);

  if (uploadFile.raw) {
    console.log('ImagePanel: Emitting image-change event with file:', uploadFile.raw.name, uploadFile.raw.size);
    selectedImageName.value = uploadFile.raw.name;
    emit('image-change', uploadFile.raw);
    setTimeout(() => {
      uploadRef.value?.clearFiles();
    }, 100);
  } else {
    console.warn('ImagePanel: No raw file found in uploadFile');
  }
};

const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

const handleUploadInDialog = () => {
  if (!selectedImageName.value) {
    ElMessage.warning('请先选择图片');
    return;
  }
  emit('upload-to-hosting', providerModel.value);
  uploadDialogVisible.value = false;
};

const handleConfirmProvider = () => {
  uploadDialogVisible.value = false;
};

const handleError = (error: Error) => {
  console.error('ImagePanel: Upload error:', error);
  ElMessage.error('图片选择失败');
};

const openImageUrlEditor = async () => {
  try {
    const result = await ElMessageBox.prompt('请输入角色图片 URL（留空可清除）', '修改角色 image URL', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: props.avatarUrl || '',
      inputPlaceholder: 'https://example.com/avatar.png',
      inputValidator: (inputValue: string) => {
        const trimmed = inputValue.trim();
        if (!trimmed) return true;
        try {
          const url = new URL(trimmed);
          if (!['http:', 'https:'].includes(url.protocol)) {
            return '仅支持 http/https URL';
          }
          return true;
        } catch {
          return '请输入有效的 URL';
        }
      },
    });

    emit('image-url-change', String((result as { value?: string }).value || '').trim());
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('ImagePanel: openImageUrlEditor failed:', error);
      ElMessage.error('修改图片 URL 失败');
    }
  }
};
</script>

<style scoped>
.image-panel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.character-image {
  width: 50%;
  height: 100%;
  height: calc(100% - 50px);
  border-radius: 6px;
  background-color: var(--el-fill-color-light);
  border: 1px dashed var(--el-border-color);
}

.image-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}

.image-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-button {
  margin-top: 0;
}

.dialog-upload-button {
  width: fit-content;
}

.link-button {
  width: 40px;
  padding: 0;
}

.upload-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-dialog-tip {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.upload-dialog-selected {
  margin: 0;
  font-size: 13px;
  color: var(--el-color-success);
}

.upload-dialog-selected--placeholder {
  color: var(--el-text-color-placeholder);
}

.upload-dialog-disabled {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.provider-select {
  width: 100%;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.dialog-divider {
  color: var(--el-text-color-placeholder);
}
</style>
