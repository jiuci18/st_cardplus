<script setup lang="ts">
import { getIconifyIconName } from '@/config/menuConfig';
import { getHiddenMenuItems, type MenuItemConfig } from '@/utils/localStorageUtils';
import { Icon } from '@iconify/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

// 工具箱项目类型
interface ToolboxDisplayItem {
  id: string;
  title: string;
  icon: string;
  description: string;
  route: string;
}

// 隐藏的菜单项
const hiddenMenuItems = ref<MenuItemConfig[]>([]);

const toolboxTools = computed((): ToolboxDisplayItem[] => {
  return hiddenMenuItems.value
    .filter((item) => item.route.startsWith('/toolbox/') && item.route !== '/toolbox')
    .map((item) => ({
      id: item.id,
      title: item.title,
      icon: getIconifyIconName(item.icon),
      description: item.description || '工具箱条目',
      route: item.route,
    }));
});

const hiddenSidebarItems = computed((): ToolboxDisplayItem[] => {
  return hiddenMenuItems.value
    .filter((item) => {
      return item.route !== '/toolbox' && !item.route.startsWith('/toolbox/');
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      icon: getIconifyIconName(item.icon),
      description: item.description || '从导航栏隐藏的菜单项',
      route: item.route,
    }));
});

// 刷新隐藏项目
const refreshHiddenItems = () => {
  hiddenMenuItems.value = getHiddenMenuItems();
};

// 监听导航栏配置变化
const handleSidebarConfigChange = () => {
  refreshHiddenItems();
};

onMounted(() => {
  refreshHiddenItems();
  window.addEventListener('sidebarConfigChange', handleSidebarConfigChange as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('sidebarConfigChange', handleSidebarConfigChange as EventListener);
});
</script>

<template>
  <div class="toolbox-wrapper">
    <div class="toolbox-container">
      <h1>工具箱</h1>

      <!-- 工具箱条目 -->
      <div
        v-if="toolboxTools.length > 0"
        class="section"
      >
        <h2 class="section-title">工具</h2>
        <div class="tools-grid">
          <el-card
            v-for="tool in toolboxTools"
            :key="tool.id"
            class="tool-card"
            shadow="hover"
            @click="$router.push(tool.route)"
          >
            <div class="card-content">
              <Icon
                :icon="tool.icon"
                width="48"
                height="48"
              />
              <h3>{{ tool.title }}</h3>
              <p>{{ tool.description }}</p>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 来自导航栏的项目 -->
      <div
        v-if="hiddenSidebarItems.length > 0"
        class="section"
      >
        <h2 class="section-title">
          <Icon
            icon="heroicons:eye-slash"
            width="20"
            height="20"
          />
          来自导航栏 ({{ hiddenSidebarItems.length }})
        </h2>
        <p class="section-description">这些项目已从导航栏隐藏，可在此快速访问</p>

        <div class="hidden-items-grid">
          <div
            v-for="item in hiddenSidebarItems"
            :key="item.id"
            class="hidden-item-card"
            @click="$router.push(item.route)"
          >
            <Icon
              :icon="item.icon"
              width="24"
              height="24"
              class="hidden-item-icon"
            />
            <div class="hidden-item-info">
              <span class="hidden-item-title">{{ item.title }}</span>
              <span
                v-if="item.description"
                class="hidden-item-description"
              >
                {{ item.description }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbox-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 1.25rem;
}

.toolbox-container {
  width: 100%;
  max-width: 72rem;
}

.section {
  margin-bottom: 2.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  line-height: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--el-text-color-primary);
}

.section-description {
  font-size: 0.875rem;
  line-height: 1.25rem;
  margin-bottom: 1rem;
  color: var(--el-text-color-secondary);
}

/* 固定工具样式 */
.tools-grid {
  display: grid;
  gap: 1.25rem;
  margin-top: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

.tool-card {
  cursor: pointer;
  transition-property: transform;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.tool-card:hover {
  transform: translateY(-0.375rem);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.25rem;
}

.card-content h3 {
  margin-top: 0.625rem;
  margin-bottom: 0.625rem;
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: 600;
}

.card-content p {
  margin: 0;
  line-height: 1.625;
  color: var(--el-text-color-secondary);
}

/* 隐藏项目小卡片样式 */
.hidden-items-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.hidden-item-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition-property: all;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  background-color: var(--el-bg-color-overlay);
  border: 1px dashed var(--el-color-info);
}

.hidden-item-card:hover {
  transform: translateY(-0.125rem);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.hidden-item-icon {
  flex-shrink: 0;
  color: var(--el-color-info);
}

.hidden-item-card:hover .hidden-item-icon {
  color: var(--el-color-primary);
}

.hidden-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1 1 0%;
  min-width: 0;
}

.hidden-item-title {
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  line-height: 1.25;
  color: var(--el-text-color-primary);
}

.hidden-item-description {
  font-size: 0.75rem;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .toolbox-wrapper {
    padding: 1rem;
  }

  .tools-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .hidden-items-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .hidden-item-card {
    padding: 0.625rem 0.75rem;
  }
}
</style>
