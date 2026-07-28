<template>
  <div class="world-page">
    <component :is="activeEditor" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';
import NewWorldEditor from '@/components/WorldEditor.vue';

const activeEditor = shallowRef(NewWorldEditor);
</script>

<style scoped>
.world-page {
  width: 100%;
  height: 100%;
}
</style>
