import type { Ref } from 'vue';
import type { WorldBookCollection, WorldBookEntry } from '@/types/worldbook';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';
import { ElMessage } from 'element-plus';

type ActualNodeDropType = Exclude<NodeDropType, 'none'>;

export function useWorldBookDragDrop(
  worldBookCollection: Ref<WorldBookCollection>,
  moveEntryBetweenBooks: (
    entryToMove: WorldBookEntry,
    fromBookId: string,
    toBookId: string,
    insertIndex: number
  ) => void,
  updateBookEntries: (bookId: string, entries: WorldBookEntry[]) => void,
  updateBookOrder: (bookIdsInOrder: string[]) => void,
  forceUpdateEntries: () => void
) {
  const allowDrag = (): boolean => {
    return true;
  };

  const allowDrop = (draggingNode: any, dropNode: any, type: AllowDropType): boolean => {
    const isDraggingBook = !draggingNode.data.isEntry;
    const isDropTargetBook = !dropNode.data.isEntry;

    if (isDraggingBook) {
      return isDropTargetBook && type !== 'inner';
    } else {
      if (isDropTargetBook) {
        return type === 'inner';
      } else {
        return type !== 'inner';
      }
    }
  };

  const handleNodeDrop = (draggingNode: any, dropNode: any, dropType: ActualNodeDropType): boolean => {
    const isDraggingBook = !draggingNode.data.isEntry;

    if (isDraggingBook) {
      //   处理世界书排序
      const allBooks = Object.values(worldBookCollection.value.books).sort((a, b) => a.order - b.order);
      const draggingBookId = draggingNode.data.id;
      const dropBookId = dropNode.data.id;

      const oldIndex = allBooks.findIndex((b) => b.id === draggingBookId);
      let newIndex = allBooks.findIndex((b) => b.id === dropBookId);

      if (oldIndex === -1 || newIndex === -1) {
        ElMessage.error('排序失败：找不到世界书 ');
        return false;
      }

      // 根据放置位置调整索引
      if (dropType === 'after') {
        newIndex += 1;
      }

      // 移动书籍
      const [movedBook] = allBooks.splice(oldIndex, 1);
      allBooks.splice(newIndex, 0, movedBook);

      // 获取排序后的ID列表并更新
      const orderedBookIds = allBooks.map((b) => b.id);
      updateBookOrder(orderedBookIds);

      ElMessage.success('世界书顺序已更新 ');
      forceUpdateEntries(); // 强制刷新UI
      return true;
    }

    //   处理条目拖放
    const entryToMove: WorldBookEntry = draggingNode.data.raw;
    const fromBookId: string = draggingNode.parent?.data?.id || draggingNode.data.bookId;

    if (!fromBookId) {
      ElMessage.error('拖拽失败：无法确定源世界书 ');
      return false;
    }

    let toBookId: string;
    let toBook;
    let insertIndex: number;

    if (dropNode.data.isEntry) {
      toBookId = dropNode.parent?.data?.id || dropNode.data.bookId;
      toBook = worldBookCollection.value.books[toBookId];
      const dropEntryIndex = toBook.entries.findIndex((e) => e.uid === dropNode.data.raw.uid);
      if (dropEntryIndex === -1) {
        ElMessage.error('拖拽失败：在目标世界书中找不到定位条目 ');
        return false;
      }
      if (dropType === 'before') {
        insertIndex = dropEntryIndex;
      } else {
        insertIndex = dropEntryIndex + 1;
      }
    } else {
      toBookId = dropNode.data.id;
      toBook = worldBookCollection.value.books[toBookId];
      insertIndex = 0; // 'inner' drop means at the top
    }

    if (!toBook) {
      ElMessage.error('拖拽失败：找不到目标世界书 ');
      return false;
    }

    if (fromBookId === toBookId) {
      const book = worldBookCollection.value.books[fromBookId];
      const newEntries = [...book.entries];
      const oldIndex = newEntries.findIndex((e) => e.uid === entryToMove.uid);
      if (oldIndex > -1) {
        newEntries.splice(oldIndex, 1);
        // Adjust insertIndex if the removal affected it
        const adjustedInsertIndex = oldIndex < insertIndex ? insertIndex - 1 : insertIndex;
        newEntries.splice(adjustedInsertIndex, 0, entryToMove);
        newEntries.forEach((entry, index) => {
          entry.order = index;
        });

        updateBookEntries(fromBookId, newEntries);
        ElMessage.success(`条目顺序已更新`);
      } else {
        ElMessage.error('排序失败：找不到原始条目 ');
        return false;
      }
    } else {
      moveEntryBetweenBooks(entryToMove, fromBookId, toBookId, insertIndex);
      ElMessage.success(`条目已移至 "${toBook.name}"`);
    }

    forceUpdateEntries();
    return true;
  };

  return {
    allowDrag,
    allowDrop,
    handleNodeDrop,
  };
}
