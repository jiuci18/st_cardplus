<template>
  <section class="form-section">
    <div class="title-Btn-add form-section-title">
      <h3 class="title-fixed">
        <Icon
          icon="ph:note-duotone"
          class="form-section-icon"
        />
        角色备注
      </h3>
      <div style="display: flex; gap: 8px; margin-left: 16px">
        <el-button
          type="primary"
          @click="handleAddNote"
        >
          <Icon
            icon="material-symbols:note-add-outline"
            width="18"
            height="18"
            style="margin-right: 4px"
          />
          添加备注
        </el-button>
      </div>
    </div>
    <draggable
      :model-value="localNotes"
      @update:model-value="handleNotesReorder"
      handle=".drag-handle"
      item-key="id"
      animation="200"
      ghost-class="ghost"
      chosen-class="chosen"
      class="form-grid-4-col"
    >
      <template #item="{ element: note }">
        <el-card class="draggable-card">
          <div class="drag-handle">
            <Icon
              icon="material-symbols:drag-indicator"
              width="20"
              height="20"
            />
          </div>
          <el-form-item style="margin-bottom: 0">
            <el-input
              :model-value="note.name"
              @update:model-value="(value) => handleUpdateNoteName(note.id, value)"
              placeholder="备注名称"
            />
          </el-form-item>
          <div
            v-for="(dataItem, dataIndex) in note.data"
            :key="`${note.id}-${dataIndex}`"
            class="cardInput"
          >
            <el-input
              :model-value="dataItem"
              @update:model-value="(value) => handleUpdateNoteData(note.id, Number(dataIndex), value)"
              type="textarea"
              :rows="2"
              :placeholder="`备注内容 ${Number(dataIndex) + 1}`"
            />
            <el-button
              @click="handleRemoveNoteDataItem(note.id, Number(dataIndex))"
              size="small"
            >
              <Icon
                icon="material-symbols:delete-outline"
                width="18"
                height="18"
              />
            </el-button>
          </div>
          <el-button
            type="primary"
            @click="handleAddNoteDataItem(note.id)"
            size="small"
            style="width: 100%; margin-top: 4px"
          >
            添加备注内容
          </el-button>
          <div></div>
          <el-button
            type="danger"
            @click="handleRemoveNote(note.id)"
            style="margin-top: 1rem; width: 100%"
          >
            <Icon
              icon="material-symbols:delete-outline"
              width="18"
              height="18"
              style="margin-right: 4px"
            />
            删除备注
          </el-button>
        </el-card>
      </template>
    </draggable>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ElButton, ElCard, ElFormItem, ElInput } from 'element-plus';
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import type { Note } from '@/types/character/character';

interface Props {
  notes: Note[];
}

interface Emits {
  (e: 'update:notes', notes: Note[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localNotes = ref<Note[]>([]);

const generateNoteId = (): number => {
  const existingIds = new Set(localNotes.value.map((note) => note.id));
  let newId: number;
  do {
    newId = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  } while (existingIds.has(newId));
  return newId;
};

const deepClone = <T,>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

watch(
  () => props.notes,
  (newNotes) => {
    localNotes.value = deepClone(newNotes);
  },
  { deep: true, immediate: true }
);

const emitUpdate = () => {
  emit('update:notes', deepClone(localNotes.value));
};

const findNoteIndex = (id: number): number => {
  return localNotes.value.findIndex((note) => note.id === id);
};

const handleAddNote = () => {
  const newNote: Note = {
    id: generateNoteId(),
    name: '',
    data: [''],
  };
  localNotes.value.push(newNote);
  emitUpdate();
};

const handleRemoveNote = (id: number) => {
  const index = findNoteIndex(id);
  if (index !== -1) {
    localNotes.value.splice(index, 1);
    emitUpdate();
  }
};

const handleUpdateNoteName = (id: number, value: string) => {
  const index = findNoteIndex(id);
  if (index !== -1) {
    localNotes.value[index].name = value;
    emitUpdate();
  }
};

const handleUpdateNoteData = (id: number, dataIndex: number, value: string) => {
  const index = findNoteIndex(id);
  if (index !== -1 && localNotes.value[index].data[dataIndex] !== undefined) {
    localNotes.value[index].data[dataIndex] = value;
    emitUpdate();
  }
};

const handleAddNoteDataItem = (id: number) => {
  const index = findNoteIndex(id);
  if (index !== -1) {
    localNotes.value[index].data.push('');
    emitUpdate();
  }
};

const handleRemoveNoteDataItem = (id: number, dataIndex: number) => {
  const index = findNoteIndex(id);
  if (index !== -1 && localNotes.value[index].data[dataIndex] !== undefined) {
    localNotes.value[index].data.splice(dataIndex, 1);
    emitUpdate();
  }
};

const handleNotesReorder = (newNotes: Note[]) => {
  localNotes.value = deepClone(newNotes);
  emitUpdate();
};
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

.title-Btn-add {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.title-fixed {
  display: flex;
  padding: 4px;
  gap: 8px;
  align-items: center;
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

@media (min-width: 1200px) {
  .form-grid-4-col {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    align-items: flex-start;
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
  gap: 6px;
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

.cardInput {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
}

.cardInput .el-button {
  flex-shrink: 0;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
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
</style>
