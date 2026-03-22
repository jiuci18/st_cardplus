<template>
  <div>
    <transition
      name="snapshot-revert"
      appear
    >
      <div
        v-if="sync.state.snapshotAvailable.value"
        class="snapshot-revert-container"
      >
        <p class="snapshot-revert-text">
          已从云端获取新数据
          <br />
          您可以在这里
          <el-button
            type="primary"
            link
            @click="handleRevert"
          >
            撤销
          </el-button>
          此操作，本次会话有效 ，或者
          <el-button
            type="primary"
            style="color: red"
            link
            @click="handleHideSnapshotNotice"
          >
            隐藏
          </el-button>
          这条消息。
        </p>
      </div>
    </transition>
    <StorageInfoCard />
    <SyncCard />
    <LocalDataCard />
    <ClearDataCard />
  </div>
</template>

<script setup lang="ts">
import { syncInjectionKey, useSync } from '@/composables/dataManagement/useSync';
import { onMounted, provide } from 'vue';
import ClearDataCard from './datamanage/ClearDataCard.vue';
import LocalDataCard from './datamanage/LocalDataCard.vue';
import StorageInfoCard from './datamanage/StorageInfoCard.vue';
import SyncCard from './datamanage/SyncCard.vue';

const sync = useSync();
provide(syncInjectionKey, sync);

const handleHideSnapshotNotice = () => {
  sync.actions.clearSnapshot();
};

const handleRevert = async () => {
  await sync.actions.revertLastPull();
};

onMounted(sync.actions.init);
</script>

<style scoped>
/* 子组件卡片间距覆盖 */
:deep(.setting-card) {
  margin-bottom: 16px;
}

/* 快照恢复提示 */
.snapshot-revert-container {
  padding: 8px 12px;
  background-color: var(--el-color-success-light-9);
  border: 1px solid var(--el-color-success-light-5);
  border-radius: 4px;
  margin-bottom: 16px;
  color: var(--el-color-success-dark-2);
}

.snapshot-revert-enter-active,
.snapshot-revert-leave-active {
  transition:
    max-height 240ms ease,
    opacity 240ms ease,
    margin-bottom 240ms ease;
  overflow: hidden;
}

.snapshot-revert-enter-from,
.snapshot-revert-leave-to {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
}

.snapshot-revert-enter-to,
.snapshot-revert-leave-from {
  max-height: 120px;
  opacity: 1;
  margin-bottom: 16px;
}
</style>
