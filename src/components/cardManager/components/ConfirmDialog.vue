<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="500"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="confirm-content">
      <div
        v-if="type === 'warning'"
        class="warning-icon"
      >
        <el-icon
          :size="48"
          color="#e6a23c"
        >
          <WarningFilled />
        </el-icon>
      </div>
      <div
        v-else-if="type === 'danger'"
        class="danger-icon"
      >
        <el-icon
          :size="48"
          color="#f56c6c"
        >
          <WarningFilled />
        </el-icon>
      </div>
      <div class="message-text">{{ message }}</div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">{{ cancelText }}</el-button>
        <el-button
          :type="type === 'danger' ? 'danger' : 'primary'"
          @click="emit('confirm')"
          :loading="loading"
        >
          {{ confirmText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { WarningFilled } from '@element-plus/icons-vue';

interface Props {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

withDefaults(defineProps<Props>(), {
  title: '确认操作',
  confirmText: '确认',
  cancelText: '取消',
  type: 'info',
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const dialogVisible = ref(false);
const loading = ref(false);

const open = () => {
  dialogVisible.value = true;
  loading.value = false;
};

const close = () => {
  dialogVisible.value = false;
  loading.value = false;
};

const setLoading = (value: boolean) => {
  loading.value = value;
};

const handleCancel = () => {
  close();
  emit('cancel');
};

defineExpose({
  open,
  close,
  setLoading,
});
</script>

<style scoped>
.confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.warning-icon,
.danger-icon {
  display: flex;
  justify-content: center;
  align-items: center;
}

.message-text {
  text-align: center;
  font-size: 15px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-line;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
