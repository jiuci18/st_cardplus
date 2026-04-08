<template>
  <div class="character-card-home">
    <!-- 顶部操作栏 -->
    <div class="home-header">
      <div class="home-title-section">
        <h2 class="home-title">角色卡库</h2>
        <span class="home-count">{{ cardCount }} 个角色</span>
      </div>
      <div class="home-actions">
        <el-button
          type="success"
          @click="emit('create-new')"
          :icon="Plus"
        >
          创建角色卡
        </el-button>
        <BrowserFilePicker accept=".json,.png" multiple @select="handleFileChange">
          <el-button :icon="FolderOpened">
            导入文件
          </el-button>
        </BrowserFilePicker>
        <el-dropdown @command="handleMenuCommand">
          <el-button :icon="MoreFilled">更多操作</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                command="export-all"
                :icon="Download"
              >
                导出全部
              </el-dropdown-item>
              <el-dropdown-item
                command="clear-all"
                :icon="Delete"
                divided
              >
                清空所有
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 搜索和筛选区 -->
    <div class="home-filters">
      <el-input
        v-model="searchQuery"
        placeholder="搜索角色卡名称或描述..."
        :prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select
        v-model="selectedTags"
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="按标签筛选"
        clearable
        class="tag-filter"
      >
        <el-option
          v-for="tag in allTags"
          :key="tag"
          :label="tag"
          :value="tag"
        />
      </el-select>
    </div>

    <!-- 角色卡网格 -->
    <el-scrollbar class="home-content">
      <div
        v-if="filteredCards.length === 0"
        class="home-empty"
      >
        <Icon
          icon="ph:cards-duotone"
          class="empty-icon"
        />
        <p class="empty-text">{{ emptyText }}</p>
        <p class="empty-hint">{{ emptyHint }}</p>
      </div>
      <div
        v-else
        class="card-grid"
      >
        <div
          v-for="card in filteredCards"
          :key="card.id"
          class="card-grid-item"
          @click="handleCardClick(card.id, card.name)"
        >
          <div class="card-grid-avatar">
            <img
              v-if="card.avatar && card.avatar !== 'none'"
              :src="card.avatar"
              :alt="card.name"
              class="card-grid-avatar-img"
            />
            <Icon
              v-else
              icon="ph:user-circle-duotone"
              class="card-grid-avatar-icon"
            />
          </div>
          <div class="card-grid-content">
            <h3 class="card-grid-name">{{ card.name || '未命名角色' }}</h3>
            <p class="card-grid-description">{{ card.description || '暂无描述' }}</p>
            <div class="card-grid-meta">
              <span class="card-grid-time">{{ formatTime(card.updatedAt) }}</span>
              <div
                v-if="card.tags && card.tags.length > 0"
                class="card-grid-tags"
              >
                <el-tag
                  v-for="tag in card.tags.slice(0, 3)"
                  :key="tag"
                  type="info"
                  size="small"
                  effect="plain"
                  class="card-grid-tag"
                >
                  {{ tag }}
                </el-tag>
                <span
                  v-if="card.tags.length > 3"
                  class="card-grid-tag-more"
                >
                  +{{ card.tags.length - 3 }}
                </span>
              </div>
            </div>
          </div>
          <div class="card-grid-actions">
            <el-tooltip
              content="重命名"
              placement="top"
            >
              <button
                @click.stop="emit('rename-card', card.id)"
                class="card-action-btn"
              >
                <Icon icon="ph:pencil-simple-duotone" />
              </button>
            </el-tooltip>
            <el-tooltip
              content="导出"
              placement="top"
            >
              <button
                @click.stop="emit('export-card', card.id)"
                class="card-action-btn"
              >
                <Icon icon="ph:export-duotone" />
              </button>
            </el-tooltip>
            <el-tooltip
              content="删除"
              placement="top"
            >
              <button
                @click.stop="emit('delete-card', card.id)"
                class="card-action-btn is-danger"
              >
                <Icon icon="ph:trash-duotone" />
              </button>
            </el-tooltip>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import BrowserFilePicker from '@/components/ui/common/BrowserFilePicker.vue';
import { formatDate, now, toDateSafe } from '@/utils/datetime';
import type { CharacterCardCollection } from '@/types/character/character-card-collection';
import { Delete, Download, FolderOpened, MoreFilled, Plus, Search } from '@element-plus/icons-vue';
import { Icon } from '@iconify/vue';
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElOption,
  ElScrollbar,
  ElSelect,
  ElTag,
  ElTooltip,
} from 'element-plus';
import { computed, ref } from 'vue';

interface Props {
  collection: CharacterCardCollection;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'open-card': [cardId: string, cardName: string];
  'create-new': [];
  'rename-card': [cardId: string];
  'delete-card': [cardId: string];
  'export-card': [cardId: string];
  'export-all': [];
  'import-file': [file: File];
  'clear-all': [];
}>();

const searchQuery = ref('');
const selectedTags = ref<string[]>([]);

// 计算所有卡片
const allCards = computed(() => {
  return Object.values(props.collection.cards).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
});

// 卡片数量
const cardCount = computed(() => allCards.value.length);

// 所有可用标签
const allTags = computed(() => {
  const tags = new Set<string>();
  allCards.value.forEach((card) => {
    card.tags?.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
});

// 筛选后的卡片
const filteredCards = computed(() => {
  let cards = allCards.value;

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    cards = cards.filter(
      (card) => card.name?.toLowerCase().includes(query) || card.description?.toLowerCase().includes(query)
    );
  }

  // 标签过滤
  if (selectedTags.value.length > 0) {
    cards = cards.filter((card) => selectedTags.value.every((tag) => card.tags?.includes(tag)));
  }

  return cards;
});

// 空状态文本
const emptyText = computed(() => {
  if (searchQuery.value || selectedTags.value.length > 0) {
    return '未找到匹配的角色卡';
  }
  return '还没有保存的角色卡';
});

const emptyHint = computed(() => {
  if (searchQuery.value || selectedTags.value.length > 0) {
    return '尝试调整搜索条件';
  }
  return '点击"创建角色卡"按钮开始';
});

// 点击卡片
const handleCardClick = (cardId: string, cardName: string) => {
  emit('open-card', cardId, cardName);
};

// 文件选择变化
const handleFileChange = (files: File[]) => {
  if (files.length > 0) {
    files.forEach((file) => emit('import-file', file));
  }
};

// 下拉菜单命令
const handleMenuCommand = (command: string) => {
  if (command === 'export-all') {
    emit('export-all');
  } else if (command === 'clear-all') {
    emit('clear-all');
  }
};

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = toDateSafe(timeStr);
  if (!date) {
    return '未知时间';
  }

  const diffMs = now().getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  }

  return formatDate(date);
};
</script>

<style scoped>
.character-card-home {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--el-bg-color-page);
}

/* 顶部操作栏 */
.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.home-title-section {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.home-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.home-count {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.home-actions {
  display: flex;
  gap: 8px;
}

/* 搜索和筛选区 */
.home-filters {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.tag-filter {
  width: 240px;
}

/* 内容区 */
.home-content {
  flex: 1;
  padding: 24px;
}

/* 空状态 */
.home-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.4;
}

.empty-text {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 500;
}

.empty-hint {
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
}

/* 网格布局 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding-top: 4px;
  padding-bottom: 24px;
}

.card-grid-item {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-grid-item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-grid-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 16px;
  flex-shrink: 0;
  background-color: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-grid-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-grid-avatar-icon {
  font-size: 48px;
  color: var(--el-text-color-placeholder);
}

.card-grid-content {
  flex: 1;
  text-align: center;
}

.card-grid-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-grid-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 40px;
}

.card-grid-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.card-grid-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.card-grid-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

.card-grid-tag {
  font-size: 11px;
  height: 20px;
  padding: 0 8px;
  line-height: 20px;
}

.card-grid-tag-more {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.card-grid-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.card-grid-item:hover .card-grid-actions {
  opacity: 1;
}

.card-action-btn {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  padding: 6px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  border-radius: 4px;
  font-size: 16px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.card-action-btn:hover {
  background-color: var(--el-fill-color);
  border-color: var(--el-border-color);
  color: var(--el-text-color-primary);
}

.card-action-btn.is-danger:hover {
  background-color: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger);
  color: var(--el-color-danger);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 768px) {
  .home-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 12px 16px;
  }

  .home-title-section {
    justify-content: center;
  }

  .home-actions {
    justify-content: center;
    gap: 6px;
  }

  .home-actions :deep(.el-button) {
    padding: 5px 10px;
    font-size: 12px;
    height: 28px;
  }

  .home-actions :deep(.el-button .el-icon) {
    font-size: 14px;
  }

  .home-filters {
    flex-direction: column;
  }

  .search-input {
    max-width: none;
  }

  .tag-filter {
    width: 100%;
  }

  .home-content {
    padding: 16px;
  }

  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }
}
</style>
