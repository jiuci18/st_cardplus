import type { Ref } from 'vue';
import type { EnhancedLandmark, EnhancedForce, EnhancedRegion } from '@/types/worldeditor/world-editor';
import { collectDescendantIds, getParentLandmarkId, setLandmarkParent } from '@/utils/worldeditor/landmarkHierarchy';
import { applyKeyOrder, createTreeMoveHandlers, type MoveBucket } from '@/utils/treeMove';

type Item = EnhancedLandmark | EnhancedForce | EnhancedRegion;
type Kind = 'landmark' | 'force' | 'region';
interface Context {
  kind: Kind;
  projectId: string;
  parentId: string | null;
}

export function useDragAndDrop(
  landmarks: Ref<EnhancedLandmark[]>,
  forces: Ref<EnhancedForce[]>,
  regions: Ref<EnhancedRegion[]>,
) {
  const lists = { landmark: landmarks, force: forces, region: regions };
  const bucket = (context: Context): MoveBucket<Context> => ({
    id: JSON.stringify([context.kind, context.projectId, context.parentId]),
    context,
    keys: lists[context.kind].value
      .filter(
        (item) =>
          item.projectId === context.projectId &&
          (context.kind !== 'landmark' || getParentLandmarkId(item as EnhancedLandmark) === context.parentId),
      )
      .map((item) => item.id),
  });
  const locate = (node: any) => {
    const kind = node?.data?.type as Kind;
    const item = lists[kind]?.value.find((item) => item.id === node.data.id);
    return item
      ? {
          key: item.id,
          bucket: bucket({
            kind,
            projectId: item.projectId,
            parentId: kind === 'landmark' ? getParentLandmarkId(item as EnhancedLandmark) : null,
          }),
        }
      : undefined;
  };
  return createTreeMoveHandlers<Context, boolean>({
    locate,
    container: (node, source) => {
      const kind = source.bucket.context.kind;
      if (node.data.type === 'landmark' && kind === 'landmark') {
        const target = locate(node);
        return target ? bucket({ kind, projectId: target.bucket.context.projectId, parentId: target.key }) : undefined;
      }
      const projectId = node.data.type === 'project' ? node.data.id : node.parent?.data?.id;
      return projectId ? bucket({ kind, projectId, parentId: null }) : undefined;
    },
    innerPosition: 'end',
    canDrag: (node) => Boolean(lists[node?.data?.type as Kind]),
    canDrop: (source, target, type) => {
      const from = source?.data;
      const to = target?.data;
      if (!from || !to || from.id === to.id) return false;
      if (from.type === 'landmark' && collectDescendantIds(landmarks.value, from.id).has(to.id)) return false;
      if (type === 'inner')
        return (
          to.type === 'project' ||
          (!to.isEntry && target.parent?.data?.type === 'project') ||
          (from.type === 'landmark' && to.type === 'landmark')
        );
      return from.type === to.type && Boolean(lists[from.type as Kind]);
    },
    commit: (move) => {
      const { kind, projectId, parentId } = move.target.context;
      const id = move.movingKeys[0];
      const list = lists[kind] as Ref<Item[]>;
      const item = list.value.find((item) => item.id === id)!;
      if (kind === 'landmark') {
        const descendants = collectDescendantIds(landmarks.value, id);
        if (parentId && (parentId === id || descendants.has(parentId))) return false;
        for (const landmark of landmarks.value) {
          if (landmark.id === id || descendants.has(landmark.id)) landmark.projectId = projectId;
        }
        setLandmarkParent(landmarks.value, id, parentId);
      } else item.projectId = projectId;
      list.value = applyKeyOrder(list.value, move.targetKeys, (item) => item.id);
      return true;
    },
  });
}
