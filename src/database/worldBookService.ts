import { db, type StoredWorldBook, type StoredWorldBookEntry } from './db';
import type { WorldBookCollection, WorldBook, WorldBookEntry } from '@/types/worldbook';
import type { CharacterBook } from '@/types/character/character-book';
import { convertCharacterBookToWorldBook } from '../utils/worldBookConverter';
import { estimateEncodedSize, sanitizeForIndexedDB } from './utils';
import { v4 as uuidv4 } from 'uuid';
import { getSessionStorageItem, setSessionStorageItem, removeSessionStorageItem } from '@/utils/localStorageUtils';
import { nowIso } from '@/utils/datetime';

export interface WorldBookExport {
  books: StoredWorldBook[];
  entries: StoredWorldBookEntry[];
}

export interface WorldBookStats {
  bookCount: number;
  entryCount: number;
  approxBytes: number;
}

const ACTIVE_BOOK_ID_KEY = 'worldBookActiveId';

export const worldBookService = {
  /**
   * 从 IndexedDB 加载并组装完整的 WorldBookCollection 对象
   */
  async getFullWorldBookCollection(): Promise<WorldBookCollection> {
    const [allBooksStored, allEntriesStored] = await Promise.all([
      db.books.orderBy('order').toArray(),
      db.entries.toArray(),
    ]);

    const booksMap = new Map<string, WorldBook>();
    allBooksStored.forEach((storedBook) => {
      booksMap.set(storedBook.id, {
        ...storedBook,
        entries: [],
      });
    });

    allEntriesStored.forEach((storedEntry) => {
      const book = booksMap.get(storedEntry.bookId);
      if (book) {
        const { bookId, ...entry } = storedEntry;
        book.entries.push(entry);
      }
    });
    const books: Record<string, WorldBook> = {};
    for (const [id, book] of booksMap.entries()) {
      books[id] = book;
    }
    const activeBookId = getSessionStorageItem(ACTIVE_BOOK_ID_KEY);
    const finalActiveBookId = activeBookId && books[activeBookId] ? activeBookId : allBooksStored[0]?.id || null;

    return {
      books,
      activeBookId: finalActiveBookId,
    };
  },

  /**
   * 将当前活动的 bookId 保存到 localStorage
   * @param bookId - 活动书籍的 ID
   */
  setActiveBookId(bookId: string | null): void {
    if (bookId) {
      setSessionStorageItem(ACTIVE_BOOK_ID_KEY, bookId);
    } else {
      removeSessionStorageItem(ACTIVE_BOOK_ID_KEY);
    }
  },

  /**
   * 添加一本新的世界书
   */
  async addBook(book: StoredWorldBook): Promise<void> {
    await db.books.add(sanitizeForIndexedDB(book));
  },

  /**
   * 更新一本书的元数据 (除 entries 外的所有字段)
   */
  async updateBook(book: StoredWorldBook): Promise<void> {
    await db.books.put(sanitizeForIndexedDB(book));
  },

  /**
   * 删除一本书及其所有条目
   */
  async deleteBook(bookId: string): Promise<void> {
    await db.transaction('rw', db.books, db.entries, async () => {
      // 1. 删除书籍本身
      await db.books.delete(bookId);
      // 2. 删除该书籍下的所有条目
      await db.entries.where('bookId').equals(bookId).delete();
    });
  },

  /**
   * 批量更新书籍的顺序
   */
  async updateBookOrder(books: Pick<StoredWorldBook, 'id' | 'order' | 'updatedAt'>[]): Promise<void> {
    await db.transaction('rw', db.books, async () => {
      for (const book of books) {
        await db.books.update(book.id, { order: book.order, updatedAt: book.updatedAt });
      }
    });
  },

  /**
   * 完全替换一本书的所有条目 (用于导入、拖拽等操作)
   */
  async replaceEntriesForBook(bookId: string, entries: WorldBookEntry[]): Promise<void> {
    const plainEntries = JSON.parse(JSON.stringify(entries));
    const storedEntries: StoredWorldBookEntry[] = plainEntries.map((entry: WorldBookEntry) => ({
      ...entry,
      bookId,
    }));

    await db.transaction('rw', db.entries, async () => {
      await db.entries.where('bookId').equals(bookId).delete();
      if (storedEntries.length > 0) {
        await db.entries.bulkAdd(storedEntries);
      }
    });
  },

  /**
   * 获取某本书的所有条目（带数据库 id），并移除内部使用的 bookId 字段
   */
  async getEntriesForBook(bookId: string): Promise<WorldBookEntry[]> {
    const stored = await db.entries.where('bookId').equals(bookId).toArray();
    return stored.map(({ bookId: _ignored, ...rest }) => rest);
  },

  /**
   * 添加一个新条目
   */
  async addEntry(bookId: string, entry: WorldBookEntry): Promise<number> {
    const plainEntry = JSON.parse(JSON.stringify(entry));
    const storedEntry: StoredWorldBookEntry = { ...plainEntry, bookId };
    return await db.entries.add(storedEntry);
  },

  /**
   * 更新一个条目
   * 注意: 需要条目的数据库主键 id
   */
  async updateEntry(entry: StoredWorldBookEntry): Promise<void> {
    const plainEntry = JSON.parse(JSON.stringify(entry));

    // 若缺少 id，尝试通过 (bookId, uid) 定位记录，找不到则按新增处理
    if (plainEntry.id === undefined) {
      if (!plainEntry.bookId) {
        console.error('[worldBookService] 更新条目失败：缺少 id 且缺少 bookId');
        throw new Error("更新条目需要提供数据库主键 'id' 或者 (bookId, uid)");
      }
      const existed = await db.entries
        .where('bookId')
        .equals(plainEntry.bookId)
        .and((e) => e.uid === plainEntry.uid)
        .first();

      if (existed && existed.id !== undefined) {
        plainEntry.id = existed.id;
        await db.entries.put(plainEntry);
        return;
      }
      // 找不到现有记录，则作为新增保存
      await db.entries.add(plainEntry);
      return;
    }

    await db.entries.put(plainEntry);
  },

  /**
   * 删除一个条目
   */
  async deleteEntry(entryId: number): Promise<void> {
    await db.entries.delete(entryId);
  },

  async getStats(): Promise<WorldBookStats> {
    const [books, entries] = await Promise.all([db.books.toArray(), db.entries.toArray()]);
    const approxBytes = estimateEncodedSize(books) + estimateEncodedSize(entries);

    return {
      bookCount: books.length,
      entryCount: entries.length,
      approxBytes,
    };
  },

  /**
   * 导出整个世界书数据库为 JSON 对象
   */
  async exportDatabase(): Promise<WorldBookExport> {
    const books = await db.books.toArray();
    const entries = await db.entries.toArray();
    return { books, entries };
  },

  /**
   * 从 JSON 对象导入数据，完全覆盖现有数据库
   */
  async importDatabase(data: WorldBookExport): Promise<void> {
    await db.transaction('rw', db.books, db.entries, async () => {
      await db.books.clear();
      await db.entries.clear();
      await db.books.bulkAdd(data.books);
      await db.entries.bulkPut(data.entries);
    });
  },

  /**
   * 清空整个世界书数据库
   */
  async clearDatabase(): Promise<void> {
    await db.transaction('rw', db.books, db.entries, async () => {
      await db.books.clear();
      await db.entries.clear();
    });
  },

  /**
   * 查找来自指定角色卡的世界书
   * @param characterId - 角色卡ID
   * @returns 找到的世界书ID，如果没有则返回 null
   */
  async findBookByCharacterId(characterId: string): Promise<string | null> {
    const allBooks = await db.books.toArray();
    const book = allBooks.find((b) => b.sourceCharacterId === characterId);
    return book?.id || null;
  },

  /**
   * 更新已存在的世界书数据
   * @param bookId - 世界书ID
   * @param characterBook - 角色卡的世界书数据
   * @param characterName - 来源角色名称
   */
  async updateBookFromCharacterCard(
    bookId: string,
    characterBook: CharacterBook,
    characterName: string
  ): Promise<void> {
    const now = nowIso();

    const worldBook = convertCharacterBookToWorldBook(characterBook, bookId);
    const existingBook = await db.books.get(bookId);
    if (!existingBook) {
      throw new Error('找不到指定的世界书');
    }

    // 更新书籍元数据，保留 createdAt 和 order
    const updatedBook: StoredWorldBook = {
      ...existingBook,
      name: worldBook.name,
      description: worldBook.description,
      updatedAt: now,
      sourceCharacterName: characterName,
      metadata: worldBook.metadata,
    };

    const plainEntries = JSON.parse(JSON.stringify(worldBook.entries));
    const storedEntries: StoredWorldBookEntry[] = plainEntries.map((entry: WorldBookEntry) => ({
      ...entry,
      bookId,
    }));
    const sanitizedUpdatedBook = sanitizeForIndexedDB(updatedBook);
    const sanitizedStoredEntries = sanitizeForIndexedDB(storedEntries);

    // 更新书籍和替换条目
    await db.transaction('rw', db.books, db.entries, async () => {
      await db.books.put(sanitizedUpdatedBook);
      await db.entries.where('bookId').equals(bookId).delete();
      if (sanitizedStoredEntries.length > 0) {
        await db.entries.bulkAdd(sanitizedStoredEntries);
      }
    });
  },

  /**
   * 从角色卡的 character_book 创建新的 APP 世界书
   * @param characterBook - 角色卡的世界书数据
   * @param characterId - 来源角色卡ID
   * @param characterName - 来源角色名称
   * @returns 新创建的世界书ID
   */
  async addBookFromCharacterCard(
    characterBook: CharacterBook,
    characterId: string,
    characterName: string
  ): Promise<string> {
    const newBookId = uuidv4();
    const now = nowIso();

    // 使用转换工具将 CharacterBook 转换为 WorldBook
    const worldBook = convertCharacterBookToWorldBook(characterBook, newBookId);

    const allBooks = await db.books.toArray();
    const maxOrder = allBooks.length > 0 ? Math.max(...allBooks.map((b) => b.order)) : -1;
    const newBook: StoredWorldBook = {
      id: worldBook.id,
      name: worldBook.name,
      description: worldBook.description,
      createdAt: now,
      updatedAt: now,
      order: maxOrder + 1,
      sourceCharacterId: characterId,
      sourceCharacterName: characterName,
      metadata: worldBook.metadata,
    };

    const plainEntries = JSON.parse(JSON.stringify(worldBook.entries));
    const storedEntries: StoredWorldBookEntry[] = plainEntries.map((entry: WorldBookEntry) => ({
      ...entry,
      bookId: newBookId,
    }));
    const sanitizedNewBook = sanitizeForIndexedDB(newBook);
    const sanitizedStoredEntries = sanitizeForIndexedDB(storedEntries);
    await db.transaction('rw', db.books, db.entries, async () => {
      await db.books.add(sanitizedNewBook);
      if (sanitizedStoredEntries.length > 0) {
        await db.entries.bulkAdd(sanitizedStoredEntries);
      }
    });

    return newBookId;
  },
};
