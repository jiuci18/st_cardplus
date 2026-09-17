import type { Ref } from 'vue';
import type { WorldBookCollection, WorldBookEntry } from '@/types/worldbook';
import { ElMessage } from 'element-plus';
import { collectionMoveLocations, createTreeMoveHandlers } from '@/utils/treeMove';

export function useWorldBookDragDrop(
  worldBookCollection: Ref<WorldBookCollection>,
  moveEntryBetweenBooks: (
    fromBookId: string,
    fromEntries: WorldBookEntry[],
    toBookId: string,
    toEntries: WorldBookEntry[],
  ) => boolean | Promise<boolean>,
  updateBookEntries: (bookId: string, entries: WorldBookEntry[]) => void | Promise<void>,
  updateBookOrder: (ids: string[]) => void | Promise<void>,
) {
  const entryKey = (bookId: string, entry: WorldBookEntry) => JSON.stringify([bookId, entry.uid]);
  return createTreeMoveHandlers({
    ...collectionMoveLocations({
      containers: () => Object.values(worldBookCollection.value.books).sort((a, b) => a.order - b.order),
      id: (book) => book.id,
      children: (book) => book.entries.map((entry) => entryKey(book.id, entry)),
      childId: (node) =>
        node.data.isEntry ? entryKey(node.data.bookId ?? node.parent?.data?.id, node.data.raw) : undefined,
      parentId: (node) => node.data.bookId ?? node.parent?.data?.id,
    }),
    commit: async (move) => {
      const { source, target, sourceKeys, targetKeys, sameBucket } = move;
      if (!source.context) {
        await updateBookOrder(targetKeys);
      } else if (sameBucket) {
        const byId = new Map(source.context.entries.map((entry) => [entryKey(source.context!.id, entry), entry]));
        const entries = targetKeys.map((id, order) => ({ ...byId.get(id)!, order }));
        await updateBookEntries(source.context.id, entries);
        ElMessage.success('条目顺序已更新');
      } else {
        const byId = new Map(
          [source.context, target.context!].flatMap((book) =>
            book.entries.map((entry) => [entryKey(book.id, entry), entry] as const),
          ),
        );
        if (
          !(await moveEntryBetweenBooks(
            source.context.id,
            sourceKeys.map((id) => byId.get(id)!),
            target.context!.id,
            targetKeys.map((id) => byId.get(id)!),
          ))
        )
          return false;
        ElMessage.success(`条目已移至 "${target.context!.name}"`);
      }
      return true;
    },
  });
}
