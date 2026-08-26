import type { Attire, CharacterCard, Relationship, Skill, Trait } from '@/types/character/character';

export const createEmptyAttire = (): Attire => ({
  name: '',
  description: '',
  tops: '',
  bottoms: '',
  shoes: '',
  socks: '',
  underwears: '',
  accessories: '',
});

export const createEmptyTrait = (): Trait => ({
  name: '',
  description: '',
  dialogueExamples: [''],
  behaviorExamples: [''],
});

export const createEmptyRelationship = (): Relationship => ({
  name: '',
  description: '',
  features: '',
  dialogueExamples: [''],
});

export const createEmptySkill = (): Skill => ({
  name: '',
  type: '',
  description: '',
  dialogExample: '',
  behaviorExample: '',
});

/**
 * 创建默认的角色卡数据
 * 用于初始化表单和重置表单
 * @param id - 可选的角色ID，如果提供则包含在返回的对象中
 */
export const createDefaultCharacterCard = (id?: string): CharacterCard => {
  const card: CharacterCard = {
    meta: {
      id,
      starred: false,
    },
    data: {
      chineseName: '',
      japaneseName: '',
      gender: '',
      customGender: '',
      age: 0,
      height: '',
      identity: '',
      background: '',
      appearance: {
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
        thighs: '',
        butt: '',
        feet: '',
      },
      attires: [createEmptyAttire()],
      mbti: '',
      traits: [createEmptyTrait()],
      relationships: [createEmptyRelationship()],
      likes: '',
      dislikes: '',
      dailyRoutine: {
        earlyMorning: '',
        morning: '',
        afternoon: '',
        evening: '',
        night: '',
        lateNight: '',
      },
      skills: [createEmptySkill()],
      notes: [],
    },
  };

  return card;
};
