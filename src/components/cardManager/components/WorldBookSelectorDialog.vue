<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择本地世界书"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="worldbook-selector-container">
      <el-scrollbar
        v-loading="isLoading"
        max-height="500px"
      >
        <el-empty
          v-if="!isLoading && worldBooks.length === 0"
          description="暂无可用的世界书"
        >
          <el-button
            type="primary"
            size="small"
            @click="handleGoToWorldBook"
          >
            前往世界书管理
          </el-button>
        </el-empty>

        <div
          v-else
          class="worldbook-list"
        >
          <div
            v-for="book in worldBooks"
            :key="book.id"
            class="worldbook-item"
            :class="{ 'is-selected': selectedBookId === book.id }"
            @click="handleSelectBook(book.id)"
          >
            <div class="worldbook-item-header">
              <div class="worldbook-item-title">
                <Icon
                  icon="ph:book-duotone"
                  class="worldbook-item-icon"
                />
                <span class="worldbook-item-name">{{ book.name }}</span>
              </div>
              <el-tag size="small">{{ book.entries.length }} 条目</el-tag>
            </div>

            <div
              v-if="book.description"
              class="worldbook-item-description"
            >
              {{ book.description }}
            </div>

            <div
              v-if="book.entries.length > 0"
              class="worldbook-item-stats"
            >
              <el-tag
                v-if="constantEntriesCount(book) > 0"
                type="success"
                size="small"
                effect="plain"
              >
                常驻: {{ constantEntriesCount(book) }}
              </el-tag>
              <el-tag
                v-if="disabledEntriesCount(book) > 0"
                type="info"
                size="small"
                effect="plain"
              >
                禁用: {{ disabledEntriesCount(book) }}
              </el-tag>
            </div>

            <!-- 预览条目列表 -->
            <el-collapse
              v-if="selectedBookId === book.id"
              class="worldbook-item-preview"
            >
              <el-collapse-item
                title="预览条目列表"
                name="preview"
              >
                <div class="entry-preview-list">
                  <div
                    v-for="(entry, index) in book.entries.slice(0, 10)"
                    :key="entry.uid || index"
                    class="entry-preview-item"
                  >
                    <Icon
                      :icon="entry.constant ? 'ph:star-fill' : 'ph:note-duotone'"
                      :class="{ 'is-constant': entry.constant, 'is-disabled': entry.disable }"
                    />
                    <span class="entry-preview-comment">
                      {{ entry.comment || `条目 ${index + 1}` }}
                    </span>
                    <el-tag
                      v-if="entry.disable"
                      type="info"
                      size="small"
                      effect="plain"
                    >
                      禁用
                    </el-tag>
                  </div>
                  <div
                    v-if="book.entries.length > 10"
                    class="entry-preview-more"
                  >
                    还有 {{ book.entries.length - 10 }} 个条目...
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :disabled="!selectedBookId"
          @click="handleConfirm"
        >
          确认绑定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElDialog, ElScrollbar, ElButton, ElTag, ElEmpty, ElCollapse, ElCollapseItem } from 'element-plus';
import { Icon } from '@iconify/vue';
import { worldBookService } from '@/database/worldBookService';
import type { WorldBook } from '@/types/worldbook';
import { useRouter } from 'vue-router';

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', bookId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const router = useRouter();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isLoading = ref(false);
const worldBooks = ref<WorldBook[]>([]);
const selectedBookId = ref<string | null>(null);

// 统计常驻条目数量
const constantEntriesCount = (book: WorldBook) => {
  return book.entries.filter((entry) => entry.constant).length;
};

// 统计禁用条目数量
const disabledEntriesCount = (book: WorldBook) => {
  return book.entries.filter((entry) => entry.disable).length;
};

// 加载世界书列表
const loadWorldBooks = async () => {
  isLoading.value = true;
  try {
    const collection = await worldBookService.getFullWorldBookCollection();
    worldBooks.value = Object.values(collection.books).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('加载世界书列表失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 选择世界书
const handleSelectBook = (bookId: string) => {
  selectedBookId.value = bookId;
};

// 确认绑定
const handleConfirm = () => {
  if (selectedBookId.value) {
    emit('confirm', selectedBookId.value);
    handleClose();
  }
};

// 关闭对话框
const handleClose = () => {
  selectedBookId.value = null;
  emit('update:modelValue', false);
};

// 前往世界书管理页面
const handleGoToWorldBook = () => {
  router.push('/worldbook');
  handleClose();
};

// 监听对话框打开，加载数据
watch(dialogVisible, (newValue) => {
  if (newValue) {
    loadWorldBooks();
  }
});
</script>

<style scoped>
.worldbook-selector-container {
  padding: 8px 0;
}

.worldbook-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.worldbook-item {
  padding: 16px;
  border: 2px solid var(--el-border-color-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--el-bg-color);
}

.worldbook-item:hover {
  border-color: var(--el-color-primary-light-5);
  background-color: var(--el-fill-color-extra-light);
}

.worldbook-item.is-selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.worldbook-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.worldbook-item-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.worldbook-item-icon {
  font-size: 20px;
  color: var(--el-color-primary);
}

.worldbook-item-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.worldbook-item-description {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
}

.worldbook-item-stats {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.worldbook-item-preview {
  margin-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
}

.entry-preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.entry-preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.entry-preview-item .iconify {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.entry-preview-item .iconify.is-constant {
  color: var(--el-color-success);
}

.entry-preview-item .iconify.is-disabled {
  color: var(--el-text-color-disabled);
}

.entry-preview-comment {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-preview-more {
  text-align: center;
  padding: 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
