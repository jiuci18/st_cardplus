import type { Ref } from 'vue';
import type { CharacterCard } from '@/types/character/character';
import { addItem, removeItem, exportSection } from './sectionHelpers';

export function useCardSections(form: Ref<CharacterCard>) {
  const exportBasicInfo = () =>
    exportSection(
      {
        chineseName: form.value.data.chineseName,
        gender: form.value.data.gender,
        customGender: form.value.data.customGender,
        age: form.value.data.age,
        identity: form.value.data.identity,
      },
      '基本信息'
    );

  const addTrait = () =>
    addItem(form.value.data.traits, () => ({
      name: '',
      description: '',
      dialogueExamples: [''],
      behaviorExamples: [''],
    }));

  const removeTrait = (index: number) => removeItem(form.value.data.traits, index);

  const addSkill = () =>
    addItem(form.value.data.skills, () => ({
      name: '',
      type: '',
      description: '',
      dialogExample: '',
      behaviorExample: '',
    }));

  const removeSkill = (index: number) => removeItem(form.value.data.skills, index);

  const addRelationship = () =>
    addItem(form.value.data.relationships, () => ({
      name: '',
      description: '',
      features: '',
      dialogueExamples: [''],
    }));

  const removeRelationship = (index: number) => removeItem(form.value.data.relationships, index);

  // 4位数字ID生成器 (1000-9999)
  const generateNoteId = (): number => {
    const existingIds = new Set(form.value.data.notes.map((note) => note.id));
    let newId: number;
    do {
      newId = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    } while (existingIds.has(newId));
    return newId;
  };

  const addNote = () =>
    addItem(form.value.data.notes, () => ({
      id: generateNoteId(),
      name: '',
      data: [''],
    }));

  const removeNote = (id: number) => {
    const index = form.value.data.notes.findIndex((note) => note.id === id);
    removeItem(form.value.data.notes, index);
  };

  const addAttire = () =>
    addItem(form.value.data.attires, () => ({
      name: '',
      description: '',
      tops: '',
      bottoms: '',
      shoes: '',
      socks: '',
      underwears: '',
      accessories: '',
    }));

  const removeAttire = (index: number) => removeItem(form.value.data.attires, index);
  const exportAttires = () => {
    const processedAttires = form.value.data.attires.map((attire) => ({
      ...attire,
      accessories:
        typeof attire.accessories === 'string'
          ? attire.accessories.split('\n').filter((a) => a.trim() !== '')
          : attire.accessories || [],
    }));
    return exportSection(processedAttires, '服装套装');
  };

  const exportSkills = () => exportSection(form.value.data.skills, '技能');
  const exportTraits = () => exportSection(form.value.data.traits, '性格特质');
  const exportRelationships = () => exportSection(form.value.data.relationships, '人际关系');
  const exportAppearance = () => exportSection(form.value.data.appearance, '外貌特征');

  return {
    exportBasicInfo,
    addTrait,
    removeTrait,
    addSkill,
    removeSkill,
    addRelationship,
    removeRelationship,
    addNote,
    removeNote,
    addAttire,
    removeAttire,
    exportAttires,
    exportSkills,
    exportTraits,
    exportRelationships,
    exportAppearance,
  };
}
