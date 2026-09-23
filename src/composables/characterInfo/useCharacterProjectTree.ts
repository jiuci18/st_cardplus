import { computed, type Ref } from 'vue';
import type { CharacterCard, CharacterProject } from '@/types/character/character';
import { createTreeMoveHandlers, type MoveBucket } from '@/utils/treeMove';

export interface CharacterOrderPatch {
  id: string;
  order: number;
  projectId: string | null;
}

type TreeNodeType = 'project' | 'character';
interface CharacterBucket {
  projectId: string | null;
  starred: boolean;
}
interface UseCharacterProjectTreeOptions {
  characters: Ref<CharacterCard[]>;
  projects: Ref<CharacterProject[]>;
  onReorderCharacters: (patches: CharacterOrderPatch[]) => void;
  onReorderProjects: (orderedIds: string[]) => void;
  onSelectCharacter: (id: string) => void;
}

export function useCharacterProjectTree(options: UseCharacterProjectTreeOptions) {
  const sortedCharacters = computed(() =>
    options.characters.value
      .filter((character) => !!character.meta.id)
      .slice()
      .sort((a, b) => {
        const starred = Number(!!b.meta.starred) - Number(!!a.meta.starred);
        return (
          starred ||
          (a.meta.order ?? 0) - (b.meta.order ?? 0) ||
          (a.data.chineseName || '').localeCompare(b.data.chineseName || '')
        );
      }),
  );
  const sortedProjects = computed(() => options.projects.value.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  const groupedCharacters = computed(() => {
    const groups: Record<string, CharacterCard[]> = {};
    sortedCharacters.value.forEach((character) => {
      const key = character.meta.projectId ?? '';
      (groups[key] ??= []).push(character);
    });
    return groups;
  });
  const treeData = computed(() => {
    const characterNodes = (projectId: string | null) =>
      (groupedCharacters.value[projectId ?? ''] ?? []).map((character) => ({
        id: character.meta.id as string,
        label: character.data.chineseName || '未命名角色',
        nodeType: 'character' as TreeNodeType,
        icon: 'ph:user-circle-duotone',
        projectId,
        raw: character,
      }));
    return [
      ...sortedProjects.value.map((project) => ({
        id: `project:${project.id}`,
        label: project.name,
        nodeType: 'project' as TreeNodeType,
        icon: 'ph:folder-duotone',
        projectId: project.id,
        children: characterNodes(project.id),
      })),
      ...characterNodes(null),
    ];
  });

  const characterBucket = (projectId: string | null, starred: boolean): MoveBucket<CharacterBucket | null> => ({
    id: JSON.stringify([projectId, starred]),
    context: { projectId, starred },
    keys: sortedCharacters.value
      .filter((character) => (character.meta.projectId ?? null) === projectId && !!character.meta.starred === starred)
      .map((character) => character.meta.id!),
  });
  const handlers = createTreeMoveHandlers<CharacterBucket | null, boolean>({
    locate: (node) => {
      if (node.data.nodeType === 'project')
        return {
          key: node.data.projectId,
          bucket: { id: '$projects', keys: sortedProjects.value.map((project) => project.id), context: null },
        };
      const character = options.characters.value.find((character) => character.meta.id === node.data.id);
      return character
        ? {
            key: character.meta.id!,
            bucket: characterBucket(character.meta.projectId ?? null, !!character.meta.starred),
          }
        : undefined;
    },
    container: (node, source) =>
      options.projects.value.some((project) => project.id === node.data.projectId)
        ? characterBucket(node.data.projectId, source.bucket.context!.starred)
        : undefined,
    innerPosition: 'end',
    canDrag: (node) => ['character', 'project'].includes(node?.data?.nodeType),
    canDrop: (source, target, type) => {
      const from = source?.data;
      const to = target?.data;
      if (from?.nodeType === 'project') return to?.nodeType === 'project' && type !== 'inner';
      if (from?.nodeType !== 'character') return false;
      if (type === 'inner') return to?.nodeType === 'project';
      return to?.nodeType === 'character' && !!from.raw.meta.starred === !!to.raw.meta.starred;
    },
    commit: (move) => {
      if (!move.source.context) options.onReorderProjects(move.targetKeys);
      else {
        const patches = (keys: string[], projectId: string | null) =>
          keys.map((id, order) => ({ id, order, projectId }));
        options.onReorderCharacters([
          ...(!move.sameBucket ? patches(move.sourceKeys, move.source.context.projectId) : []),
          ...patches(move.targetKeys, move.target.context!.projectId),
        ]);
      }
      return true;
    },
  });
  return {
    treeProps: { children: 'children', label: 'label' },
    treeData,
    ...handlers,
    handleNodeClick: (data: any) => {
      if (data?.nodeType === 'character' && data?.id) options.onSelectCharacter(data.id);
    },
  };
}
