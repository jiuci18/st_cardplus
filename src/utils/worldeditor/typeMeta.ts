import { ForceType, LandmarkType } from '@/types/worldeditor/world-editor';

const LANDMARK_TYPE_LABELS: Record<string, string> = {
  [LandmarkType.CITY]: '城市',
  [LandmarkType.TOWN]: '城镇',
  [LandmarkType.VILLAGE]: '村庄',
  [LandmarkType.FORTRESS]: '要塞',
  [LandmarkType.RUINS]: '遗迹',
  [LandmarkType.DUNGEON]: '地下城',
  [LandmarkType.TEMPLE]: '神殿',
  [LandmarkType.ACADEMY]: '学院',
  [LandmarkType.HARBOR]: '港口',
  [LandmarkType.MARKET]: '市场',
  [LandmarkType.PLANET]: '星球',
  [LandmarkType.FACTORY]: '工厂',
  [LandmarkType.SPACEPORT]: '星港',
  [LandmarkType.DERELICT_SHIP]: '废弃飞船',
  [LandmarkType.NATURAL]: '自然景观',
  [LandmarkType.OCEAN]: '海洋',
  [LandmarkType.MYSTICAL]: '神秘地点',
  [LandmarkType.CUSTOM]: '自定义',
};

const LANDMARK_TYPE_ICONS: Record<string, string> = {
  [LandmarkType.CITY]: 'ph:buildings-duotone',
  [LandmarkType.TOWN]: 'ph:house-line-duotone',
  [LandmarkType.VILLAGE]: 'ph:house-duotone',
  [LandmarkType.FORTRESS]: 'ph:castle-turret-duotone',
  [LandmarkType.RUINS]: 'ph:skull-duotone',
  [LandmarkType.DUNGEON]: 'ph:spiral-duotone',
  [LandmarkType.TEMPLE]: 'ph:bank-duotone',
  [LandmarkType.ACADEMY]: 'ph:graduation-cap-duotone',
  [LandmarkType.HARBOR]: 'ph:anchor-duotone',
  [LandmarkType.MARKET]: 'ph:storefront-duotone',
  [LandmarkType.PLANET]: 'ph:globe-duotone',
  [LandmarkType.FACTORY]: 'ph:factory-duotone',
  [LandmarkType.SPACEPORT]: 'ph:rocket-launch-duotone',
  [LandmarkType.DERELICT_SHIP]: 'ph:rocket-duotone',
  [LandmarkType.NATURAL]: 'ph:leaf-duotone',
  [LandmarkType.OCEAN]: 'ph:waves-duotone',
  [LandmarkType.MYSTICAL]: 'ph:sparkle-duotone',
  [LandmarkType.CUSTOM]: 'ph:map-pin-line-duotone',
};

const FORCE_TYPE_LABELS: Record<string, string> = {
  [ForceType.POLITICAL]: '政治组织',
  [ForceType.MILITARY]: '军事组织',
  [ForceType.RELIGIOUS]: '宗教组织',
  [ForceType.COMMERCIAL]: '商业组织',
  [ForceType.CRIMINAL]: '犯罪组织',
  [ForceType.ACADEMIC]: '学术组织',
  [ForceType.MAGICAL]: '魔法组织',
  [ForceType.TRIBAL]: '部族组织',
  [ForceType.GUILD]: '行会',
  [ForceType.CULT]: '教派',
  [ForceType.CUSTOM]: '自定义',
};

export const getLandmarkTypeLabel = (type: string): string => {
  return LANDMARK_TYPE_LABELS[type] || type;
};

export const getLandmarkTypeIcon = (type?: string): string => {
  if (!type) return 'ph:map-pin-duotone';
  return LANDMARK_TYPE_ICONS[type] || 'ph:map-pin-duotone';
};

export const getForceTypeLabel = (type: string): string => {
  return FORCE_TYPE_LABELS[type] || type;
};
