<template>
  <aside class="resource-sidebar" :aria-label="title">
    <SidebarTreePanel :title="title" :tree-data="treeData" :tree-props="treeProps" :default-expanded-keys="expandedKeys"
      node-key="id" @node-click="handleNodeClick">
      <template #header-actions>
        <Icon :icon="headerIcon" class="sidebar-header-icon" />
      </template>
      <template #node="{ node, data }">
        <div class="sidebar-tree-node">
          <div class="sidebar-tree-node-main">
            <Icon :icon="data.icon" class="sidebar-tree-node-icon" /><span class="sidebar-tree-node-label">{{ node.label
              }}</span>
          </div>
          <strong v-if="data.nodeType === 'group'" class="resource-sidebar-node-count">{{ data.count }}</strong>
        </div>
      </template>
      <template v-if="hint" #footer>
        <p class="remote-sidebar-hint">{{ hint }}</p>
      </template>
    </SidebarTreePanel>
  </aside>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import SidebarTreePanel from "@/components/ui/layout/common/SidebarTreePanel.vue";
import type { ResourceTreeNode, TreeNodeContext } from "@/composables/wellcome/useWelcomeResources";

defineProps<{
  title: string;
  headerIcon: string;
  treeData: ResourceTreeNode[];
  treeProps: Record<string, string>;
  expandedKeys: string[];
  hint?: string;
}>();
const emit = defineEmits<{ "node-click": [data: ResourceTreeNode, context?: TreeNodeContext] }>();
const handleNodeClick = (data: ResourceTreeNode, context?: TreeNodeContext): void => emit("node-click", data, context);
</script>

<style scoped>
.resource-sidebar {
  min-height: 0;
  overflow: hidden;
}

.sidebar-header-icon {
  color: var(--el-color-primary);
  font-size: 20px;
}

.sidebar-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
}

.sidebar-tree-node-main {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.sidebar-tree-node-icon {
  flex: none;
  margin-right: 8px;
  color: var(--el-text-color-secondary);
  font-size: 17px;
}

.sidebar-tree-node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-sidebar-node-count {
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font-size: .76rem;
  line-height: 1.45;
  text-align: center;
}

.remote-sidebar-hint {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: .82rem;
  line-height: 1.45;
}
</style>
