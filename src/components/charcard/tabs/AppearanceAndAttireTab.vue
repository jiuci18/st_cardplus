<template>
  <section class="form-section">
    <div class="title-Btn-add form-section-title">
      <h3 class="title-fixed">
        <Icon icon="ph:user-focus-duotone" class="form-section-icon" />
        外貌特征
      </h3>
      <div style="display: flex; gap: 8px; margin-left: 16px">
        <el-button type="success" @click="$emit('exportAppearance')" title="导出外貌特征">
          <Icon icon="material-symbols:content-copy-outline" width="18" height="18" />
        </el-button>
      </div>
    </div>
    <div class="form-section-content">
      <p class="whatYouwant">
        <Icon icon="material-symbols:info-outline" width="24" height="24" />
        <span style="margin-left: 4px"></span>
        当你在输入框留空时留空的位置不会被导出，即："不用全部填写"
      </p>
      <div id="appearance-form">
        <div v-for="(field, index) in displayFields" :key="field.key" class="field-cell"
          :class="{ 'is-empty': !field.value }">
          <label class="form-label">{{ field.label }}</label>
          <div class="custom-field-container">
            <el-input type="textarea" :autosize="{ minRows: 1, maxRows: 8 }" v-model="field.value"
              :placeholder="`请输入 ${field.label} 特征`" @input="updateFormField(field.key, field.value)" />
            <el-button text size="small" class="remove-btn"
              :class="{ 'is-confirming': pendingDeleteKey === field.key }"
              :title="pendingDeleteKey === field.key ? '再次点击确认删除' : '删除该字段'"
              @click="handleRemoveField(index)">
              <Icon
                :icon="pendingDeleteKey === field.key ? 'material-symbols:delete-forever-outline' : 'material-symbols:delete-outline'"
                width="18" height="18" />
            </el-button>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 1rem">
        <el-dropdown trigger="click" @command="handleAddField">
          <el-button type="primary" size="small">
            <Icon icon="material-symbols:add" width="20" height="20" />
            添加字段
            <Icon icon="material-symbols:arrow-drop-down" width="18" height="18" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="key in missingStandardFields" :key="key" :command="key">
                {{ standardFieldsMap[key] }}
              </el-dropdown-item>
              <el-dropdown-item v-if="missingStandardFields.length === 0" disabled>
                标准字段已全部添加
              </el-dropdown-item>
              <el-dropdown-item command="__custom__" divided>
                自定义字段…
              </el-dropdown-item>
              <el-dropdown-item command="__batch__">
                批量添加…
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </section>
  <section class="form-section">
    <div class="form-section-title title-Btn-add">
      <h3 class="title-fixed">
        <Icon icon="ph:t-shirt-duotone" class="form-section-icon" />
        服装设定
      </h3>
      <div style="display: flex; gap: 8px; margin-left: 16px">
        <el-button type="primary" @click="$emit('addAttire')">
          <Icon icon="material-symbols:desktop-landscape-add-outline" width="18" height="18"
            style="margin-right: 4px" />
          添加套装（卡片）
        </el-button>
        <el-button type="success" @click="$emit('exportAttires')" title="导出服装设定">
          <Icon icon="material-symbols:content-copy-outline" width="18" height="18" />
        </el-button>
      </div>
    </div>
    <draggable :model-value="form.attires" @update:model-value="$emit('update:attires', $event)" handle=".drag-handle"
      item-key="index" animation="200" ghost-class="ghost" chosen-class="chosen" class="form-grid-4-col">
      <template #item="{ element: attire, index }">
        <el-card class="draggable-card">
          <div class="drag-handle">
            <Icon icon="material-symbols:drag-indicator" width="20" height="20" />
          </div>
          <el-input v-model="attire.name" placeholder="套装名称" />
          <el-input v-model="attire.description" type="textarea" :rows="2" placeholder="套装描述" />
          <el-input v-model="attire.tops" placeholder="上衣" />
          <el-input v-model="attire.bottoms" placeholder="下装" />
          <el-input v-model="attire.shoes" placeholder="鞋子" />
          <el-input v-model="attire.socks" placeholder="袜子" />
          <el-input v-model="attire.underwears" placeholder="内衣" />
          <el-input type="textarea" :rows="5" v-model="attire.accessories" placeholder="配饰 · 自动分组，一行一条" />
          <el-button type="danger" @click="$emit('removeAttire', index)" style="margin-top: 1rem; width: 100%">
            <Icon icon="material-symbols:delete-outline" width="18" height="18" style="margin-right: 4px" />
            删除套装
          </el-button>
        </el-card>
      </template>
    </draggable>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import {
  ElButton,
  ElCard,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElMessage,
  ElMessageBox,
} from 'element-plus';
import { useBatchCustomFieldPrompt } from '@/composables/characterInfo/useBatchCustomFieldPrompt';
import { computed, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  form: {
    type: Object,
    required: true,
  },
  attires: {
    type: Array,
    required: true,
  },
});

defineEmits(['addAttire', 'removeAttire', 'exportAttires', 'exportAppearance', 'update:attires']);

const { form } = toRefs(props);
const { addFieldsByPrompt } = useBatchCustomFieldPrompt();

interface AppearanceField {
  key: string;
  label: string;
  value: string;
}
const displayFields = ref<AppearanceField[]>([]);
const pendingDeleteKey = ref<string | null>(null);
let deleteConfirmationTimer: ReturnType<typeof setTimeout> | undefined;
const standardFieldsMap: { [key: string]: string } = {
  hairColor: '发色',
  hairstyle: '发型',
  eyes: '眼睛',
  nose: '鼻子',
  lips: '嘴唇',
  skin: '皮肤',
  body: '身材',
  breasts: '胸部',
  bust: '胸围',
  waist: '腰围',
  hips: '臀围',
  thighs: '大腿',
  butt: '屁股',
  feet: '足部',
};

const syncFields = () => {
  const newFields: AppearanceField[] = [];
  if (form.value.appearance) {
    for (const key in form.value.appearance) {
      if (Object.prototype.hasOwnProperty.call(form.value.appearance, key)) {
        const label = standardFieldsMap[key] || key;
        newFields.push({ key: key, label: label, value: form.value.appearance[key] });
      }
    }
  }
  displayFields.value = newFields;
};

const updateFormField = (key: string, value: string) => {
  form.value.appearance[key] = value;
};

const missingStandardFields = computed(() =>
  Object.keys(standardFieldsMap).filter((key) => !(form.value.appearance && key in form.value.appearance))
);

const handleAddField = async (command: string) => {
  if (command === '__batch__') {
    await addCustomField();
    return;
  }
  if (command === '__custom__') {
    try {
      const { value } = await ElMessageBox.prompt('请输入自定义字段名（如：纹身、气味）', '添加自定义字段', {
        confirmButtonText: '添加',
        cancelButtonText: '取消',
        inputPlaceholder: '字段名',
      });
      const name = value?.trim();
      if (!name) return;
      if (form.value.appearance && name in form.value.appearance) {
        ElMessage.warning(`字段「${name}」已存在`);
        return;
      }
      form.value.appearance[name] = '';
    } catch {
      // 用户取消
    }
    return;
  }
  if (!form.value.appearance) form.value.appearance = {};
  form.value.appearance[command] = '';
};

const addCustomField = async () => {
  await addFieldsByPrompt({
    promptMessage: '请输入自定义字段，每行一个。格式: 字段名:字段描述（示例: 纹身:淡青色纹身，一条小龙）',
    promptTitle: '添加自定义字段',
    inputPlaceholder: '字段名:字段描述',
    lineFormat: '字段名:字段描述',
    successItemName: '自定义字段',
    errorMessage: '添加自定义字段失败，请稍后重试',
    getFields: () => form.value.appearance,
    setFields: (fields) => {
      form.value.appearance = fields;
    },
    reservedLabels: Object.values(standardFieldsMap),
    onAdded: syncFields,
  });
};

const removeField = (index: number) => {
  const fieldToRemove = displayFields.value[index];
  if (fieldToRemove) {
    delete form.value.appearance[fieldToRemove.key];
    displayFields.value.splice(index, 1);
  }
};

const clearDeleteConfirmation = () => {
  pendingDeleteKey.value = null;
  if (deleteConfirmationTimer) {
    clearTimeout(deleteConfirmationTimer);
    deleteConfirmationTimer = undefined;
  }
};

const handleRemoveField = (index: number) => {
  const field = displayFields.value[index];
  if (!field) return;

  if (pendingDeleteKey.value === field.key) {
    clearDeleteConfirmation();
    removeField(index);
    return;
  }

  clearDeleteConfirmation();
  pendingDeleteKey.value = field.key;
  deleteConfirmationTimer = setTimeout(clearDeleteConfirmation, 3000);
};

onBeforeUnmount(clearDeleteConfirmation);

onMounted(() => {
  syncFields();
});

watch(
  () => form.value.appearance,
  () => {
    syncFields();
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
.character-card-editor-scrollbar {
  height: 100vh;
}

.content-panel-body {
  background: var(--el-bg-color);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  padding: 16px;
}

.character-card-editor-form .form-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-extra-light);
}

.character-card-editor-form .form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.character-card-editor-form .form-section-icon {
  font-size: 18px;
  color: #409eff;
}

.character-card-editor-form .form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  display: block;
}

.form-row-responsive {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .form-row-responsive {
    flex-direction: row;
    gap: 24px;
  }
}

.form-group-responsive {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.form-full-width {
  width: 100%;
}

.form-help-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin: 4px 0 0 0;
  line-height: 1.4;
}

.whatYouwant {
  display: flex;
  align-items: center;
  background-color: var(--el-color-primary-light-9);
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid var(--el-color-primary-light-7);
}

/* 外貌字段：瀑布流（多列布局，按列填充） */
#appearance-form {
  column-width: 260px;
  column-gap: 16px;
}

#appearance-form .field-cell {
  break-inside: avoid;
  margin-bottom: 16px;
}

/* 其他表单仍用网格 */
#routine-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  #routine-form {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

.custom-field-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.remove-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  opacity: 0;
  transition:
    opacity 0.15s,
    color 0.15s;
}

.field-cell:hover .remove-btn,
.remove-btn:focus-visible {
  opacity: 1;
}

.remove-btn:hover {
  color: var(--el-color-danger);
}

.remove-btn.is-confirming {
  color: var(--el-color-danger);
  opacity: 1;
  background: var(--el-color-danger-light-9);
}

/* 触屏设备无 hover，常显删除按钮 */
@media (hover: none) {
  .remove-btn {
    opacity: 1;
  }
}

/* 空值字段淡化提示 */
.field-cell.is-empty .form-label {
  color: var(--el-text-color-secondary);
}

.field-cell.is-empty :deep(.el-textarea__inner::placeholder) {
  font-style: italic;
}

.title-Btn-add {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.form-grid-4-col {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .form-grid-4-col {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.draggable-card {
  position: relative;
  transition: all 0.2s;
  border: 1px solid var(--el-border-color-lighter);
}

.draggable-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.draggable-card:hover {
  border-color: var(--el-border-color-hover);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.drag-handle {
  position: absolute;
  top: 6px;
  right: 4px;
  cursor: grab;
  color: var(--el-text-color-placeholder);
  transition: color 0.2s;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drag-handle:hover {
  color: var(--el-color-primary);
}

.drag-handle:active {
  cursor: grabbing;
}

.ghost {
  opacity: 0.3;
  background-color: var(--el-color-primary-light-8);
  border: 2px dashed var(--el-color-primary);
}

.chosen {
  opacity: 0.8;
  transform: scale(1.02);
  background-color: var(--el-color-primary-light-9) !important;
  border-color: var(--el-color-primary) !important;
}

@media (min-width: 1200px) {
  .form-grid-4-col {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    align-items: flex-start;
  }

  #appearance-form {
    column-width: 300px;
  }

  #routine-form {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    align-items: flex-start;
  }
}

.title-fixed {
  display: flex;
  padding: 4px;
  gap: 8px;
  align-items: center;
}
</style>
