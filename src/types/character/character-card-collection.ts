import type { CharacterCardV3 } from './character-card-v3';

/**
 * 角色卡集合中的单个角色卡接口
 * 包含了完整的角色卡数据和管理所需的元数据
 */
export interface CharacterCardItem extends CharacterCardV3 {
  id: string; // UUID 唯一标识符
  createdAt: string; // 创建时间 ISO 8601
  updatedAt: string; // 更新时间 ISO 8601
  order: number; // 排序序号
}

/**
 * 角色卡集合接口
 * 用于管理多个角色卡的集合状态
 */
export interface CharacterCardCollection {
  cards: Record<string, CharacterCardItem>;
  activeCardId: string | null;
  settings?: Record<string, any>; // 全局设置
}
