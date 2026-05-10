import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { v4 as uuidv4 } from 'uuid';
import { read as readPngMetadata } from '@/utils/pngCardMetadata';
import type { CharacterCardV3 } from '@/types/character/character-card-v3';
import type { CharacterCardCollection, CharacterCardItem } from '@/types/character/character-card-collection';
import { characterCardService, type StoredCharacterCard } from '@/database/characterCardService';
import { nowIso } from '@/utils/datetime';
import { saveFile } from '@/utils/fileSave';

export function useCharacterCardCollection() {
  const characterCardCollection = ref<CharacterCardCollection>({
    cards: {},
    activeCardId: null,
  });
  const isLoading = ref(true);

  const activeCardId = computed(() => characterCardCollection.value.activeCardId);

  const activeCard = computed<CharacterCardItem | null>(() => {
    const cardId = activeCardId.value;
    if (!cardId) return null;
    return characterCardCollection.value.cards[cardId] || null;
  });

  const allTags = computed(() => {
    const tags = Object.values(characterCardCollection.value.cards).flatMap((card) => card.data?.tags || []);
    return [...new Set(tags)];
  });

  const loadInitialData = async () => {
    isLoading.value = true;
    try {
      const collection = await characterCardService.getFullCharacterCardCollection();
      characterCardCollection.value = collection;
    } catch (error) {
      console.error('加载角色卡数据失败:', error);
      ElMessage.error('加载角色卡数据失败！');
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(loadInitialData);

  const handleSelectCard = (cardId: string | null) => {
    if (cardId === '' || cardId === null) {
      characterCardCollection.value.activeCardId = null;
      characterCardService.setActiveCardId(null);
      return;
    }

    if (characterCardCollection.value.cards[cardId]) {
      characterCardCollection.value.activeCardId = cardId;
      characterCardService.setActiveCardId(cardId);
    }
  };

  const handleSaveCurrentCard = async (cardData: CharacterCardV3) => {
    if (!cardData.name && !cardData.data?.name) {
      ElMessage.warning('请先填写角色名称');
      return null;
    }

    try {
      const cardId = uuidv4();
      const now = nowIso();
      const existingOrders = Object.values(characterCardCollection.value.cards).map((c) => c.order);
      const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : -1;

      const storedCard = characterCardService.createStoredCard(cardId, cardData, {
        order: maxOrder + 1,
      });
      await characterCardService.addCard(storedCard);

      // 更新本地状态
      const newCard: CharacterCardItem = {
        ...cardData,
        id: cardId,
        createdAt: now,
        updatedAt: now,
        order: storedCard.order,
      };

      characterCardCollection.value.cards[cardId] = newCard;
      characterCardCollection.value.activeCardId = cardId;
      characterCardService.setActiveCardId(cardId);

      ElMessage.success(`角色卡 "${storedCard.name}" 已保存！`);
      return cardId;
    } catch (error) {
      console.error('保存角色卡失败:', error);
      ElMessage.error('保存角色卡失败！');
      return null;
    }
  };

  const handleUpdateCard = async (
    cardId: string,
    cardData: CharacterCardV3,
    silent = false,
    skipLocalUpdate = false
  ) => {
    const existingCard = characterCardCollection.value.cards[cardId];
    if (!existingCard) {
      ElMessage.error('角色卡不存在');
      return;
    }

    console.log(
      '[handleUpdateCard] 开始更新角色卡:',
      cardId,
      '名称:',
      cardData.name,
      'skipLocalUpdate:',
      skipLocalUpdate
    );

    try {
      const now = nowIso();
      const synchronizedCardData = {
        ...cardData,
        data: {
          ...cardData.data,
        },
      };
      if (synchronizedCardData.data) {
        synchronizedCardData.name = synchronizedCardData.data.name ?? '';
        synchronizedCardData.description = synchronizedCardData.data.description ?? '';
        synchronizedCardData.personality = synchronizedCardData.data.personality ?? '';
        synchronizedCardData.scenario = synchronizedCardData.data.scenario ?? '';
        synchronizedCardData.first_mes = synchronizedCardData.data.first_mes ?? '';
        synchronizedCardData.mes_example = synchronizedCardData.data.mes_example ?? '';
        synchronizedCardData.tags = synchronizedCardData.data.tags ?? [];
      }

      const storedCard: StoredCharacterCard = {
        id: cardId,
        name: (synchronizedCardData.name ?? '').trim() || '未命名角色',
        description: synchronizedCardData.description ?? '',
        avatar: synchronizedCardData.avatar !== 'none' ? synchronizedCardData.avatar : undefined,
        cardData: synchronizedCardData,
        createdAt: existingCard.createdAt,
        updatedAt: now,
        order: existingCard.order,
        tags: synchronizedCardData.tags ?? [],
        metadata: {},
      };

      console.log('[handleUpdateCard] 准备写入数据库，名称:', storedCard.name);
      await characterCardService.updateCard(storedCard);
      console.log('[handleUpdateCard] 数据库更新成功');

      // 只在非自动保存时更新本地状态
      // 自动保存时跳过本地更新，避免触发响应式循环
      if (!skipLocalUpdate) {
        console.log('[handleUpdateCard] 更新本地状态');
        characterCardCollection.value.cards[cardId] = {
          ...synchronizedCardData,
          id: cardId,
          createdAt: existingCard.createdAt,
          updatedAt: now,
          order: existingCard.order,
        };
      } else {
        console.log('[handleUpdateCard] 跳过本地状态更新');
      }

      if (!silent) {
        ElMessage.success('角色卡已更新！');
      }
    } catch (error) {
      console.error('更新角色卡失败:', error);
      if (!silent) {
        ElMessage.error('更新角色卡失败！');
      }
      throw error;
    }
  };

  const handleRenameCard = async (cardId: string) => {
    const card = characterCardCollection.value.cards[cardId];
    if (!card) return;

    try {
      const renameCardResult = await ElMessageBox.prompt('请输入新的名称：', '重命名角色卡', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputValue: card.name,
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
      });
      const { value: newCardName } = renameCardResult as { value: string };
      const updatedCardData = {
        ...card,
        data: {
          ...card.data,
          name: newCardName,
        },
        name: newCardName,
      };

      await handleUpdateCard(cardId, updatedCardData);
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('重命名操作已取消');
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const card = characterCardCollection.value.cards[cardId];
    if (!card) return;

    try {
      await ElMessageBox.confirm(`确定要删除角色卡 "${card.name}" 吗？此操作不可恢复！`, '删除角色卡', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      });
      await characterCardService.deleteCard(cardId);

      // 更新本地状态
      delete characterCardCollection.value.cards[cardId];
      if (characterCardCollection.value.activeCardId === cardId) {
        const cardIds = Object.keys(characterCardCollection.value.cards);
        const newActiveId = cardIds.length > 0 ? cardIds[0] : null;
        characterCardCollection.value.activeCardId = newActiveId;
        characterCardService.setActiveCardId(newActiveId);
      }

      ElMessage.success(`角色卡 "${card.name}" 已删除`);
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('删除操作已取消');
      }
    }
  };

  const handleImportCard = async (cardData: CharacterCardV3) => {
    if (!cardData.name && !cardData.data?.name) {
      ElMessage.error('导入的角色卡缺少名称');
      return null;
    }

    return await handleSaveCurrentCard(cardData);
  };

  async function parseCardFromFile(file: File): Promise<CharacterCardV3 | null> {
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          try {
            const jsonData = JSON.parse(e.target?.result as string);
            if (!jsonData || typeof jsonData !== 'object') {
              throw new Error('无效的 JSON 角色卡文件格式');
            }
            resolve(jsonData as CharacterCardV3);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('读取 JSON 文件时出错'));
        reader.readAsText(file);
      });
    } else if (file.type === 'image/png' || file.name.endsWith('.png')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const metadataString = readPngMetadata(uint8Array);
        const characterCardData = JSON.parse(metadataString) as CharacterCardV3;
        console.log('成功从 PNG 文件中读取角色卡数据');
        return characterCardData;
      } catch (error) {
        console.error('解析 PNG 文件时出错:', error);
        return null;
      }
    }
    return null;
  }

  const handleImportFromFile = async (file: File) => {
    try {
      const cardData = await parseCardFromFile(file);

      if (cardData) {
        const cardId = await handleImportCard(cardData);
        if (cardId) {
          ElMessage.success(`角色卡 "${cardData.name || (cardData.data as any)?.name || '未命名'}" 已成功导入！`);
        }
      } else {
        ElMessage.error(
          '无法从文件中解析角色卡数据。请检查文件格式是否正确 (.json 或 .png) 或 PNG 是否包含角色卡数据。'
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ElMessage.error(`导入失败: ${errorMessage}`);
    }
  };

  const handleExportCard = async (cardId: string) => {
    const card = characterCardCollection.value.cards[cardId];
    if (!card) {
      ElMessage.error('角色卡不存在');
      return;
    }

    try {
      const { id, createdAt, updatedAt, order, ...exportData } = card;
      const jsonDataString = JSON.stringify(exportData, null, 2);

      await saveFile({
        data: new TextEncoder().encode(jsonDataString),
        fileName: `${card.name || 'character'}.json`,
        mimeType: 'application/json',
      });
      ElMessage.success('角色卡已成功导出！');
    } catch (error) {
      console.error('导出角色卡失败:', error);
      ElMessage.error('导出角色卡失败！');
    }
  };

  const handleExportAllCards = async () => {
    try {
      const exportData = await characterCardService.exportDatabase();
      const jsonDataString = JSON.stringify(exportData, null, 2);

      await saveFile({
        data: new TextEncoder().encode(jsonDataString),
        fileName: `character-cards-${nowIso().split('T')[0]}.json`,
        mimeType: 'application/json',
      });
      ElMessage.success('所有角色卡已成功导出！');
    } catch (error) {
      console.error('导出失败:', error);
      ElMessage.error('导出失败！');
    }
  };

  const handleClearAllCards = async () => {
    try {
      await ElMessageBox.confirm('确定要清空所有角色卡吗？此操作不可恢复！', '清空所有角色卡', {
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        type: 'warning',
      });

      await characterCardService.clearDatabase();
      characterCardCollection.value.cards = {};
      characterCardCollection.value.activeCardId = null;
      characterCardService.setActiveCardId(null);

      ElMessage.success('所有角色卡已清空');
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('清空操作已取消');
      }
    }
  };

  const handleCreateNewCard = async () => {
    try {
      const createCardResult = await ElMessageBox.prompt('请输入新角色的名称：', '创建新角色卡', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputValue: '新角色',
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
      });
      const { value: cardName } = createCardResult as { value: string };

      // 创建默认的角色卡数据（确保 data 和顶层一致）
      const defaultData: CharacterCardV3 = {
        spec: 'chara_card_v3',
        spec_version: '3.0',
        name: cardName,
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
        creatorcomment: '',
        avatar: 'none',
        talkativeness: 0.5,
        fav: false,
        tags: [],
        data: {
          name: cardName,
          description: '',
          personality: '',
          scenario: '',
          first_mes: '',
          mes_example: '',
          creator_notes: '',
          system_prompt: '',
          post_history_instructions: '',
          tags: [],
          creator: '',
          character_version: '',
          alternate_greetings: [],
          group_only_greetings: [],
          extensions: {
            world: '',
            talkativeness: 0.5,
            fav: false,
            depth_prompt: {},
            regex_scripts: [],
          },
        },
      };

      const cardId = await handleSaveCurrentCard(defaultData);
      return cardId;
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        console.error('创建新角色卡失败:', error);
        ElMessage.error('创建新角色卡失败！');
      }
      return null;
    }
  };

  return {
    characterCardCollection,
    activeCardId,
    activeCard,
    allTags,
    isLoading,
    handleSelectCard,
    handleSaveCurrentCard,
    handleUpdateCard,
    handleRenameCard,
    handleDeleteCard,
    handleImportCard,
    handleImportFromFile,
    handleExportCard,
    handleExportAllCards,
    handleClearAllCards,
    handleCreateNewCard,
    loadInitialData,
  };
}
