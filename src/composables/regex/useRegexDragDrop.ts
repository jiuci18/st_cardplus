import type { Ref } from 'vue';
import type { RegexScriptCollection, SillyTavernRegexScript } from './types';
import { ElMessage } from 'element-plus';
import { nowIso } from '@/utils/datetime';
import { collectionMoveLocations, createTreeMoveHandlers } from '@/utils/treeMove';

export function useRegexDragDrop(
  regexCollection: Ref<RegexScriptCollection>,
  moveScriptBetweenCategories: (
    fromId: string,
    fromScripts: SillyTavernRegexScript[],
    toId: string,
    toScripts: SillyTavernRegexScript[],
  ) => boolean,
  updateCategoryScripts: (categoryId: string, scripts: SillyTavernRegexScript[]) => void,
) {
  return createTreeMoveHandlers({
    ...collectionMoveLocations({
      containers: () => Object.values(regexCollection.value.categories).sort((a, b) => a.order - b.order),
      id: (category) => category.id,
      children: (category) => category.scripts.map((script) => script.id),
      childId: (node) => (node.data.isScript ? node.data.scriptId : undefined),
      parentId: (node) => node.data.categoryId ?? node.parent?.data?.id,
    }),
    commit: (move) => {
      const { source, target, sourceKeys, targetKeys, sameBucket } = move;
      if (!source.context) {
        const now = nowIso();
        targetKeys.forEach((id, order) =>
          Object.assign(regexCollection.value.categories[id], { order, updatedAt: now }),
        );
        ElMessage.success('类别顺序已更新');
      } else if (sameBucket) {
        const byId = new Map(source.context.scripts.map((script) => [script.id, script]));
        updateCategoryScripts(
          source.context.id,
          targetKeys.map((id) => byId.get(id)!),
        );
      } else {
        const byId = new Map(
          [...source.context.scripts, ...target.context!.scripts].map((script) => [script.id, script]),
        );
        return moveScriptBetweenCategories(
          source.context.id,
          sourceKeys.map((id) => byId.get(id)!),
          target.context!.id,
          targetKeys.map((id) => byId.get(id)!),
        );
      }
      return true;
    },
  });
}
