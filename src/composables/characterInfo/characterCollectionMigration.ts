// 迁移模块：仅用于把历史扁平结构角色数据迁移到 { meta, data } 结构。
// 历史数据清理完成后可整体删除此文件及其调用。

import type { CharacterCard } from '../../types/character';
import { createDefaultCharacterCard } from './useCharacterCard';

export interface CharacterCollectionLike {
  characters: Record<string, unknown>;
  activeCharacterId: string | null;
}

const isNewCharacterCardShape = (character: unknown): character is CharacterCard => {
  if (!character || typeof character !== 'object') return false;
  const value = character as Record<string, unknown>;
  return !!value.meta && !!value.data;
};

const migrateLegacyCharacterCard = (character: unknown): { card: CharacterCard; migrated: boolean } => {
  if (isNewCharacterCardShape(character)) {
    return { card: character, migrated: false };
  }

  const fallback = createDefaultCharacterCard();
  const raw = (character || {}) as Record<string, unknown>;
  const { id, order, starred, projectId, meta, data, ...legacyData } = raw;

  return {
    card: {
      meta: {
        id: typeof id === 'string' ? id : undefined,
        order: typeof order === 'number' ? order : undefined,
        starred: typeof starred === 'boolean' ? starred : undefined,
        projectId: typeof projectId === 'string' ? projectId : undefined,
      },
      data: {
        ...fallback.data,
        ...legacyData,
      },
    },
    migrated: true,
  };
};

// Legacy-only helper. Safe to delete once all historical data has been migrated.
export const migrateCharacterCollection = <T extends CharacterCollectionLike>(
  raw: T
): { collection: Omit<T, 'characters'> & { characters: Record<string, CharacterCard> }; migrated: boolean } => {
  let migrated = false;
  const nextCharacters: Record<string, CharacterCard> = {};

  Object.entries(raw.characters).forEach(([key, value]) => {
    const result = migrateLegacyCharacterCard(value);
    nextCharacters[key] = result.card;
    if (result.migrated) migrated = true;
  });

  return {
    collection: {
      ...raw,
      characters: nextCharacters,
    },
    migrated,
  };
};
