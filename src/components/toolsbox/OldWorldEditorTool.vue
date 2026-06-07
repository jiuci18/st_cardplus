<template>
  <div class="old-world-editor-tool p-4 min-h-screen">
    <div class="header-top">
      <el-button
        type="primary"
        plain
        @click="router.push('/toolbox')"
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
        title="旧版世界编辑器用于兼容旧工作流，功能不再持续维护"
        type="warning"
        :closable="false"
        class="info-alert"
      />
    </div>

    <div id="titleMain">
      <h1 class="page-title">地标编辑器</h1>
      <div class="btnSL">
        <div class="btnSL2">
          <el-button
            type="success"
            @click="loadWorld"
          >
            <Icon
              icon="material-symbols:folder-open-outline-sharp"
              width="18"
              height="18"
              style="margin-right: 4px"
            />
            加载 json
          </el-button>
          <el-button
            type="primary"
            @click="saveWorld"
          >
            <Icon
              icon="material-symbols:file-save-outline-sharp"
              width="18"
              height="18"
              style="margin-right: 4px"
            />
            保存 json
          </el-button>
          <el-button
            plain
            @click="resetForm"
          >
            <Icon
              icon="material-symbols:refresh"
              width="18"
              height="18"
              style="margin-right: 4px"
            />
            重置数据
          </el-button>
        </div>
        <div class="btnSL2">
          <el-button
            type="info"
            @click="copyToClipboard"
            title="复制到剪贴板"
          >
            <Icon
              icon="material-symbols:content-copy-outline"
              width="18"
              height="18"
            />
          </el-button>
          <el-button
            type="warning"
            @click="showImportDialog"
            title="导入数据"
          >
            <Icon
              icon="material-symbols:content-paste-go-rounded"
              width="18"
              height="18"
            />
          </el-button>
        </div>
      </div>
    </div>

    <div class="section-container">
      <div>
        <el-card>
          <h2>基本信息</h2>
          <el-form
            :model="form"
            label-width="80px"
          >
            <el-form-item label="名称">
              <el-input
                v-model="form.name"
                placeholder="请输入地标名称"
              />
            </el-form-item>
            <el-form-item label="所属空间">
              <el-input
                v-model="form.space"
                placeholder="请输入所属空间"
              />
            </el-form-item>
          </el-form>
        </el-card>
        <el-card style="margin-top: 10px">
          <h2>关键词（每行一条）</h2>
          <el-input
            v-model="form.keywords"
            type="textarea"
            :rows="3"
            placeholder="请输入关键词"
          />
        </el-card>
      </div>
      <el-card style="width: 75%">
        <h2>介绍（每行一段）</h2>
        <el-input
          v-model="form.info"
          type="textarea"
          :rows="12"
          placeholder="请输入介绍"
        />
      </el-card>
    </div>

    <div style="margin: 4px"></div>

    <el-card>
      <div class="title-Btn-add">
        <h2>地标</h2>
        <div style="display: flex; gap: 8px">
          <el-button
            type="primary"
            @click="addLandmark"
            style="margin-left: 16px"
          >
            <Icon
              icon="material-symbols:desktop-landscape-add-outline"
              width="18"
              height="18"
              style="margin-right: 4px"
            />
            添加地标（卡片）
          </el-button>
          <el-button
            type="success"
            @click="exportLandmarks"
            title="导出地标"
          >
            <Icon
              icon="material-symbols:content-copy-outline"
              width="18"
              height="18"
            />
          </el-button>
        </div>
      </div>
      <draggable
        v-model="form.landmarks"
        item-key="index"
        class="el-row"
        :gutter="16"
      >
        <template #item="{ element }">
          <el-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-card class="mb-4 landmark-card">
              <el-input
                v-model="element.name"
                placeholder="地标名称"
              />
              <el-input
                v-model="element.description"
                type="textarea"
                :rows="3"
                placeholder="地标介绍"
              />
              <div style="margin: 4px"></div>
              <el-button
                type="danger"
                @click="removeLandmark(element)"
              >
                <Icon
                  icon="material-symbols:delete-outline"
                  width="18"
                  height="18"
                  style="margin-right: 4px"
                />
                删除地标
              </el-button>
            </el-card>
          </el-col>
        </template>
      </draggable>
    </el-card>

    <div style="margin: 4px"></div>
    <el-card>
      <div class="title-Btn-add">
        <h2>势力</h2>
        <div style="display: flex; gap: 8px">
          <el-button
            type="primary"
            @click="addForce"
            style="margin-left: 16px"
          >
            <Icon
              icon="material-symbols:desktop-landscape-add-outline"
              width="18"
              height="18"
              style="margin-right: 4px"
            />
            添加势力（卡片）
          </el-button>
          <el-button
            type="success"
            @click="exportForces"
            title="导出势力"
          >
            <Icon
              icon="material-symbols:content-copy-outline"
              width="18"
              height="18"
            />
          </el-button>
        </div>
      </div>
      <draggable
        v-model="form.forces"
        item-key="index"
        class="el-row"
        :gutter="16"
      >
        <template #item="{ element }">
          <el-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-card class="mb-4 force-card">
              <el-input
                v-model="element.name"
                placeholder="势力名称"
              />
              <el-input
                v-model="element.members"
                type="textarea"
                :rows="2"
                placeholder="成员（每行一个）"
              />
              <el-input
                v-model="element.description"
                type="textarea"
                :rows="2"
                placeholder="势力描述"
              />
              <div style="margin: 4px"></div>
              <el-button
                type="danger"
                @click="removeForce(element)"
              >
                <Icon
                  icon="material-symbols:delete-outline"
                  width="18"
                  height="18"
                  style="margin-right: 4px"
                />
                删除势力
              </el-button>
            </el-card>
          </el-col>
        </template>
      </draggable>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import draggable from 'vuedraggable';
import { copyToClipboard as copyUtil } from '@/utils/clipboard';
import { saveFile } from '@/utils/system/fileSave';
import {
  clearAutoSave,
  clearLocalStorage,
  getSetting,
  initAutoSave,
  loadFromLocalStorage,
  saveToLocalStorage,
} from '@/utils/localStorageUtils';

interface Landmark {
  name: string;
  description: string;
}

interface Force {
  name: string;
  members: string;
  description: string;
}

interface WorldForm {
  name: string;
  space: string;
  keywords: string;
  info: string;
  landmarks: Landmark[];
  forces: Force[];
}

type JsonLike = Record<string, unknown>;

const STORAGE_KEY = 'worldEditorData';
const router = useRouter();

const createEmptyForm = (): WorldForm => ({
  name: '',
  space: '',
  keywords: '',
  info: '',
  landmarks: [],
  forces: [],
});

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

const toMultilineText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .join('\n');
  }
  return asText(value);
};

const normalizeLandmarks = (value: unknown): Landmark[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const landmark = (item as JsonLike) || {};
    return {
      name: asText(landmark.name),
      description: asText(landmark.description),
    };
  });
};

const normalizeForces = (value: unknown): Force[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const force = (item as JsonLike) || {};
    return {
      name: asText(force.name),
      members: toMultilineText(force.members),
      description: asText(force.description),
    };
  });
};

const normalizeWorldForm = (value: unknown): WorldForm => {
  if (!value || typeof value !== 'object') return createEmptyForm();
  const raw = value as JsonLike;

  return {
    name: asText(raw.name),
    space: asText(raw.space),
    keywords: toMultilineText(raw.keywords),
    info: toMultilineText(raw.info),
    landmarks: normalizeLandmarks(raw.landmarks),
    forces: normalizeForces(raw.forces),
  };
};

const toLineArray = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const serializeWorldForm = (value: WorldForm) => ({
  ...value,
  keywords: toLineArray(value.keywords),
  info: toLineArray(value.info),
  forces: value.forces.map((force) => ({
    ...force,
    members: toLineArray(force.members),
  })),
});

const hasWorldSchema = (value: JsonLike): boolean => {
  return 'name' in value || 'landmarks' in value || 'forces' in value;
};

const form = ref<WorldForm>(createEmptyForm());
let autoSaveTimer: number | null = null;
let autoSaveIntervalMs = getSetting('autoSaveInterval') * 1000;

const restartAutoSave = () => {
  if (autoSaveTimer) {
    clearAutoSave(autoSaveTimer);
  }
  autoSaveTimer = initAutoSave(
    () => saveToLocalStorage(form.value, STORAGE_KEY),
    () => !!form.value.name,
    autoSaveIntervalMs
  );
};

const handleIntervalChange = (event: Event) => {
  const detail = (event as CustomEvent<number>).detail;
  if (typeof detail !== 'number' || !Number.isFinite(detail)) return;
  autoSaveIntervalMs = detail * 1000;
  restartAutoSave();
};

const addLandmark = () => {
  form.value.landmarks.push({ name: '', description: '' });
  ElMessage.success('已添加新地标');
};

const addForce = () => {
  form.value.forces.push({ name: '', members: '', description: '' });
};

const removeForce = (force: Force) => {
  const index = form.value.forces.indexOf(force);
  if (index !== -1) {
    form.value.forces.splice(index, 1);
  }
};

const removeLandmark = (landmark: Landmark) => {
  const index = form.value.landmarks.indexOf(landmark);
  if (index !== -1) {
    form.value.landmarks.splice(index, 1);
  }
};

const exportLandmarks = async () => {
  const landmarksData = form.value.landmarks;
  if (landmarksData.length === 0) {
    ElMessage.warning('没有可导出的地标');
    return;
  }
  await copyUtil(JSON.stringify(landmarksData, null, 2), '地标已复制到剪贴板！', '导出失败');
};

const exportForces = async () => {
  const forcesData = form.value.forces;
  if (forcesData.length === 0) {
    ElMessage.warning('没有可导出的势力');
    return;
  }
  await copyUtil(JSON.stringify(forcesData, null, 2), '势力已复制到剪贴板！', '导出失败');
};

const importFromJsonString = (data: string) => {
  const parsed = JSON.parse(data) as JsonLike;

  if (hasWorldSchema(parsed)) {
    form.value = normalizeWorldForm(parsed);
    return;
  }

  const name = asText(parsed.chineseName) || asText(parsed.name) || '未命名导入';
  const identity = parsed.identity;
  form.value = {
    ...createEmptyForm(),
    name,
    keywords: Array.isArray(identity) ? identity.filter((item): item is string => typeof item === 'string').join('\n') : '',
    info: `导入数据：\n${JSON.stringify(parsed, null, 2)}`,
  };
};

const showImportDialog = () => {
  ElMessageBox.prompt('请输入要导入的JSON数据', '导入数据', {
    confirmButtonText: '导入',
    cancelButtonText: '取消',
    type: 'info',
    inputType: 'textarea',
    inputPlaceholder: '在此粘贴或输入JSON数据',
    inputValidator: (value) => {
      if (!value) {
        return '请输入要导入的数据';
      }
      try {
        JSON.parse(value);
        return true;
      } catch {
        return '请输入有效的JSON格式数据';
      }
    },
  })
    .then((result) => {
      importFromJsonString(result.value as string);
      ElMessage.success('导入成功！');
    })
    .catch(() => {
      // 用户取消
    });
};

const copyToClipboard = async () => {
  const jsonData = JSON.stringify(serializeWorldForm(form.value), null, 2);
  await copyUtil(jsonData, '已复制到剪贴板！', '复制失败');
};

const saveWorld = async () => {
  try {
    const jsonData = JSON.stringify(serializeWorldForm(form.value), null, 2);
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);

    await saveFile({
      data: new TextEncoder().encode(jsonData),
      fileName: `${form.value.name || 'world'}_${randomSuffix}.json`,
      mimeType: 'application/json',
    });

    ElMessage.success('世界书保存成功！');
  } catch {
    ElMessage.error('保存失败');
  }
};

const loadWorld = async () => {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const content = String(loadEvent.target?.result || '');
          form.value = normalizeWorldForm(JSON.parse(content));
          ElMessage.success('世界书加载成功！');
        } catch {
          ElMessage.error('文件格式错误，请检查文件内容');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  } catch {
    ElMessage.error('加载失败');
  }
};

const resetForm = () => {
  ElMessageBox.confirm('确定要重置所有数据吗？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      form.value = createEmptyForm();
      clearLocalStorage(STORAGE_KEY);
      ElMessage.success('数据已重置');
    })
    .catch(() => {
      ElMessage.info('取消重置');
    });
};

onMounted(() => {
  const loaded = loadFromLocalStorage(STORAGE_KEY);
  if (loaded) {
    form.value = normalizeWorldForm(loaded);
  }
  restartAutoSave();
  window.addEventListener('autoSaveIntervalChange', handleIntervalChange);
});

onBeforeUnmount(() => {
  if (autoSaveTimer) {
    clearAutoSave(autoSaveTimer);
  }
  window.removeEventListener('autoSaveIntervalChange', handleIntervalChange);
});

defineExpose({
  saveWorld,
  loadWorld,
  resetForm,
});
</script>

<style scoped>
.old-world-editor-tool {
  padding: 1.25rem;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
}

.info-alert {
  flex: 1;
  margin: 0;
}

.page-title {
  font-size: 18px;
  margin: 0;
  color: var(--el-text-color-primary);
}

.section-container {
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.section-container > * {
  flex: 1;
  min-width: 100%;
}

.title-Btn-add {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

#titleMain {
  justify-content: space-between;
}

.btnSL {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
}

.btnSL2 {
  margin: 8px 4px 8px 0;
  display: flex;
}

@media (min-width: 768px) {
  .section-container {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .section-container > * {
    min-width: auto;
  }

  #titleMain {
    display: flex;
    justify-content: space-between;
  }

  .btnSL {
    display: flex;
    align-items: center;
    flex-direction: row;
  }

  .btnSL2 {
    display: flex;
  }
}

@media (max-width: 768px) {
  .old-world-editor-tool {
    padding: 0.75rem;
  }

  .header-top {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
