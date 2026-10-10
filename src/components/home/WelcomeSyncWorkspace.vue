<template>
  <section class="workspace-center" aria-label="同步控制区">
    <section class="sync-buffer-panel" aria-labelledby="sync-buffer-title">
      <div class="panel-heading">
        <div>
          <p class="panel-kicker">STAGING</p>
          <h2 id="sync-buffer-title">同步缓冲</h2>
        </div>
        <Icon icon="material-symbols:sync" />
      </div>
      <p class="session-summary">本次会话已编辑 {{ editedItems.length }} 个项目</p>
      <ul v-if="editedItems.length" class="edit-list" aria-label="本次会话编辑记录">
        <li v-for="item in editedItems" :key="`${item.storage}:${item.target}`" class="edit-item">
          <div class="edit-item-heading">
            <strong>{{ targetLabel(item) }}</strong>
            <span>{{ item.count }} 次操作</span>
          </div>
          <code class="edit-target">{{ item.target }}</code>
          <div class="edit-meta">
            <span>{{ item.operations.map(operation => operationLabels[operation]).join(' · ') }}</span>
            <time :datetime="item.lastEditedAt">{{ formatDateTime(item.lastEditedAt) }}</time>
          </div>
          <p v-if="item.fields.length" class="edit-fields">修改字段：{{ item.fields.join('、') }}</p>
        </li>
      </ul>
      <div v-else class="empty-state">
        <Icon icon="material-symbols:sync-problem-outline" />
        <p>本次会话暂无编辑记录</p><span>编辑过的项目会自动记录在这里。</span>
      </div>
    </section>
    <section class="operation-panel" aria-labelledby="operation-panel-title">
      <div>
        <p class="panel-kicker">ACTIONS</p>
        <h2 id="operation-panel-title">操作面板</h2>
      </div>
      <p>资源同步功能正在准备中。当前可在两侧查看资源概况。</p>
      <div class="operation-actions"><el-button type="primary" disabled>
          <Icon icon="material-symbols:cloud-upload" />上传到远端
        </el-button><el-button disabled>
          <Icon icon="material-symbols:cloud-download-outline" />从远端下载
        </el-button></div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useEventListener } from "@vueuse/core";
import { Icon } from "@iconify/vue";
import { formatDateTime } from "@/utils/datetime";
import {
  EDIT_SESSION_CHANGED_EVENT,
  getEditSessionDirectory,
  type EditSessionDirectoryEntry,
  type EditSessionOperation,
} from "@/utils/editSessionTracker";

const directory = shallowRef(getEditSessionDirectory());
useEventListener(window, EDIT_SESSION_CHANGED_EVENT, () => {
  directory.value = getEditSessionDirectory();
});

const editedItems = computed(() =>
  Object.values(directory.value.entries).sort((a, b) => b.lastEditedAt.localeCompare(a.lastEditedAt)),
);
const operationLabels: Record<EditSessionOperation, string> = {
  set: "写入",
  remove: "移除",
  clear: "清空",
  create: "新建",
  update: "修改",
  delete: "删除",
};
const tableLabels: Record<string, string> = {
  books: "世界书",
  entries: "世界书条目",
  characterCards: "角色卡",
  presets: "预设",
  worldProjects: "世界项目",
  worldLandmarks: "地标",
  worldForces: "势力",
  worldRegions: "区域",
};
const targetLabel = (item: EditSessionDirectoryEntry): string => {
  if (item.storage !== "indexedDB") return item.storage;
  const table = item.target.split("/")[0];
  return tableLabels[table] ?? table;
};
</script>

<style scoped>
.workspace-center {
  display: grid;
  grid-template-rows: minmax(300px, 1fr) auto;
  gap: 24px;
  min-width: 0;
}

.sync-buffer-panel,
.operation-panel {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  box-shadow: 0 12px 32px rgb(0 0 0 / 4%);
}

.sync-buffer-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 22px;
}

.operation-panel {
  padding: 22px;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading>.iconify {
  color: var(--el-color-primary);
  font-size: 25px;
}

.panel-kicker {
  margin: 0 0 5px;
  color: var(--el-color-primary);
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .12em;
}

.panel-heading h2,
.operation-panel h2 {
  margin: 0;
  font-size: 1.15rem;
}

.session-summary {
  margin: 14px 0;
  color: var(--el-text-color-secondary);
  font-size: .85rem;
}

.edit-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.edit-item {
  padding: 14px 0;
  border-bottom: 1px solid var(--el-border-color-light);
}

.edit-item-heading,
.edit-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
}

.edit-item-heading strong {
  font-size: .9rem;
}

.edit-item-heading span,
.edit-meta,
.edit-fields {
  color: var(--el-text-color-secondary);
  font-size: .78rem;
  line-height: 1.6;
}

.edit-target {
  display: block;
  margin: 6px 0;
  color: var(--el-text-color-regular);
  font-size: .8rem;
  overflow-wrap: anywhere;
}

.edit-fields {
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}

.empty-state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.empty-state .iconify {
  color: var(--el-color-info-light-3);
  font-size: 44px;
}

.empty-state p {
  margin: 14px 0 5px;
  color: var(--el-text-color-regular);
  font-weight: 600;
}

.empty-state span {
  max-width: 260px;
  font-size: .85rem;
  line-height: 1.5;
}

.operation-panel>p {
  margin: 12px 0 18px;
  color: var(--el-text-color-secondary);
  font-size: .9rem;
  line-height: 1.5;
}

.operation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.operation-actions .el-button {
  margin: 0;
}

@media (max-width: 680px) {
  .workspace-center {
    gap: 16px;
  }

  .edit-list {
    max-height: 420px;
  }
}
</style>
