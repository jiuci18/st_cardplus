import { computed, type Ref } from 'vue';
import type { AllowDropType, NodeDropType } from 'element-plus/es/components/tree/src/tree.type';
import type { CharacterCard, CharacterProject } from '../../types/character';

export interface CharacterOrderPatch {
  id: string;
  order: number;
  projectId: string | null;
}

type TreeNodeType = 'project' | 'character';

interface UseCharacterProjectTreeOptions {
  characters: Ref<CharacterCard[]>;
  projects: Ref<CharacterProject[]>;
  onReorderCharacters: (patches: CharacterOrderPatch[]) => void;
  onReorderProjects: (orderedIds: string[]) => void;
  onSelectCharacter: (id: string) => void;
}

export function useCharacterProjectTree(options: UseCharacterProjectTreeOptions) {
  const treeProps = {
    children: 'children',
    label: 'label',
  };

  const sortedCharacters = computed(() => {
    return options.characters.value
      .filter((character) => !!character.meta.id)
      .slice()
      .sort((a, b) => {
        const aStarred = !!a.meta.starred;
        const bStarred = !!b.meta.starred;
        if (aStarred !== bStarred) {
          return aStarred ? -1 : 1;
        }
        const aOrder = a.meta.order ?? 0;
        const bOrder = b.meta.order ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.data.chineseName || '').localeCompare(b.data.chineseName || '');
      });
  });

  const groupedCharacters = computed(() => {
    const groups: Record<string, CharacterCard[]> = {};
    sortedCharacters.value.forEach((character) => {
      const key = character.meta.projectId ?? '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(character);
    });
    return groups;
  });

  const treeData = computed(() => {
    const projectNodes = options.projects.value
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((project) => ({
        id: `project:${project.id}`,
        label: project.name,
        nodeType: 'project' as TreeNodeType,
        icon: 'ph:folder-duotone',
        projectId: project.id,
        children: (groupedCharacters.value[project.id] || []).map((character) => ({
          id: character.meta.id as string,
          label: character.data.chineseName || '未命名角色',
          nodeType: 'character' as TreeNodeType,
          icon: 'ph:user-circle-duotone',
          projectId: project.id,
          raw: character,
        })),
      }));

    const ungroupedCharacters = (groupedCharacters.value[''] || []).map((character) => ({
      id: character.meta.id as string,
      label: character.data.chineseName || '未命名角色',
      nodeType: 'character' as TreeNodeType,
      icon: 'ph:user-circle-duotone',
      projectId: null,
      raw: character,
    }));

    return [...projectNodes, ...ungroupedCharacters];
  });

  const allowDrag = (draggingNode: any) => {
    const nodeType = draggingNode?.data?.nodeType as TreeNodeType | undefined;
    return nodeType === 'character' || nodeType === 'project';
  };

  const allowDrop = (draggingNode: any, dropNode: any, type: AllowDropType) => {
    const draggingType = draggingNode?.data?.nodeType as TreeNodeType | undefined;
    const dropType = dropNode?.data?.nodeType as TreeNodeType | undefined;
    if (!draggingType || !dropType) return false;

    if (draggingType === 'project') {
      if (type === 'inner') return false;
      return dropType === 'project';
    }

    if (draggingType !== 'character') return false;

    if (type === 'inner') {
      return dropType === 'project';
    }

    if (dropType === 'project') return false;
    if (dropType !== 'character') return false;
    return Boolean(draggingNode?.data?.raw?.meta?.starred) === Boolean(dropNode?.data?.raw?.meta?.starred);
  };

  const reorderProjectNodes = (draggingNode: any, dropNode: any, type: Exclude<NodeDropType, 'none'>) => {
    const draggingProjectId = draggingNode?.data?.projectId as string | undefined;
    const dropProjectId = dropNode?.data?.projectId as string | undefined;
    if (!draggingProjectId || !dropProjectId || type === 'inner') return false;

    const currentIds = options.projects.value
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((project) => project.id);

    const fromIndex = currentIds.indexOf(draggingProjectId);
    const toIndex = currentIds.indexOf(dropProjectId);
    if (fromIndex < 0 || toIndex < 0) return false;

    currentIds.splice(fromIndex, 1);
    const normalizedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    const insertIndex = type === 'before' ? normalizedToIndex : normalizedToIndex + 1;
    currentIds.splice(insertIndex, 0, draggingProjectId);

    options.onReorderProjects(currentIds);
    return true;
  };

  const buildCharacterOrderPatches = (draggingNode: any, dropNode: any, type: Exclude<NodeDropType, 'none'>): CharacterOrderPatch[] => {
    const draggingId = draggingNode?.data?.id as string | undefined;
    if (!draggingId) return [];
    if (type !== 'inner' && dropNode?.data?.id === draggingId) return [];

    const characters = sortedCharacters.value;
    const byId = new Map<string, CharacterCard>();
    characters.forEach((character) => {
      if (character.meta.id) byId.set(character.meta.id, character);
    });

    const draggingCharacter = byId.get(draggingId);
    if (!draggingCharacter) return [];

    const bucketKeyOf = (projectId: string | null | undefined, starred: boolean) => `${projectId ?? ''}::${starred ? '1' : '0'}`;
    const bucketMap = new Map<string, string[]>();

    characters.forEach((character) => {
      const id = character.meta.id;
      if (!id) return;
      const key = bucketKeyOf(character.meta.projectId ?? null, !!character.meta.starred);
      if (!bucketMap.has(key)) {
        bucketMap.set(key, []);
      }
      bucketMap.get(key)?.push(id);
    });

    const sourceKey = bucketKeyOf(draggingCharacter.meta.projectId ?? null, !!draggingCharacter.meta.starred);
    const sourceBucket = bucketMap.get(sourceKey);
    if (!sourceBucket) return [];

    const sourceIndex = sourceBucket.indexOf(draggingId);
    if (sourceIndex < 0) return [];
    sourceBucket.splice(sourceIndex, 1);

    let targetProjectId: string | null = draggingCharacter.meta.projectId ?? null;
    if (type === 'inner') {
      const targetNodeType = dropNode?.data?.nodeType as TreeNodeType | undefined;
      if (targetNodeType === 'project') {
        targetProjectId = dropNode.data.projectId ?? null;
      }
    } else {
      const dropType = dropNode?.data?.nodeType as TreeNodeType | undefined;
      if (dropType === 'project') return [];
      const dropCharacter = byId.get(dropNode?.data?.id as string);
      if (dropCharacter) {
        targetProjectId = dropCharacter.meta.projectId ?? null;
      }
    }

    const destinationKey = bucketKeyOf(targetProjectId, !!draggingCharacter.meta.starred);
    if (!bucketMap.has(destinationKey)) {
      bucketMap.set(destinationKey, []);
    }
    const destinationBucket = bucketMap.get(destinationKey);
    if (!destinationBucket) return [];

    let insertIndex = destinationBucket.length;
    if (type !== 'inner') {
      const dropId = dropNode?.data?.id as string | undefined;
      const dropIndex = dropId ? destinationBucket.indexOf(dropId) : -1;
      if (dropIndex >= 0) {
        insertIndex = type === 'before' ? dropIndex : dropIndex + 1;
      }
    }
    destinationBucket.splice(insertIndex, 0, draggingId);

    const patches: CharacterOrderPatch[] = [];
    bucketMap.forEach((ids, key) => {
      const projectPart = key.split('::')[0] || null;
      ids.forEach((id, order) => {
        patches.push({
          id,
          order,
          projectId: projectPart,
        });
      });
    });

    return patches;
  };

  const handleNodeDrop = (draggingNode: any, dropNode: any, type: Exclude<NodeDropType, 'none'>) => {
    const draggingType = draggingNode?.data?.nodeType as TreeNodeType | undefined;
    if (!draggingType) return false;

    if (draggingType === 'project') {
      return reorderProjectNodes(draggingNode, dropNode, type);
    }

    if (draggingType !== 'character') return false;
    const patches = buildCharacterOrderPatches(draggingNode, dropNode, type);
    if (!patches.length) return false;
    options.onReorderCharacters(patches);
    return true;
  };

  const handleNodeClick = (data: any) => {
    if (data?.nodeType === 'character' && data?.id) {
      options.onSelectCharacter(data.id);
    }
  };

  return {
    treeProps,
    treeData,
    allowDrag,
    allowDrop,
    handleNodeDrop,
    handleNodeClick,
  };
}
