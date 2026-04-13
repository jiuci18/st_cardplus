import type { Ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { copyToClipboard as copyUtil } from '../../utils/clipboard';
import { clearLocalStorage } from '../../utils/localStorageUtils';
import { createDefaultCharacterCard } from './useCharacterCard';
import type { CharacterCard, Attire, Appearance, Trait, Relationship, Skill, Note, CharacterData } from '@/types/character/character';
import { cleanObject, removeEmptyFields } from '../../utils/objectUtils';
import { saveFile } from '../../utils/fileSave';

const arrayToText = (arr: string[] | undefined): string => {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join('\n');
};

const processTextToArray = (text: string): string[] => {
  return text.split('\n').filter((line) => line.trim() !== '');
};

const processAccessories = (accessories: string | string[]): string[] => {
  if (typeof accessories === 'string') {
    return processTextToArray(accessories);
  }
  return accessories || [];
};

const toSerializableCharacterData = (
  character: CharacterData,
  options: {
    includeIdentityAsArray: boolean;
  }
) => {
  const processedAttires =
    character.attires?.map((attire: Attire) => ({
      ...attire,
      accessories: processAccessories(attire.accessories),
    })) || [];

  const processedNotes =
    character.notes?.reduce(
      (acc: Record<string, { name: string; data: string[] }>, note: Note) => {
        if (note.name) {
          acc[note.id.toString()] = {
            name: note.name,
            data: note.data.filter((d: string) => d.trim() !== ''),
          };
        }
        return acc;
      },
      {} as Record<string, { name: string; data: string[] }>
    ) || {};

  return {
    ...character,
    attires: processedAttires,
    gender: character.gender === 'other' ? character.customGender : character.gender,
    identity: options.includeIdentityAsArray ? processTextToArray(character.identity || '') : character.identity,
    background: processTextToArray(character.background || ''),
    likes: processTextToArray(character.likes || ''),
    dislikes: processTextToArray(character.dislikes || ''),
    notes: processedNotes,
  };
};

export const processLoadedData = (parsedData: any): CharacterCard => {
  const source = parsedData?.data && typeof parsedData.data === 'object' ? parsedData.data : parsedData;
  const rawSource = (source || {}) as Record<string, any>;
  const rawData = cleanObject(rawSource, ['id', 'order', 'starred', 'meta']) as Record<string, any>;
  const defaultCard = createDefaultCharacterCard();

  const appearance: Appearance = rawData.appearance || {};

  const attires: Attire[] = Array.isArray(rawData.attires)
    ? rawData.attires.map((attire: any) => ({
        name: attire.name || '',
        description: attire.description || '',
        tops: attire.tops || '',
        bottoms: attire.bottoms || '',
        shoes: attire.shoes || '',
        socks: attire.socks || '',
        underwears: attire.underwears || '',
        accessories: Array.isArray(attire.accessories)
          ? attire.accessories.join('\n')
          : typeof attire.accessories === 'string'
            ? attire.accessories
            : '',
      }))
    : [];

  const traits: Trait[] = Array.isArray(rawData.traits)
    ? rawData.traits.map((trait: any) => ({
        name: trait.name || '',
        description: trait.description || '',
        dialogueExamples: Array.isArray(trait.dialogueExamples) ? trait.dialogueExamples : [''],
        behaviorExamples: Array.isArray(trait.behaviorExamples) ? trait.behaviorExamples : [''],
      }))
    : [];

  const relationships: Relationship[] = Array.isArray(rawData.relationships)
    ? rawData.relationships.map((rel: any) => ({
        name: rel.name || '',
        description: rel.description || '',
        features: rel.features || '',
        dialogueExamples: Array.isArray(rel.dialogueExamples) ? rel.dialogueExamples : [''],
      }))
    : [];

  const skills: Skill[] = Array.isArray(rawData.skills)
    ? rawData.skills.map((skill: any) => ({
        name: skill.name || '',
        type: skill.type || '',
        description: skill.description || '',
        dialogExample: skill.dialogExample || '',
        behaviorExample: skill.behaviorExample || '',
      }))
    : [];

  let notes: Note[] = [];
  const generateNoteId = (): number => {
    const existingIds = new Set(notes.map((note) => note.id));
    let newId: number;
    do {
      newId = Math.floor(Math.random() * 9000) + 1000;
    } while (existingIds.has(newId));
    return newId;
  };

  if (rawData.notes) {
    if (Array.isArray(rawData.notes)) {
      notes = rawData.notes.map((note: any) => ({
        id: note.id || generateNoteId(),
        name: note.name || '',
        data: Array.isArray(note.data) ? note.data : [''],
      }));
    } else if (typeof rawData.notes === 'object') {
      notes = Object.entries(rawData.notes).map(([key, note]: [string, any]) => {
        const id = note.id ? Number(note.id) : isNaN(Number(key)) ? generateNoteId() : Number(key);
        return {
          id: id,
          name: note.name || '',
          data: Array.isArray(note.data) ? note.data : [''],
        };
      });
    }
  }

  const data: CharacterData = {
    chineseName: rawData.chineseName || '',
    japaneseName: rawData.japaneseName || '',
    gender: rawData.gender || '',
    customGender: rawData.customGender || '',
    age: Number(rawData.age) || 0,
    identity: Array.isArray(rawData.identity) ? arrayToText(rawData.identity) : rawData.identity || '',
    background: Array.isArray(rawData.background) ? arrayToText(rawData.background) : rawData.background || '',
    appearance,
    attires,
    mbti: rawData.mbti || '',
    traits,
    relationships,
    likes: Array.isArray(rawData.likes) ? arrayToText(rawData.likes) : rawData.likes || '',
    dislikes: Array.isArray(rawData.dislikes) ? arrayToText(rawData.dislikes) : rawData.dislikes || '',
    dailyRoutine: {
      earlyMorning: rawData.dailyRoutine?.earlyMorning || '',
      morning: rawData.dailyRoutine?.morning || '',
      afternoon: rawData.dailyRoutine?.afternoon || '',
      evening: rawData.dailyRoutine?.evening || '',
      night: rawData.dailyRoutine?.night || '',
      lateNight: rawData.dailyRoutine?.lateNight || '',
    },
    skills,
    notes,
  };

  return {
    meta: {
      ...defaultCard.meta,
    },
    data,
  };
};

const prepareForExport = (character: CharacterCard): CharacterData => {
  const cleaned = cleanObject(character, ['meta']) as { data?: CharacterData };
  return { ...(cleaned.data || character.data) };
};

export const serializeCharacterInfo = (
  character: CharacterCard,
  options: {
    includeIdentityAsArray?: boolean;
  } = {}
) => {
  const characterToExport = prepareForExport(character);
  return removeEmptyFields(
    toSerializableCharacterData(characterToExport, {
      includeIdentityAsArray: options.includeIdentityAsArray ?? true,
    })
  );
};

export function useCardDataHandler(form: Ref<CharacterCard>) {
  const saveCharacterCard = async (): Promise<void> => {
    try {
      const dataToSave = serializeCharacterInfo(form.value, { includeIdentityAsArray: false });

      if (!dataToSave || Object.keys(dataToSave).length === 0) {
        ElMessage.warning('没有可保存的数据，请先填写角色卡信息');
        return;
      }

      const generateRandomNumber = (): number => Math.floor(10000000 + Math.random() * 90000000);
      const jsonData = JSON.stringify(dataToSave, null, 2);
      await saveFile({
        data: new TextEncoder().encode(jsonData),
        fileName: `${form.value.data.chineseName || 'character_card'}_${generateRandomNumber()}.json`,
        mimeType: 'application/json',
      });

      ElMessage.success('角色卡保存成功！');
    } catch (error) {
      ElMessage.error('保存失败');
      console.error('保存角色卡时出错:', error);
    }
  };

  const loadCharacterCard = async (): Promise<void> => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const content = await file.text();
          const parsedData = JSON.parse(content);
          const convertedData = processLoadedData(parsedData);

          if (!convertedData.data.chineseName && !convertedData.data.japaneseName) {
            throw new Error('无效的角色卡文件格式');
          }

          convertedData.meta.id = form.value.meta.id;
          convertedData.meta.order = form.value.meta.order;
          convertedData.meta.starred = form.value.meta.starred;
          convertedData.meta.projectId = form.value.meta.projectId;

          form.value = convertedData;
          ElMessage.success('角色卡加载成功！');
        } catch (error) {
          console.error('JSON文件导入失败:', error);
          ElMessage.error(`加载失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      };
      input.click();
    } catch (error) {
      console.error('JSON文件导入外层错误:', error);
      ElMessage.error(`加载失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const resetForm = (): void => {
    ElMessageBox.confirm('确定要重置所有数据吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        clearLocalStorage();
        const currentMeta = { ...form.value.meta };
        const newForm = createDefaultCharacterCard(currentMeta.id);
        newForm.meta = {
          ...newForm.meta,
          ...currentMeta,
        };
        const standardFields = {
          height: '',
          hairColor: '',
          hairstyle: '',
          eyes: '',
          nose: '',
          lips: '',
          skin: '',
          body: '',
          bust: '',
          waist: '',
          hips: '',
          breasts: '',
          genitals: '',
          anus: '',
          pubes: '',
          thighs: '',
          butt: '',
          feet: '',
        };

        newForm.data.appearance = { ...standardFields };
        form.value = newForm;
        ElMessage.success('数据已重置，包括自定义字段');
      })
      .catch(() => {
        ElMessage.info('取消重置');
      });
  };

  const copyToClipboard = async (): Promise<void> => {
    const dataToSave = serializeCharacterInfo(form.value, { includeIdentityAsArray: true });
    if (!dataToSave || Object.keys(dataToSave).length === 0) {
      ElMessage.warning('没有可复制的数据，请先填写角色卡信息');
      return;
    }

    const jsonData = JSON.stringify(dataToSave, null, 2);
    await copyUtil(jsonData, '已复制到剪贴板！', '复制失败');
  };

  const importFromClipboard = async (data: string): Promise<void> => {
    try {
      const currentMeta = { ...form.value.meta };
      form.value = createDefaultCharacterCard();

      const parsedData = JSON.parse(data);
      const convertedData = processLoadedData(parsedData);

      if (!convertedData.data.chineseName && !convertedData.data.japaneseName) {
        throw new Error('剪贴板内容不是有效的角色卡数据');
      }

      convertedData.meta = currentMeta;
      form.value = convertedData;

      ElMessage.success('从剪贴板导入成功！');
    } catch (error) {
      console.error('剪贴板导入失败:', error);
      ElMessage.error(`导入失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return {
    saveCharacterCard,
    loadCharacterCard,
    resetForm,
    copyToClipboard,
    importFromClipboard,
    processLoadedData,
  };
}
