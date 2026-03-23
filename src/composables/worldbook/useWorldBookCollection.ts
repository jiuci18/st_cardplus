import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { WorldBook, WorldBookCollection, WorldBookEntry } from '../../types/types';
import { v4 as uuidv4 } from 'uuid';
import { processImportedWorldBookData } from './entry/useWorldBookEntryData';
import { worldBookService } from '../../database/worldBookService';
import type { StoredWorldBook } from '../../database/db';
import { nowIso, formatDateTime } from '@/utils/datetime';

const isMessageBoxCancel = (error: unknown): error is 'cancel' | 'close' => error === 'cancel' || error === 'close';

export function useWorldBookCollection() {
  const worldBookCollection = ref<WorldBookCollection>({
    books: {},
    activeBookId: null,
  });
  const isLoading = ref(true);

  const activeBookId = computed(() => worldBookCollection.value.activeBookId);

  const activeBook = computed<WorldBook | null>(() => {
    const bookId = activeBookId.value;
    if (!bookId) return null;
    return worldBookCollection.value.books[bookId] || null;
  });
  const loadInitialData = async () => {
    isLoading.value = true;
    try {
      worldBookCollection.value = await worldBookService.getFullWorldBookCollection();
    } catch (error) {
      console.error('加载世界书数据失败:', error);
      ElMessage.error('加载世界书数据失败！');
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(loadInitialData);

  const handleSelectBook = (bookId: string) => {
    if (worldBookCollection.value.books[bookId]) {
      worldBookCollection.value.activeBookId = bookId;
      worldBookService.setActiveBookId(bookId);
    }
  };

  const handleCreateBook = async () => {
    try {
      const createBookResult = await ElMessageBox.prompt('请输入新世界书的名称：', '创建新世界书', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
      });
      const { value } = createBookResult as { value: string };
      const bookName = value.trim();

      const newBookId = uuidv4();
      const now = nowIso();
      const existingOrders = Object.values(worldBookCollection.value.books).map((b) => b.order);
      const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : -1;

      const newBook: StoredWorldBook = {
        id: newBookId,
        name: bookName,
        createdAt: now,
        updatedAt: now,
        description: `创建于 ${formatDateTime(nowIso())}`,
        order: maxOrder + 1,
      };

      await worldBookService.addBook(newBook);

      // 立即更新本地状态以提高响应性
      worldBookCollection.value.books[newBookId] = { ...newBook, entries: [] };
      worldBookCollection.value.activeBookId = newBookId;
      worldBookService.setActiveBookId(newBookId);

      ElMessage.success(`世界书 "${bookName}" 已创建！`);
    } catch (error) {
      if (isMessageBoxCancel(error)) return;
      ElMessage.error('创建世界书失败');
    }
  };

  const handleRenameBook = async (bookId: string) => {
    const book = worldBookCollection.value.books[bookId];
    if (!book) return;

    try {
      const renameBookResult = await ElMessageBox.prompt('请输入新的名称：', '重命名世界书', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputValue: book.name,
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
      });
      const { value } = renameBookResult as { value: string };
      const newBookName = value.trim();

      if (newBookName === book.name) {
        return;
      }

      const bookToUpdate: StoredWorldBook = {
        id: book.id,
        name: newBookName,
        createdAt: book.createdAt,
        description: book.description,
        metadata: book.metadata,
        order: book.order,
        updatedAt: nowIso(),
      };

      await worldBookService.updateBook(bookToUpdate);

      // 更新本地状态
      book.name = newBookName;
      book.updatedAt = bookToUpdate.updatedAt;

      ElMessage.success('世界书已重命名！');
    } catch (error) {
      if (isMessageBoxCancel(error)) return;
      ElMessage.error('重命名世界书失败');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    const book = worldBookCollection.value.books[bookId];
    if (!book) return;

    try {
      await ElMessageBox.confirm(`确定要删除世界书 "${book.name}" 吗？此操作不可恢复！`, '删除世界书', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      });

      await worldBookService.deleteBook(bookId);

      // 更新本地状态
      delete worldBookCollection.value.books[bookId];
      if (worldBookCollection.value.activeBookId === bookId) {
        const newActiveId = Object.keys(worldBookCollection.value.books)[0] || null;
        worldBookCollection.value.activeBookId = newActiveId;
        worldBookService.setActiveBookId(newActiveId);
      } else if (Object.keys(worldBookCollection.value.books).length === 0) {
        worldBookCollection.value.activeBookId = null;
        worldBookService.setActiveBookId(null);
      }

      ElMessage.success(`世界书 "${book.name}" 已删除`);
    } catch (error) {
      if (isMessageBoxCancel(error)) return;
      ElMessage.error('删除世界书失败');
    }
  };

  const handleImportBookFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);

        if (!jsonData || typeof jsonData !== 'object' || !('entries' in jsonData)) {
          throw new Error('无效的世界书文件格式');
        }

        const loadedEntries = processImportedWorldBookData(jsonData);
        if (loadedEntries === null) {
          throw new Error('处理导入数据时出错');
        }

        const newBookId = uuidv4();
        const now = nowIso();
        const fileName = file.name.replace(/\.json$/i, '').replace(/\.world$/i, '');
        const existingOrders = Object.values(worldBookCollection.value.books).map((b) => b.order);
        const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : -1;

        const newBook: StoredWorldBook = {
          id: newBookId,
          name: jsonData.name || fileName || `导入的世界书`,
          description: jsonData.description || `从文件 ${file.name} 导入`,
          createdAt: now,
          updatedAt: now,
          metadata: jsonData.metadata || {},
          order: maxOrder + 1,
        };

        await worldBookService.addBook(newBook);
        await worldBookService.replaceEntriesForBook(newBook.id, loadedEntries);
        // 从数据库回读条目并回填 id，保持导入顺序
        const saved = await worldBookService.getEntriesForBook(newBook.id);
        const mapByUid = new Map<number | undefined, WorldBookEntry>(saved.map((e) => [e.uid, e]));
        const merged = loadedEntries.map((e) => {
          const m = mapByUid.get(e.uid);
          return m ? { ...e, id: m.id } : e;
        });

        // 更新本地状态
        worldBookCollection.value.books[newBook.id] = { ...newBook, entries: merged };
        worldBookCollection.value.activeBookId = newBook.id;
        worldBookService.setActiveBookId(newBook.id);

        ElMessage.success(`新的世界书 "${newBook.name}" 已成功导入！`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        ElMessage.error(`导入失败: ${errorMessage}`);
      }
    };

    reader.onerror = () => {
      ElMessage.error('读取文件时出错');
    };

    reader.readAsText(file);
  };

  const moveEntryBetweenBooks = async (
    entryToMove: WorldBookEntry,
    fromBookId: string,
    toBookId: string,
    insertIndex: number
  ) => {
    const fromBook = worldBookCollection.value.books[fromBookId];
    const toBook = worldBookCollection.value.books[toBookId];

    if (!fromBook || !toBook) {
      ElMessage.error('移动条目失败：源或目标世界书未找到');
      return;
    }

    const entryIndexInSource = fromBook.entries.findIndex((e) => e.uid === entryToMove.uid);
    if (entryIndexInSource === -1) {
      ElMessage.error('移动条目失败：在源世界书中未找到该条目');
      return;
    }

    const newFromEntries = [...fromBook.entries];
    newFromEntries.splice(entryIndexInSource, 1);

    const newToEntries = [...toBook.entries];
    newToEntries.splice(insertIndex, 0, entryToMove);

    try {
      await Promise.all([
        worldBookService.replaceEntriesForBook(fromBookId, newFromEntries),
        worldBookService.replaceEntriesForBook(toBookId, newToEntries),
      ]);

      // 从数据库读取回填了 id 的条目，并按 uid 顺序合并，确保内存与数据库一致
      const [savedFrom, savedTo] = await Promise.all([
        worldBookService.getEntriesForBook(fromBookId),
        worldBookService.getEntriesForBook(toBookId),
      ]);
      const mapFrom = new Map<number | undefined, WorldBookEntry>(savedFrom.map((e) => [e.uid, e]));
      const mapTo = new Map<number | undefined, WorldBookEntry>(savedTo.map((e) => [e.uid, e]));

      fromBook.entries = newFromEntries.map((e) => {
        const m = mapFrom.get(e.uid);
        return m ? { ...e, id: m.id } : e;
      });
      toBook.entries = newToEntries.map((e) => {
        const m = mapTo.get(e.uid);
        return m ? { ...e, id: m.id } : e;
      });
      const now = nowIso();
      fromBook.updatedAt = now;
      toBook.updatedAt = now;

      // 更新书籍的 updatedAt 字段，使用明确的字段构造
      const fromBookToUpdate: StoredWorldBook = JSON.parse(
        JSON.stringify({
          id: fromBook.id,
          name: fromBook.name,
          description: fromBook.description,
          createdAt: fromBook.createdAt,
          updatedAt: now,
          metadata: fromBook.metadata,
          order: fromBook.order,
        })
      );

      const toBookToUpdate: StoredWorldBook = JSON.parse(
        JSON.stringify({
          id: toBook.id,
          name: toBook.name,
          description: toBook.description,
          createdAt: toBook.createdAt,
          updatedAt: now,
          metadata: toBook.metadata,
          order: toBook.order,
        })
      );

      await Promise.all([worldBookService.updateBook(fromBookToUpdate), worldBookService.updateBook(toBookToUpdate)]);
    } catch (error) {
      ElMessage.error('移动条目时发生错误');
      console.error('moveEntryBetweenBooks error:', error);
      // 可选：在这里重新加载数据以恢复到一致状态
    }
  };

  const updateBookEntries = async (bookId: string, entries: WorldBookEntry[]) => {
    const book = worldBookCollection.value.books[bookId];
    if (book) {
      const now = nowIso();
      await worldBookService.replaceEntriesForBook(bookId, entries);
      // 读取数据库中保存后的条目，按 uid 回填 id，保持传入顺序
      const savedEntries = await worldBookService.getEntriesForBook(bookId);
      const savedByUid = new Map<number | undefined, WorldBookEntry>(savedEntries.map((e) => [e.uid, e]));
      const merged = entries.map((e) => {
        const matched = savedByUid.get(e.uid);
        return matched ? { ...e, id: matched.id } : e;
      });

      // 使用明确的字段构造来避免 Vue 响应式代理问题
      const bookToUpdate: StoredWorldBook = JSON.parse(
        JSON.stringify({
          id: book.id,
          name: book.name,
          description: book.description,
          createdAt: book.createdAt,
          updatedAt: now,
          metadata: book.metadata,
          order: book.order,
        })
      );

      await worldBookService.updateBook(bookToUpdate);

      // 更新本地状态（带正确的数据库 id）
      book.entries = merged;
      book.updatedAt = now;
    }
  };

  const updateBookOrder = async (bookIdsInOrder: string[]) => {
    const now = nowIso();
    const booksToUpdate: Pick<StoredWorldBook, 'id' | 'order' | 'updatedAt'>[] = [];

    bookIdsInOrder.forEach((bookId, index) => {
      const book = worldBookCollection.value.books[bookId];
      if (book && book.order !== index) {
        booksToUpdate.push({ id: book.id, order: index, updatedAt: now });
      }
    });

    if (booksToUpdate.length > 0) {
      await worldBookService.updateBookOrder(booksToUpdate);
      // 更新本地状态
      booksToUpdate.forEach(({ id, order, updatedAt }) => {
        if (worldBookCollection.value.books[id]) {
          worldBookCollection.value.books[id].order = order;
          worldBookCollection.value.books[id].updatedAt = updatedAt;
        }
      });
    }
  };

  const handleUpdateEntry = async (entry: WorldBookEntry) => {
    if (!activeBook.value) {
      console.error('[useWorldBookCollection] 更新条目失败：没有活动书籍');
      ElMessage.error('无法更新条目：没有活动书籍');
      return;
    }
    if (entry.id === undefined && entry.uid === undefined) {
      console.error('[useWorldBookCollection] 更新条目失败：缺少 id 与 uid');
      ElMessage.error('无法更新条目：缺少必要信息');
      return;
    }
    try {
      const entryToUpdate = { ...entry, bookId: activeBook.value.id };
      await worldBookService.updateEntry(entryToUpdate);
    } catch (error) {
      console.error('[useWorldBookCollection] 更新条目失败:', error);
      ElMessage.error('更新条目失败！');
    }
  };

  const handleAddEntry = async (entry: WorldBookEntry): Promise<WorldBookEntry | null> => {
    if (!activeBook.value) {
      ElMessage.error('无法添加条目：缺少活动书籍');
      return null;
    }
    try {
      console.log('添加新条目:', { entry, bookId: activeBook.value.id });
      const newId = await worldBookService.addEntry(activeBook.value.id, entry);
      const newEntry = { ...entry, id: newId };
      console.log('新条目已创建，数据库ID:', newId, '完整条目:', newEntry);

      // 更新本地状态
      activeBook.value.entries.unshift(newEntry);

      const now = nowIso();
      activeBook.value.updatedAt = now;

      // 使用明确的字段构造来避免 Vue 响应式代理问题
      const bookToUpdate: StoredWorldBook = JSON.parse(
        JSON.stringify({
          id: activeBook.value.id,
          name: activeBook.value.name,
          description: activeBook.value.description,
          createdAt: activeBook.value.createdAt,
          updatedAt: now,
          metadata: activeBook.value.metadata,
          order: activeBook.value.order,
        })
      );

      await worldBookService.updateBook(bookToUpdate);

      console.log('条目已添加到本地状态，当前条目数量:', activeBook.value.entries.length);
      return newEntry;
    } catch (error) {
      console.error('添加条目失败:', error);
      ElMessage.error('添加条目失败！');
      return null;
    }
  };

  const handleDeleteEntry = async (entryId: number): Promise<boolean> => {
    if (!activeBook.value) {
      ElMessage.error('无法删除条目：缺少活动书籍');
      return false;
    }

    console.log('尝试从数据库删除条目:', { entryId, bookId: activeBook.value.id });

    try {
      await worldBookService.deleteEntry(entryId);
      console.log('数据库删除成功，更新本地状态');

      // 更新本地状态
      const entryIndex = activeBook.value.entries.findIndex((e) => e.id === entryId);
      if (entryIndex > -1) {
        console.log('找到条目，索引:', entryIndex, '删除前条目数量:', activeBook.value.entries.length);
        activeBook.value.entries.splice(entryIndex, 1);
        console.log('删除后条目数量:', activeBook.value.entries.length);
      } else {
        console.warn('警告：在本地状态中未找到要删除的条目，ID:', entryId);
      }

      const now = nowIso();
      activeBook.value.updatedAt = now;

      // 使用 JSON.parse(JSON.stringify()) 移除 Vue 响应式代理
      const bookToUpdate: StoredWorldBook = JSON.parse(
        JSON.stringify({
          id: activeBook.value.id,
          name: activeBook.value.name,
          description: activeBook.value.description,
          createdAt: activeBook.value.createdAt,
          updatedAt: now,
          metadata: activeBook.value.metadata,
          order: activeBook.value.order,
        })
      );

      await worldBookService.updateBook(bookToUpdate);

      console.log('世界书更新完成');
    } catch (error) {
      console.error('删除条目失败:', error);
      ElMessage.error(`删除条目失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error; // 重新抛出错误以便上层处理
    }
    return activeBook.value.entries.length > 0;
  };

  return {
    worldBookCollection,
    activeBookId,
    activeBook,
    isLoading,
    handleSelectBook,
    handleCreateBook,
    handleRenameBook,
    handleDeleteBook,
    handleImportBookFile,
    moveEntryBetweenBooks,
    updateBookEntries,
    updateBookOrder,
    handleUpdateEntry,
    handleAddEntry,
    handleDeleteEntry,
  };
}
