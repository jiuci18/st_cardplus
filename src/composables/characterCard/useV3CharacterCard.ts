import { ref } from 'vue';
import type { CharacterCardV3 } from '@/types/character-card-v3';

// 默认的角色卡数据结构，用于初始化和重置
export const createDefaultCharacterCardData = (): CharacterCardV3 => ({
  spec: 'chara_card_v3',
  spec_version: '3.0',
  name: '',
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
    name: '',
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
});

export function normalizeCharacterCardData(newData: any): CharacterCardV3 {
  const defaultData = createDefaultCharacterCardData();
  const isV2 = !newData.spec || newData.spec !== 'chara_card_v3';
  const incomingTopLevel = newData || {};
  const incomingData = newData?.data && typeof newData.data === 'object' ? newData.data : {};
  const hasDataField = (key: string) => Object.prototype.hasOwnProperty.call(incomingData, key);
  const mergedData: CharacterCardV3 = {
    ...defaultData,
    ...newData,
    data: {
      ...defaultData.data,
      ...(newData.data || {}),
      extensions: {
        ...(defaultData.data.extensions || {}),
        ...(newData.data?.extensions || {}),
      },
    },
  };

  if (hasDataField('character_book')) {
    const incomingCharacterBook = incomingData.character_book;
    if (incomingCharacterBook && !Array.isArray(incomingCharacterBook)) {
      mergedData.data.character_book = {
        ...incomingCharacterBook,
        extensions: incomingCharacterBook.extensions ?? {},
        entries: incomingCharacterBook.entries ?? [],
      };
    } else {
      mergedData.data.character_book = incomingCharacterBook;
    }
  } else {
    delete mergedData.data.character_book;
  }

  if (isV2) {
    console.log('useV3CharacterCard: Processing V2 data conversion');
    const extensions = newData.data?.extensions || {};
    mergedData.talkativeness = extensions.talkativeness ?? newData.talkativeness ?? defaultData.talkativeness;
    mergedData.fav = extensions.fav ?? newData.fav ?? defaultData.fav;
    mergedData.tags = newData.tags ?? newData.data?.tags ?? defaultData.tags;
    console.log('useV3CharacterCard: V2 conversion completed');
  }
  mergedData.spec = 'chara_card_v3';
  mergedData.spec_version = '3.0';

  mergedData.data.name = hasDataField('name')
    ? (incomingData.name ?? defaultData.data.name)
    : (incomingTopLevel.name ?? defaultData.data.name);
  mergedData.data.description = hasDataField('description')
    ? (incomingData.description ?? defaultData.data.description)
    : (incomingTopLevel.description ?? defaultData.data.description);
  mergedData.data.personality = hasDataField('personality')
    ? (incomingData.personality ?? defaultData.data.personality)
    : (incomingTopLevel.personality ?? defaultData.data.personality);
  mergedData.data.scenario = hasDataField('scenario')
    ? (incomingData.scenario ?? defaultData.data.scenario)
    : (incomingTopLevel.scenario ?? defaultData.data.scenario);
  mergedData.data.first_mes = hasDataField('first_mes')
    ? (incomingData.first_mes ?? defaultData.data.first_mes)
    : (incomingTopLevel.first_mes ?? defaultData.data.first_mes);
  mergedData.data.mes_example = hasDataField('mes_example')
    ? (incomingData.mes_example ?? defaultData.data.mes_example)
    : (incomingTopLevel.mes_example ?? defaultData.data.mes_example);
  const resolvedTags = hasDataField('tags') ? incomingData.tags : incomingTopLevel.tags;
  mergedData.data.tags = Array.isArray(resolvedTags) ? resolvedTags : defaultData.data.tags;

  mergedData.name = mergedData.data.name;
  mergedData.description = mergedData.data.description;
  mergedData.personality = mergedData.data.personality;
  mergedData.scenario = mergedData.data.scenario;
  mergedData.first_mes = mergedData.data.first_mes;
  mergedData.mes_example = mergedData.data.mes_example;
  mergedData.tags = mergedData.data.tags;

  return mergedData;
}

export function useV3CharacterCard() {
  const characterData = ref<CharacterCardV3>(createDefaultCharacterCardData());
  const isLoadingData = ref(false);

  const loadCharacter = (newData: any) => {
    isLoadingData.value = true;
    characterData.value = normalizeCharacterCardData(newData);

    setTimeout(() => {
      isLoadingData.value = false;
    }, 0);
  };

  const resetCharacter = () => {
    isLoadingData.value = true;
    characterData.value = createDefaultCharacterCardData();
    setTimeout(() => {
      isLoadingData.value = false;
    }, 0);
  };

  return {
    characterData,
    isLoadingData,
    loadCharacter,
    resetCharacter,
  };
}
