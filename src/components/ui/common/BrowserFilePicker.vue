<template>
  <span
    v-if="$slots.default"
    class="browser-file-picker"
    @click="handleTriggerClick"
  >
    <slot :open="open" />
  </span>
  <input
    ref="inputRef"
    class="browser-file-picker-input"
    type="file"
    :accept="accept"
    :multiple="multiple"
    :disabled="disabled"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  resetOnSelect?: boolean;
  triggerOnClick?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  accept: '',
  multiple: false,
  disabled: false,
  resetOnSelect: true,
  triggerOnClick: true,
});

const emit = defineEmits<{
  (e: 'select', files: File[]): void;
  (e: 'select-first', file: File): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

const reset = () => {
  if (inputRef.value) {
    inputRef.value.value = '';
  }
};

const open = () => {
  if (props.disabled) return;
  inputRef.value?.click();
};

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);

  if (files.length === 0) {
    return;
  }

  emit('select', files);
  emit('select-first', files[0]);

  if (props.resetOnSelect) {
    reset();
  }
};

const handleTriggerClick = () => {
  if (!props.triggerOnClick) return;
  open();
};

defineExpose({
  open,
  reset,
});
</script>

<style scoped>
.browser-file-picker {
  display: contents;
}

.browser-file-picker-input {
  display: none;
}
</style>
