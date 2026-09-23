<template>
  <div class="form-row-responsive">
    <section class="form-section form-group-responsive">
      <h3 class="form-section-title">
        <Icon
          icon="ph:heart-duotone"
          class="form-section-icon"
        />
        喜好系统
      </h3>
      <div class="form-section-content">
        <el-input
          :model-value="form.likes"
          @update:model-value="$emit('update:form-likes', $event)"
          type="textarea"
          :rows="5"
          placeholder="请输入喜好（每行一条）"
        />
        <el-input
          :model-value="form.dislikes"
          @update:model-value="$emit('update:form-dislikes', $event)"
          type="textarea"
          :rows="5"
          placeholder="请输入厌恶（每行一条）"
          style="margin-top: 1rem"
        />
      </div>
    </section>
    <section class="form-section form-group-responsive">
      <h3 class="form-section-title">
        <Icon
          icon="ph:clock-duotone"
          class="form-section-icon"
        />
        日常作息
      </h3>
      <div class="form-section-content">
        <div id="routine-form">
          <FieldTrigger v-for="(field, index) in displayRoutineFields" :key="field.key"
            :label="field.label" :value="field.value" :active="field.key === selectedKey"
            @select="toggleField(field.key, $event)" @remove="removeRoutineField(index)" />
        </div>
        <FieldFloatingPanel v-if="selectedField" title="日常作息编辑" :visible="active"
          :field-key="selectedKey" :anchor="panelAnchor"
          :open-signal="panelOpenSignal" :toggle-signal="panelToggleSignal">
          <FieldEditorPanel :field-key="selectedKey" :label="selectedField.label"
            :model-value="selectedField.value" @update:model-value="updateRoutineFormField(selectedField.key, $event)" />
        </FieldFloatingPanel>
        <el-button
          type="primary"
          size="small"
          @click="addCustomRoutineField"
          style="margin-top: 1rem"
        >
          <Icon
            icon="material-symbols:add"
            width="20"
            height="20"
          />
          添加自定义字段
        </el-button>
      </div>
    </section>
  </div>
  <CharacterNotes
    :notes="form.notes"
    @update:notes="$emit('update:notes', $event)"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, toRefs } from 'vue';
import { ElInput, ElButton } from 'element-plus';
import { Icon } from '@iconify/vue';
import { useBatchCustomFieldPrompt } from '@/composables/characterInfo/useBatchCustomFieldPrompt';
import CharacterNotes from '../CharacterNotes.vue';
import FieldTrigger from '../charinfo/FieldTrigger.vue';
import FieldEditorPanel from '../charinfo/FieldEditorPanel.vue';
import FieldFloatingPanel from '../charinfo/FieldFloatingPanel.vue';

const props = defineProps({
  active: { type: Boolean, default: true },
  form: {
    type: Object,
    required: true,
  },
});

defineEmits(['update:form-likes', 'update:form-dislikes', 'update:notes']);

const { form } = toRefs(props);
const { addFieldsByPrompt } = useBatchCustomFieldPrompt();

interface RoutineField {
  key: string;
  label: string;
  value: string;
}
const displayRoutineFields = ref<RoutineField[]>([]);
const selectedKey = ref<string | null>(null);
const selectedField = computed(() => displayRoutineFields.value.find((field) => field.key === selectedKey.value));
const panelAnchor = ref<{ x: number; y: number } | null>(null);
const panelOpenSignal = ref(0);
const panelToggleSignal = ref(0);

const toggleField = (key: string, event: MouseEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  panelAnchor.value = event.detail === 0
    ? { x: rect.right, y: rect.top }
    : { x: event.clientX, y: event.clientY };
  if (selectedKey.value === key) {
    panelToggleSignal.value++;
  } else {
    selectedKey.value = key;
    panelOpenSignal.value++;
  }
};
const standardRoutineFieldsMap: { [key: string]: string } = {
  earlyMorning: '清晨',
  morning: '上午',
  afternoon: '下午',
  evening: '傍晚',
  night: '夜间',
  lateNight: '深夜',
};

const syncRoutineFields = () => {
  const newFields: RoutineField[] = [];
  if (form.value.dailyRoutine) {
    for (const key in form.value.dailyRoutine) {
      if (Object.prototype.hasOwnProperty.call(form.value.dailyRoutine, key)) {
        const label = standardRoutineFieldsMap[key] || key;
        newFields.push({ key: key, label: label, value: form.value.dailyRoutine[key] });
      }
    }
  }
  displayRoutineFields.value = newFields;
  if (!newFields.some((field) => field.key === selectedKey.value)) selectedKey.value = null;
};

const updateRoutineFormField = (key: string, value: string) => {
  form.value.dailyRoutine[key] = value;
};

const addCustomRoutineField = async () => {
  await addFieldsByPrompt({
    promptMessage: '请输入自定义作息，每行一个。格式: 时间段:作息内容（示例: 午休:在办公室沙发上睡一小时）',
    promptTitle: '添加自定义作息',
    inputPlaceholder: '时间段:作息内容',
    lineFormat: '时间段:作息内容',
    successItemName: '自定义作息',
    errorMessage: '添加自定义作息失败，请稍后重试',
    getFields: () => form.value.dailyRoutine,
    setFields: (fields) => {
      form.value.dailyRoutine = fields;
    },
    reservedLabels: Object.values(standardRoutineFieldsMap),
    onAdded: syncRoutineFields,
  });
};

const removeRoutineField = (index: number) => {
  const fieldToRemove = displayRoutineFields.value[index];
  if (fieldToRemove) {
    delete form.value.dailyRoutine[fieldToRemove.key];
    displayRoutineFields.value.splice(index, 1);
  }
};

onMounted(() => {
  syncRoutineFields();
});

watch(
  () => form.value.dailyRoutine,
  () => {
    syncRoutineFields();
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
.form-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-extra-light);
}

.form-section-title {
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

.form-section-icon {
  font-size: 18px;
  color: #409eff;
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

@media (min-width: 1200px) {
  #routine-form {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    align-items: flex-start;
  }
}
</style>
