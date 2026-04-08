import type { Ref } from 'vue';
import type { EnhancedLandmark, EnhancedForce, EnhancedRegion } from '@/types/worldeditor/world-editor';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';
import { collectDescendantIds, setLandmarkParent } from '@/utils/worldeditor/landmarkHierarchy';

type ActualNodeDropType = Exclude<NodeDropType, 'none'>;

export function useDragAndDrop(
  landmarks: Ref<EnhancedLandmark[]>,
  forces: Ref<EnhancedForce[]>,
  regions: Ref<EnhancedRegion[]>
) {
  const allowDrag = (draggingNode: any) => {
    const type = draggingNode.data.type;
    return type === 'landmark' || type === 'force' || type === 'region';
  };

  const allowDrop = (draggingNode: any, dropNode: any, type: AllowDropType) => {
    const draggedType = draggingNode.data.type;
    const dropType = dropNode.data.type;
    const dropIsCategory = !dropNode.data.isEntry;

    if (draggingNode.data.id === dropNode.data.id) {
      return false;
    }

    if (dropIsCategory && type !== 'inner') {
      return false;
    }

    if (dropType === 'project' && type === 'inner') return true;
    if (dropIsCategory && type === 'inner') {
      const dropParentType = dropNode.parent.data.type;
      if (dropParentType === 'project') return true;
    }

    if (draggedType === dropType && (type === 'prev' || type === 'next')) {
      return true;
    }

    if (draggedType === 'landmark' && dropType === 'landmark' && type === 'inner') {
      const draggedId = draggingNode.data.id as string;
      const dropId = dropNode.data.id as string;
      if (draggedId === dropId) return false;
      const descendants = collectDescendantIds(landmarks.value, draggedId);
      return !descendants.has(dropId);
    }

    return false;
  };

  const handleNodeDrop = (draggingNode: any, dropNode: any, dropType: ActualNodeDropType): boolean => {
    const draggedItem = draggingNode.data.raw;
    const dropItemRaw = dropNode.data.raw;

    if ('importance' in draggedItem) {
      // Dragged item is a Landmark
      const list = landmarks.value;
      const fromIndex = list.findIndex((item) => item.id === draggedItem.id);
      if (fromIndex === -1) return false;

      const parentNodeData = dropNode.parent?.data;
      const dropParentLandmarkId = parentNodeData?.type === 'landmark' ? (parentNodeData.id as string) : null;

      let newProjectId: string | null = null;
      let newParentId: string | null = null;

      if (dropNode.data.type === 'landmark') {
        newProjectId = dropItemRaw.projectId;
        newParentId = dropType === 'inner' ? dropItemRaw.id : dropParentLandmarkId;
      } else if (dropNode.data.type === 'project') {
        newProjectId = dropNode.data.id;
        newParentId = null;
      } else if (!dropNode.data.isEntry) {
        newProjectId = dropNode.parent.data.id;
        newParentId = null;
      } else if ('projectId' in dropItemRaw && draggedItem.projectId !== dropItemRaw.projectId) {
        newProjectId = dropItemRaw.projectId;
      }

      const projectChanged = newProjectId !== null && draggedItem.projectId !== newProjectId;

      if (newParentId) {
        const descendants = collectDescendantIds(list, draggedItem.id);
        if (descendants.has(newParentId)) return false;
      }

      if (projectChanged) {
        const descendantIds = collectDescendantIds(list, draggedItem.id);
        descendantIds.add(draggedItem.id);
        descendantIds.forEach((id) => {
          const item = list.find((landmark) => landmark.id === id);
          if (item && newProjectId) {
            item.projectId = newProjectId;
          }
        });
      }

      setLandmarkParent(list, draggedItem.id, newParentId);

      if (dropType === 'inner') {
        return true;
      }

      if (projectChanged) {
        const [item] = list.splice(fromIndex, 1);
        list.unshift(item);
        return true;
      }

      const toIndex = list.findIndex((item) => item.id === dropItemRaw.id);
      if (toIndex === -1) return false;

      const [item] = list.splice(fromIndex, 1);
      const insertIndex = dropType === 'before' ? toIndex : toIndex + 1;
      list.splice(insertIndex, 0, item);
      return true;
    } else if ('power' in draggedItem) {
      // Dragged item is a Force
      const list = forces.value;
      const fromIndex = list.findIndex((item) => item.id === draggedItem.id);
      if (fromIndex === -1) return false;

      let newProjectId: string | null = null;
      if (dropNode.data.type === 'project') {
        newProjectId = dropNode.data.id;
      } else if (!dropNode.data.isEntry) {
        newProjectId = dropNode.parent.data.id;
      } else if ('projectId' in dropItemRaw && draggedItem.projectId !== dropItemRaw.projectId) {
        newProjectId = dropItemRaw.projectId;
      }

      if (newProjectId && draggedItem.projectId !== newProjectId) {
        draggedItem.projectId = newProjectId;
        const [item] = list.splice(fromIndex, 1);
        list.unshift(item);
        return true;
      }

      if (dropType === 'inner' || !('projectId' in dropItemRaw)) return false;

      const toIndex = list.findIndex((item) => item.id === dropItemRaw.id);
      if (toIndex === -1) return false;

      const [item] = list.splice(fromIndex, 1);
      const insertIndex = dropType === 'before' ? toIndex : toIndex + 1;
      list.splice(insertIndex, 0, item);
      return true;
    } else {
      // Dragged item is a Region
      const list = regions.value;
      const fromIndex = list.findIndex((item) => item.id === draggedItem.id);
      if (fromIndex === -1) return false;

      let newProjectId: string | null = null;
      if (dropNode.data.type === 'project') {
        newProjectId = dropNode.data.id;
      } else if (!dropNode.data.isEntry) {
        newProjectId = dropNode.parent.data.id;
      } else if ('projectId' in dropItemRaw && draggedItem.projectId !== dropItemRaw.projectId) {
        newProjectId = dropItemRaw.projectId;
      }

      if (newProjectId && draggedItem.projectId !== newProjectId) {
        draggedItem.projectId = newProjectId;
        const [item] = list.splice(fromIndex, 1);
        list.unshift(item);
        return true;
      }

      if (dropType === 'inner' || !('projectId' in dropItemRaw)) return false;

      const toIndex = list.findIndex((item) => item.id === dropItemRaw.id);
      if (toIndex === -1) return false;

      const [item] = list.splice(fromIndex, 1);
      const insertIndex = dropType === 'before' ? toIndex : toIndex + 1;
      list.splice(insertIndex, 0, item);
      return true;
    }
  };

  return {
    allowDrag,
    allowDrop,
    handleNodeDrop,
  };
}
