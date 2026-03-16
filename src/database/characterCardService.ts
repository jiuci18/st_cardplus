import { db } from './db';
import type { StoredCharacterCard } from './db';
import type { CharacterCardV3 } from '../types/character-card-v3';
import { estimateEncodedSize, sanitizeForIndexedDB } from './utils';
import { getSessionStorageItem, setSessionStorageItem, removeSessionStorageItem } from '@/utils/localStorageUtils';
import { nowIso } from '@/utils/datetime';

// 重新导出 StoredCharacterCard 类型供外部使用
export type { StoredCharacterCard };

export interface CharacterCardCollection {
  cards: Record<string, CharacterCardV3 & { id: string; createdAt: string; updatedAt: string; order: number }>;
  activeCardId: string | null;
}

export interface CharacterCardExport {
  cards: StoredCharacterCard[];
}

export interface CharacterCardStats {
  cardCount: number;
  approxBytes: number;
}

const ACTIVE_CARD_ID_KEY = 'characterCardActiveId';

export const characterCardService = {
  /**
   * 从 IndexedDB 加载并组装完整的 CharacterCardCollection 对象
   */
  async getFullCharacterCardCollection(): Promise<CharacterCardCollection> {
    const allCardsStored = await db.characterCards.orderBy('order').toArray();
    const cards: Record<string, CharacterCardV3 & { id: string; createdAt: string; updatedAt: string; order: number }> =
      {};

    allCardsStored.forEach((storedCard) => {
      cards[storedCard.id] = {
        ...storedCard.cardData,
        id: storedCard.id,
        createdAt: storedCard.createdAt,
        updatedAt: storedCard.updatedAt,
        order: storedCard.order,
      };
    });

    // 从 sessionStorage 获取并验证 activeCardId
    const activeCardId = getSessionStorageItem(ACTIVE_CARD_ID_KEY);
    const finalActiveCardId = activeCardId && cards[activeCardId] ? activeCardId : allCardsStored[0]?.id || null;

    return {
      cards,
      activeCardId: finalActiveCardId,
    };
  },

  /**
   * 将当前活动的 cardId 保存到 localStorage
   */
  setActiveCardId(cardId: string | null): void {
    if (cardId) {
      setSessionStorageItem(ACTIVE_CARD_ID_KEY, cardId);
    } else {
      removeSessionStorageItem(ACTIVE_CARD_ID_KEY);
    }
  },

  /**
   * 添加一张新的角色卡
   */
  async addCard(card: StoredCharacterCard): Promise<void> {
    // 清理数据以确保可以被 IndexedDB 克隆
    const sanitizedCard = sanitizeForIndexedDB(card);
    await db.characterCards.add(sanitizedCard);
  },

  /**
   * 更新一张角色卡的完整数据
   */
  async updateCard(card: StoredCharacterCard): Promise<void> {
    // 清理数据以确保可以被 IndexedDB 克隆
    const sanitizedCard = sanitizeForIndexedDB(card);
    await db.characterCards.put(sanitizedCard);
  },

  /**
   * 删除一张角色卡
   */
  async deleteCard(cardId: string): Promise<void> {
    await db.characterCards.delete(cardId);
  },

  /**
   * 批量更新角色卡的顺序
   */
  async updateCardOrder(cards: Pick<StoredCharacterCard, 'id' | 'order' | 'updatedAt'>[]): Promise<void> {
    await db.transaction('rw', db.characterCards, async () => {
      for (const card of cards) {
        await db.characterCards.update(card.id, { order: card.order, updatedAt: card.updatedAt });
      }
    });
  },

  /**
   * 根据角色卡数据创建存储格式
   */
  createStoredCard(
    id: string,
    cardData: CharacterCardV3,
    options: {
      name?: string;
      description?: string;
      order?: number;
      tags?: string[];
      metadata?: Record<string, any>;
    } = {}
  ): StoredCharacterCard {
    const now = nowIso();

    return {
      id,
      name: (options.name ?? cardData.name ?? cardData.data?.name ?? '').trim() || '未命名角色',
      description: options.description ?? cardData.description ?? cardData.data?.description ?? '',
      avatar: cardData.avatar !== 'none' ? cardData.avatar : undefined,
      cardData,
      createdAt: now,
      updatedAt: now,
      order: options.order ?? 0,
      tags: options.tags ?? cardData.tags ?? cardData.data?.tags ?? [],
      metadata: options.metadata ?? {},
    };
  },

  /**
   * 检查数据库是否为空
   */
  async isDatabaseEmpty(): Promise<boolean> {
    const count = await db.characterCards.count();
    return count === 0;
  },

  async getStats(): Promise<CharacterCardStats> {
    const cards = await db.characterCards.toArray();
    return {
      cardCount: cards.length,
      approxBytes: estimateEncodedSize(cards),
    };
  },

  /**
   * 导出整个角色卡数据库为 JSON 对象
   */
  async exportDatabase(): Promise<CharacterCardExport> {
    const cards = await db.characterCards.toArray();
    return { cards };
  },

  /**
   * 从 JSON 对象导入数据，完全覆盖现有角色卡数据
   */
  async importDatabase(data: CharacterCardExport): Promise<void> {
    await db.transaction('rw', db.characterCards, async () => {
      // 清空现有角色卡数据
      await db.characterCards.clear();
      // 批量导入新数据
      await db.characterCards.bulkAdd(data.cards);
    });
  },

  /**
   * 清空整个角色卡数据库
   */
  async clearDatabase(): Promise<void> {
    await db.characterCards.clear();
  },

  /**
   * 通过名称搜索角色卡
   */
  async searchByName(query: string): Promise<StoredCharacterCard[]> {
    const lowerQuery = query.toLowerCase();
    return await db.characterCards.filter((card) => card.name.toLowerCase().includes(lowerQuery)).toArray();
  },

  /**
   * 通过标签搜索角色卡
   */
  async searchByTags(tags: string[]): Promise<StoredCharacterCard[]> {
    const lowerTags = tags.map((tag) => tag.toLowerCase());
    return await db.characterCards
      .filter((card) => {
        const cardTags = (card.tags || []).map((tag) => tag.toLowerCase());
        return lowerTags.some((tag) => cardTags.includes(tag));
      })
      .toArray();
  },
};
