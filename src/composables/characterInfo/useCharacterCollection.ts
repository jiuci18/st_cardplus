import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { saveToLocalStorage as saveToLS, loadFromLocalStorage as loadFromLS } from '../../utils/localStorageUtils';
import type { CharacterCard, CharacterProject } from '../../types/character';
import { v4 as uuidv4 } from 'uuid';
import { createDefaultCharacterCard } from './useCharacterCard';
import { processLoadedData } from './useCardDataHandler';
import { migrateCharacterCollection } from './characterCollectionMigration';
import { useCharacterProjects } from './useCharacterProjects';
import type { CharacterOrderPatch } from './useCharacterProjectTree';

const LOCAL_STORAGE_KEY_CHARACTER_MANAGER = 'characterManagerData';

export interface CharacterCollection {
  characters: { [id: string]: CharacterCard };
  projects: { [id: string]: CharacterProject };
  activeCharacterId: string | null;
}

const createCharacterCardWithMeta = (meta: CharacterCard['meta'], dataOverrides: Partial<CharacterCard['data']> = {}): CharacterCard => {
  const base = createDefaultCharacterCard();
  return {
    ...base,
    meta: {
      ...base.meta,
      ...meta,
    },
    data: {
      ...base.data,
      ...dataOverrides,
    },
  };
};

const mergeCharacterMeta = (character: CharacterCard, metaPatch: Partial<CharacterCard['meta']>): CharacterCard => {
  return {
    ...character,
    meta: {
      ...character.meta,
      ...metaPatch,
    },
  };
};

export function useCharacterCollection() {
  const characterCollection = ref<CharacterCollection>({
    characters: {},
    projects: {},
    activeCharacterId: null,
  });

  const activeCharacterId = computed(() => characterCollection.value.activeCharacterId);

  const activeCharacter = computed<CharacterCard | null>(() => {
    if (activeCharacterId.value && characterCollection.value.characters[activeCharacterId.value]) {
      return characterCollection.value.characters[activeCharacterId.value];
    }
    return null;
  });

  const saveCharactersToLocalStorage = (): void => {
    saveToLS(characterCollection.value, LOCAL_STORAGE_KEY_CHARACTER_MANAGER);
  };

  const { projects, ensureProjects, handleCreateProject, reorderProjects, handleRenameProject } = useCharacterProjects(characterCollection);
  const ensureCharacterOrder = () => {
    const characters = { ...characterCollection.value.characters };
    const values = Object.values(characters);
    const bucketCounters = new Map<string, number>();

    values.forEach((character) => {
      if (!character.meta.id) return;
      const projectId = character.meta.projectId;
      if (projectId && !characterCollection.value.projects[projectId]) {
        characters[character.meta.id] = mergeCharacterMeta(character, { projectId: undefined });
      }
    });

    Object.values(characters).forEach((character) => {
      if (!character.meta.id) return;
      const starred = typeof character.meta.starred === 'boolean' ? character.meta.starred : false;
      const projectId = character.meta.projectId ?? '';
      const bucketKey = `${projectId}::${starred ? '1' : '0'}`;

      if (typeof character.meta.starred !== 'boolean') {
        characters[character.meta.id] = mergeCharacterMeta(characters[character.meta.id], { starred: false });
      }

      if (typeof character.meta.order === 'number') {
        const currentMax = bucketCounters.get(bucketKey) ?? -1;
        bucketCounters.set(bucketKey, Math.max(currentMax, character.meta.order));
        return;
      }

      const nextOrder = (bucketCounters.get(bucketKey) ?? -1) + 1;
      bucketCounters.set(bucketKey, nextOrder);
      characters[character.meta.id] = mergeCharacterMeta(characters[character.meta.id], {
        order: nextOrder,
        starred,
      });
    });

    characterCollection.value = {
      ...characterCollection.value,
      characters,
    };
  };

  const getNextCharacterOrder = (starred: boolean, projectId?: string) => {
    const orders = Object.values(characterCollection.value.characters)
      .filter((character) => !!character.meta.starred === starred && (character.meta.projectId ?? '') === (projectId ?? ''))
      .map((character) => character.meta.order)
      .filter((order): order is number => typeof order === 'number');
    return orders.length > 0 ? Math.max(...orders) + 1 : 0;
  };

  onMounted(() => {
    const loadedData = loadFromLS(LOCAL_STORAGE_KEY_CHARACTER_MANAGER);
    if (loadedData && typeof loadedData === 'object' && loadedData.characters) {
      const { collection, migrated } = migrateCharacterCollection(loadedData as CharacterCollection);
      characterCollection.value = collection;
      ensureProjects();
      ensureCharacterOrder();
      if (migrated) {
        saveCharactersToLocalStorage();
      }
    } else {
      // Initialize with a default character if none exist
      const newId = uuidv4();
      const defaultCharacter = createCharacterCardWithMeta(
        { id: newId, order: 0, starred: false },
        { chineseName: '默认角色' }
      );
      characterCollection.value = {
        characters: { [newId]: defaultCharacter },
        projects: {},
        activeCharacterId: newId,
      };
      saveCharactersToLocalStorage();
    }
  });

  watch(
    characterCollection,
    () => {
      // 立即保存，确保数据持久化
      saveCharactersToLocalStorage();
    },
    { deep: true }
  );

  const handleSelectCharacter = (characterId: string) => {
    if (characterCollection.value.characters[characterId]) {
      characterCollection.value.activeCharacterId = characterId;
    }
  };

  const handleCreateCharacter = async () => {
    try {
      const createCharacterResult = await ElMessageBox.prompt('请输入新角色的名称：', '创建新角色', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
        inputValue: '新角色',
      });
      const { value: characterName } = createCharacterResult as { value: string };

      const newId = uuidv4();
      const newCharacter = createCharacterCardWithMeta(
        { id: newId, order: getNextCharacterOrder(false), starred: false, projectId: undefined },
        { chineseName: characterName }
      );

      // 立即更新characterCollection，避免时序问题
      characterCollection.value = {
        ...characterCollection.value,
        characters: {
          ...characterCollection.value.characters,
          [newId]: newCharacter,
        },
        activeCharacterId: newId,
      };

      ElMessage.success(`角色 "${characterName}" 已创建！`);
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.info('创建操作已取消');
      }
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    const character = characterCollection.value.characters[characterId];
    if (!character) return;

    if (Object.keys(characterCollection.value.characters).length <= 1) {
      ElMessage.warning('不能删除最后一个角色 ');
      return;
    }

    try {
      await ElMessageBox.confirm(`确定要删除角色 "${character.data.chineseName}" 吗？此操作不可恢复！`, '删除角色', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      });

      // 使用响应式删除，确保UI立即更新
      const remainingCharacters = { ...characterCollection.value.characters };
      delete remainingCharacters[characterId];

      const newActiveId =
        characterCollection.value.activeCharacterId === characterId
          ? Object.keys(remainingCharacters)[0] || null
          : characterCollection.value.activeCharacterId;

      // 立即更新characterCollection，避免时序问题
      characterCollection.value = {
        ...characterCollection.value,
        characters: remainingCharacters,
        activeCharacterId: newActiveId,
      };

      ElMessage.success(`角色 "${character.data.chineseName}" 已删除 `);
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.info('删除操作已取消');
      }
    }
  };

  const handleImportCharacter = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') {
          throw new Error('无法读取文件内容 ');
        }

        const importedData = JSON.parse(result) as Partial<CharacterCard> & { name?: string };

        const newId = uuidv4();
        const processedData = processLoadedData(importedData);
        if (!processedData.data.chineseName && !processedData.data.japaneseName && !importedData.name) {
          throw new Error('导入的数据缺少角色名称 ');
        }
        const newCharacter: CharacterCard = {
          ...createDefaultCharacterCard(),
          ...processedData,
          meta: {
            id: newId, // 始终分配新ID以避免冲突
            order: getNextCharacterOrder(false),
            starred: false,
            projectId: undefined,
          },
        };

        // 如果没有中文名，但有英文名或日文名，则使用它们
        if (!newCharacter.data.chineseName) {
          newCharacter.data.chineseName = importedData.name || newCharacter.data.japaneseName || '未命名角色';
        }

        // 立即更新characterCollection，避免时序问题
        characterCollection.value = {
          ...characterCollection.value,
          characters: {
            ...characterCollection.value.characters,
            [newId]: newCharacter,
          },
          activeCharacterId: newId,
        };

        ElMessage.success(`角色 "${newCharacter.data.chineseName}" 已成功导入！`);
      } catch (error) {
        console.error('导入角色失败:', error);
        ElMessage.error(`导入失败: ${error instanceof Error ? error.message : '无效的文件格式 '}`);
      }
    };
    reader.onerror = () => {
      ElMessage.error('读取文件时发生错误 ');
    };
    reader.readAsText(file);
  };

  const updateCharacter = (characterId: string, updatedData: CharacterCard) => {
    if (characterCollection.value.characters[characterId]) {
      // 使用整体替换来确保Vue能正确检测到变化
      const updatedCharacters = {
        ...characterCollection.value.characters,
        [characterId]: JSON.parse(JSON.stringify(updatedData)),
      };

      characterCollection.value = {
        ...characterCollection.value,
        characters: updatedCharacters,
      };

      // 强制触发保存，确保数据持久化
      saveCharactersToLocalStorage();
    } else {
      console.error(
        'updateCharacter: 角色不存在',
        characterId,
        '当前角色:',
        Object.keys(characterCollection.value.characters)
      );
    }
  };

  const setCharacterStar = (characterId: string, starred: boolean) => {
    const character = characterCollection.value.characters[characterId];
    if (!character) return;

    if (!!character.meta.starred === starred) return;

    const updatedCharacter = {
      ...mergeCharacterMeta(character, {
        starred,
        order: getNextCharacterOrder(starred, character.meta.projectId),
      }),
    };

    characterCollection.value = {
      ...characterCollection.value,
      characters: {
        ...characterCollection.value.characters,
        [characterId]: updatedCharacter,
      },
    };
  };

  const applyCharacterOrderPatches = (patches: CharacterOrderPatch[]) => {
    if (!patches.length) return;
    const updatedCharacters = { ...characterCollection.value.characters };
    patches.forEach((patch) => {
      const character = updatedCharacters[patch.id];
      if (!character) return;
      const projectId = patch.projectId ?? undefined;
      updatedCharacters[patch.id] = mergeCharacterMeta(character, {
        order: patch.order,
        projectId,
      });
    });

    characterCollection.value = {
      ...characterCollection.value,
      characters: updatedCharacters,
    };
  };

  return {
    characterCollection,
    projects,
    activeCharacterId,
    activeCharacter,
    handleSelectCharacter,
    handleCreateProject,
    handleRenameProject,
    handleCreateCharacter,
    handleDeleteCharacter,
    handleImportCharacter,
    updateCharacter,
    setCharacterStar,
    applyCharacterOrderPatches,
    reorderProjects,
  };
}
