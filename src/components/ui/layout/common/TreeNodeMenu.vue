<template>
  <div v-if="items.length" class="tree-node-menu" @contextmenu.prevent.stop="openMenu">
    <div class="tree-node-menu-content">
      <slot />
      <button type="button" class="sidebar-tree-node-action-button tree-node-menu-trigger" aria-label="打开节点菜单"
        @click.stop="openMenu" @dblclick.stop @pointerdown.stop>
        <Icon icon="ph:dots-three-bold" />
      </button>
    </div>
    <el-dropdown ref="dropdown" :trigger="[]" virtual-triggering :virtual-ref="virtualRef"
      placement="bottom-start" :show-arrow="false" :popper-options="{ modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] }"
      @command="emit('select', $event)">
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="item in items" :key="item.key" :command="item.key" :disabled="item.disabled"
          :divided="item.divided" :class="{ 'tree-menu-danger': item.danger }">
          <Icon v-if="item.icon" :icon="item.icon" class="tree-menu-icon" />{{ item.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
    </el-dropdown>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';
import type { TreeMenuItem } from './treeMenu';
defineProps<{ items: TreeMenuItem[] }>();
const emit = defineEmits<{ select: [key: string] }>();
const dropdown = ref<InstanceType<typeof ElDropdown>>();
const position = ref({ x: 0, y: 0 });
const virtualRef = {
  getBoundingClientRect: () => new DOMRect(position.value.x, position.value.y, 0, 0),
};
const openMenu = async (event: MouseEvent) => {
  dropdown.value?.handleClose();
  // Keyboard activation has no pointer coordinates; anchor to the menu button.
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  position.value = event.detail === 0 && event.type === 'click'
    ? { x: rect.left, y: rect.bottom }
    : { x: event.clientX, y: event.clientY };
  await nextTick();
  dropdown.value?.handleOpen();
};
</script>

<style scoped>
.tree-node-menu,
.tree-node-menu-content {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  color: inherit;
  font-size: inherit;
}

.tree-node-menu-trigger {
  flex-shrink: 0;
}

.tree-menu-icon {
  margin-right: 8px;
}

.tree-menu-danger:not(.is-disabled) {
  color: var(--el-color-danger);
}
</style>
