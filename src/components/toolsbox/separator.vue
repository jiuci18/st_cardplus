<template>
  <div class="image-parser-container">
    <div class="header">
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
      <h1>元数据分离器</h1>
    </div>
    <el-alert
      title="工具说明"
      type="info"
      :closable="false"
      class="info-alert"
    >
      <p>解析角色卡自带的json并且本地保存，方便快捷</p>
    </el-alert>
    <el-card shadow="hover">
      <el-upload
        class="upload-demo"
        drag
        action=""
        :auto-upload="false"
        :on-change="handleFileChange"
        :show-file-list="false"
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">
          将文件拖到此处，或
          <em>点击上传</em>
        </div>
      </el-upload>

      <div
        class="preview-area"
        v-if="imageUrl"
      >
        <el-image
          :src="imageUrl"
          :preview-src-list="[imageUrl]"
          fit="contain"
          style="max-height: 300px"
        />
      </div>

      <el-divider></el-divider>

      <div
        class="result-area"
        v-if="characterData"
      >
        <el-tabs type="border-card">
          <el-tab-pane label="元数据">
            <div class="data-header">
              <el-button
                type="primary"
                @click="saveJson"
                size="small"
              >
                <Icon
                  icon="material-symbols:save"
                  class="icon-left"
                />
                保存JSON
              </el-button>
            </div>
            <pre class="json-data">{{ characterData }}</pre>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { read } from '@/utils/pngCardMetadata';
import { saveFile } from '@/utils/fileSave';
import { Icon } from '@iconify/vue';
import type { UploadFile } from 'element-plus';
import { ElMessage } from 'element-plus';
import { ref } from 'vue';

const imageUrl = ref('');
const characterData = ref('');
const uploadedImageName = ref('');

const handleFileChange = (file: UploadFile) => {
  if (!file.raw || file.raw.type !== 'image/png') {
    ElMessage.error('请选择一个有效的 PNG 文件 (.png)');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const image = new Uint8Array(arrayBuffer);
      const jsonData = read(image);

      characterData.value = JSON.stringify(JSON.parse(jsonData), null, 2);
      imageUrl.value = URL.createObjectURL(file.raw as Blob);
      uploadedImageName.value = file.name.replace('.png', '');
      ElMessage.success(`成功解析图片: ${file.name}`);
    } catch (error: any) {
      characterData.value = '';
      imageUrl.value = '';
      ElMessage.error(`解析失败: ${error.message}`);
    }
  };
  reader.readAsArrayBuffer(file.raw);
};

const saveJson = async () => {
  if (!characterData.value) return;

  const jsonStr = characterData.value;
  await saveFile({
    data: new TextEncoder().encode(jsonStr),
    fileName: `${uploadedImageName.value}.json`,
    mimeType: 'application/json',
  });
  ElMessage.success('JSON文件已保存');
};
</script>

<style scoped>
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

.image-parser-container {
  padding: 20px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-demo {
  margin-bottom: 20px;
}

.preview-area {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

.result-area {
  margin-top: 20px;
}

.result-area {
  margin-top: 20px;
}

.data-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.icon-left {
  margin-right: 4px;
}

.json-data {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: auto;
  background-color: var(--el-fill-color-lighter);
  padding: 10px;
  border-radius: 4px;
}
</style>
