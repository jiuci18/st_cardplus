<template>
  <div class="not-found-container">
    <el-result
      icon="warning"
      title="404"
      sub-title="页面未找到"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="router.push('/')"
        >
          返回首页
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ElResult, ElButton } from 'element-plus';

const router = useRouter();

</script>

<style scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}
</style>
