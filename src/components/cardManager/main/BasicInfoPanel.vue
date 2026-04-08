<template>
  <div class="basic-info-panel">
    <el-form
      :model="character.data"
      label-position="top"
      class="basic-info-form"
    >
      <el-form-item label="角色名">
        <el-input
          :model-value="character.data.name"
          @update:model-value="updateField('name', $event)"
          placeholder="请输入角色名"
        />
      </el-form-item>

      <el-form-item label="标签">
        <el-select
          ref="tagsSelectRef"
          :model-value="character.data.tags"
          @update:model-value="updateField('tags', $event)"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入或选择标签"
          class="full-width"
        >
          <el-option
            v-for="tag in allTags"
            :key="tag"
            :label="tag"
            :value="tag"
          />
        </el-select>
      </el-form-item>

      <el-form-item>
        <template #label>
          <div class="form-item-label-with-action">
            <span>角色描述</span>
            <el-button
              size="small"
              type="primary"
              plain
              @click="dialogVisible = true"
            >
              从 角色信息 选择
            </el-button>
          </div>
        </template>
        <el-input
          :model-value="character.data.description"
          @update:model-value="updateField('description', $event)"
          type="textarea"
          :rows="10"
          placeholder="角色的详细描述"
        />
      </el-form-item>

      <el-form-item label="开场白">
        <el-input
          :model-value="character.data.first_mes"
          @update:model-value="updateField('first_mes', $event)"
          type="textarea"
          :rows="8"
          placeholder="角色的第一句话"
        />
      </el-form-item>
    </el-form>

    <el-dialog
      v-model="dialogVisible"
      title="从角色信息选择"
      width="680px"
      :close-on-click-modal="false"
    >
      <el-empty
        v-if="characterInfoOptions.length === 0"
        description="暂无可用的角色信息"
      />

      <div
        v-else
        class="selector-layout"
      >
        <el-scrollbar max-height="420px">
          <div class="selector-list">
            <div
              v-for="option in characterInfoOptions"
              :key="option.id"
              class="selector-item"
              :class="{ 'is-selected': selectedCharacterId === option.id }"
              @click="selectedCharacterId = option.id"
            >
              <div class="selector-item-header">
                <span class="selector-item-name">{{ option.name }}</span>
                <el-tag size="small">{{ option.projectName }}</el-tag>
              </div>
              <p class="selector-item-summary">{{ option.summary }}</p>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :disabled="!selectedCharacterId"
            @click="handleApplyCharacterInfo"
          >
            填入角色介绍
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { serializeCharacterInfo } from '@/composables/characterInfo/useCardDataHandler';
import type { CharacterCard, CharacterProject } from '@/types/character/character';
import type { CharacterCardV3 } from '@/types/character/character-card-v3';
import { readLocalStorageJSON } from '@/utils/localStorageUtils';
import { bindDelimitedPaste, mergeUniqueValues } from '@/utils/multiValuePaste';
import { ElButton, ElDialog, ElEmpty, ElForm, ElFormItem, ElInput, ElMessage, ElMessageBox, ElOption, ElScrollbar, ElSelect, ElTag } from 'element-plus';
import { nextTick, onBeforeUnmount, onMounted, ref, type ComponentPublicInstance, watch } from 'vue';

const props = defineProps<{
  character: CharacterCardV3;
  allTags?: string[];
}>();

type BasicInfoField = 'name' | 'tags' | 'description' | 'first_mes';

const emit = defineEmits<{
  (e: 'update-field', payload: { field: BasicInfoField; value: string | string[] }): void;
}>();

const dialogVisible = ref(false);
type SelectComponentInstance = ComponentPublicInstance & { $el: HTMLElement };
const tagsSelectRef = ref<SelectComponentInstance | null>(null);
let tagsPasteCleanup: (() => void) | null = null;

interface CharacterCollection {
  characters: Record<string, CharacterCard>;
  projects: Record<string, CharacterProject>;
  activeCharacterId: string | null;
}

interface CharacterInfoOption {
  id: string;
  name: string;
  projectName: string;
  summary: string;
  content: string;
}

const LOCAL_STORAGE_KEY_CHARACTER_MANAGER = 'characterManagerData';
const selectedCharacterId = ref('');
const characterInfoOptions = ref<CharacterInfoOption[]>([]);

const updateField = (field: BasicInfoField, value: string | string[]) => {
  emit('update-field', {
    field,
    value,
  });
};

const bindTagsPasteHandler = async () => {
  tagsPasteCleanup?.();
  await nextTick();
  tagsPasteCleanup = bindDelimitedPaste(tagsSelectRef.value?.$el, (values) => {
    updateField('tags', mergeUniqueValues(props.character.data.tags || [], values));
  });
};

const splitLines = (value?: string) =>
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const safeText = (value: unknown) => String(value ?? '').trim();

const joinInline = (value?: string) => splitLines(value).join('；');

const getProjectName = (projects: Record<string, CharacterProject>, projectId?: string) => {
  if (!projectId) return '未分组';
  return projects[projectId]?.name || '未分组';
};

const loadCharacterInfoOptions = () => {
  const collection = readLocalStorageJSON<CharacterCollection>(LOCAL_STORAGE_KEY_CHARACTER_MANAGER);
  if (!collection?.characters) {
    characterInfoOptions.value = [];
    selectedCharacterId.value = '';
    return;
  }

  characterInfoOptions.value = Object.values(collection.characters)
    .sort((a, b) => {
      const aOrder = a.meta.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.meta.order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.data.chineseName || '').localeCompare(b.data.chineseName || '', 'zh-Hans-CN');
    })
    .map((item) => ({
      id: item.meta.id || `${item.data.chineseName}-${item.meta.order ?? 0}`,
      name: item.data.chineseName || item.data.japaneseName || '未命名角色',
      projectName: getProjectName(collection.projects || {}, item.meta.projectId),
      summary: [joinInline(item.data.identity), splitLines(item.data.background)[0] || '', safeText(item.data.mbti)]
        .filter(Boolean)
        .join(' ｜ ') || '暂无摘要',
      content: JSON.stringify(serializeCharacterInfo(item, { includeIdentityAsArray: true }), null, 2),
    }));

  selectedCharacterId.value = characterInfoOptions.value[0]?.id || '';
};

watch(dialogVisible, (visible) => {
  if (visible) {
    loadCharacterInfoOptions();
  }
});

onMounted(() => {
  void bindTagsPasteHandler();
});

onBeforeUnmount(() => {
  tagsPasteCleanup?.();
});

const handleApplyCharacterInfo = async () => {
  const selectedOption = characterInfoOptions.value.find((item) => item.id === selectedCharacterId.value);
  if (!selectedOption) {
    ElMessage.warning('请先选择一个角色信息');
    return;
  }

  const description = selectedOption.content.trim();

  if (!description.trim()) {
    ElMessage.warning('所选角色信息没有可用内容');
    return;
  }

  const currentDescription = props.character.data.description?.trim() || '';
  if (currentDescription && currentDescription !== description.trim()) {
    try {
      await ElMessageBox.confirm(
        `当前角色描述已有内容，是否用“${selectedOption.name}”的角色信息覆盖？`,
        '确认覆盖',
        {
          confirmButtonText: '覆盖',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
    } catch {
      return;
    }
  }

  updateField('description', description);
  dialogVisible.value = false;
  ElMessage.success('角色描述已从角色信息填入');
};
</script>

<style scoped>
.basic-info-panel {
  display: contents;
}

.basic-info-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.full-width {
  width: 100%;
}

.form-item-label-with-action {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.selector-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selector-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selector-item {
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.selector-item:hover,
.selector-item.is-selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.selector-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.selector-item-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.selector-item-summary {
  margin: 8px 0 0;
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 1.5;
}

</style>
