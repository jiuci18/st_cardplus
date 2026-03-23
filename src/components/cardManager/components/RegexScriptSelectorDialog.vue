<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择要导出的正则脚本"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="regex-selector-container">
      <div class="selector-header">
        <el-text
          type="info"
          size="small"
        >
          从正则编辑器中选择要导出到角色卡的正则脚本
        </el-text>
        <div class="selector-actions">
          <el-button
            size="small"
            @click="handleSelectAll"
          >
            全选
          </el-button>
          <el-button
            size="small"
            @click="handleDeselectAll"
          >
            取消全选
          </el-button>
        </div>
      </div>

      <el-scrollbar
        v-loading="isLoading"
        max-height="400px"
      >
        <el-empty
          v-if="!isLoading && categories.length === 0"
          description="暂无可用的正则脚本"
        >
          <el-button
            type="primary"
            size="small"
            @click="handleGoToRegexEditor"
          >
            前往正则编辑器
          </el-button>
        </el-empty>

        <div
          v-else
          class="regex-categories-list"
        >
          <div
            v-for="category in categories"
            :key="category.id"
            class="category-section"
          >
            <div class="category-header">
              <div class="category-title">
                <Icon
                  icon="ph:folder-duotone"
                  class="category-icon"
                />
                <span class="category-name">{{ category.name }}</span>
                <el-tag
                  v-if="category.metadata?.source === 'character-card'"
                  size="small"
                  type="primary"
                >
                  来自角色卡
                </el-tag>
              </div>
              <el-tag size="small">{{ category.scripts.length }} 个脚本</el-tag>
            </div>

            <el-checkbox-group
              v-model="selectedScriptIds"
              class="scripts-list"
            >
              <el-checkbox
                v-for="script in category.scripts"
                :key="script.id"
                :value="script.id"
                class="script-checkbox"
              >
                <div class="script-item">
                  <Icon
                    icon="ph:file-code-duotone"
                    class="script-icon"
                  />
                  <span class="script-name">{{ script.scriptName }}</span>
                  <el-tag
                    v-if="script.disabled"
                    size="small"
                    type="info"
                  >
                    禁用
                  </el-tag>
                </div>
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </el-scrollbar>

      <div class="selector-footer">
        <el-text
          size="small"
          type="info"
        >
          已选择 {{ selectedScriptIds.length }} 个正则脚本
        </el-text>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :disabled="selectedScriptIds.length === 0"
          @click="handleConfirm"
        >
          确认选择 ({{ selectedScriptIds.length }})
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElDialog, ElScrollbar, ElButton, ElTag, ElEmpty, ElCheckbox, ElCheckboxGroup, ElText } from 'element-plus';
import { Icon } from '@iconify/vue';
import { useRegexCollection } from '@/composables/regex/useRegexCollection';
import { useRouter } from 'vue-router';
import type { SillyTavernRegexScript, RegexCategory } from '@/composables/regex/types';

interface Props {
  modelValue: boolean;
  defaultSelectedIds?: string[]; // 默认选中的脚本ID列表
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', scripts: SillyTavernRegexScript[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  defaultSelectedIds: () => [],
});

const emit = defineEmits<Emits>();
const router = useRouter();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const { regexCollection } = useRegexCollection();
const isLoading = ref(false);
const selectedScriptIds = ref<string[]>([]);

// 获取所有分类列表
const categories = computed<RegexCategory[]>(() => {
  return Object.values(regexCollection.value.categories)
    .filter((cat) => cat.scripts.length > 0)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
});

// 获取所有脚本的ID
const allScriptIds = computed(() => {
  return categories.value.flatMap((cat) => cat.scripts.map((s) => s.id));
});

// 全选
const handleSelectAll = () => {
  selectedScriptIds.value = [...allScriptIds.value];
};

// 取消全选
const handleDeselectAll = () => {
  selectedScriptIds.value = [];
};

// 确认选择
const handleConfirm = () => {
  // 根据选中的ID找到对应的脚本对象
  const selectedScripts: SillyTavernRegexScript[] = [];

  for (const category of categories.value) {
    for (const script of category.scripts) {
      if (selectedScriptIds.value.includes(script.id)) {
        // 创建副本，移除 categoryId
        const { categoryId, ...scriptWithoutCategoryId } = script;
        selectedScripts.push(scriptWithoutCategoryId as SillyTavernRegexScript);
      }
    }
  }

  emit('confirm', selectedScripts);
  handleClose();
};

// 关闭对话框
const handleClose = () => {
  emit('update:modelValue', false);
};

// 前往正则编辑器页面
const handleGoToRegexEditor = () => {
  router.push('/regex-editor');
  handleClose();
};

// 监听对话框打开，初始化选中状态
watch(dialogVisible, (newValue) => {
  if (newValue) {
    // 使用默认选中的ID或者初始化为空数组
    selectedScriptIds.value = [...props.defaultSelectedIds];
  }
});
</script>

<style scoped>
.regex-selector-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.selector-actions {
  display: flex;
  gap: 8px;
}

.regex-categories-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.category-section {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  background-color: var(--el-fill-color-extra-light);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.category-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.scripts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.script-checkbox {
  width: 100%;
  margin: 0;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.script-checkbox:hover {
  background-color: var(--el-fill-color-light);
}

.script-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.script-icon {
  font-size: 16px;
  color: var(--el-text-color-secondary);
}

.script-name {
  flex: 1;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.selector-footer {
  padding: 8px 0;
  border-top: 1px solid var(--el-border-color-lighter);
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
