<template>
  <a
    v-bind="$attrs"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    data-external-link="true"
    @click="handleClick"
  >
    <slot>{{ href }}</slot>
  </a>
</template>

<script setup lang="ts">
import { openExternalUrl } from '@/utils/externalLink';

const props = defineProps<{
  href: string;
  disabled?: boolean;
}>();

const handleClick = (event: MouseEvent) => {
  if (props.disabled) {
    event.preventDefault();
    return;
  }

  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();
  void openExternalUrl(props.href).catch((error) => {
    console.error('打开外部链接失败:', error);
  });
};
</script>
