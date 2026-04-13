export interface WorldBookEntry {
  id?: number; // Database primary key
  uid?: number;
  comment: string;
  key: string[];
  content: string;
  addMemo: boolean;
  order: number;
  constant: boolean;
  disable: boolean;
  keysecondary: string[];
  selectiveLogic: number;
  selective: boolean;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  delayUntilRecursion: boolean;
  probability: number;
  useProbability: boolean;
  position: number;
  role: number | null;
  depth: number;
  caseSensitive: boolean | null;
  matchWholeWords: boolean | null;
  vectorized: boolean;
  group: string;
  groupPriority: number;
  groupOverride: boolean;
  useGroupScoring: boolean | null;
  sticky: number;
  cooldown: number;
  delay: number;
  automationId: string;
  outletName: string;
  // 扫描匹配选项 (Scan matching options)
  scanDepth?: number | null;
  matchPersonaDescription?: boolean;
  matchCharacterDescription?: boolean;
  matchCharacterPersonality?: boolean;
  matchCharacterDepthPrompt?: boolean;
  matchScenario?: boolean;
  matchCreatorNotes?: boolean;
}

export interface WorldBook {
  id: string; // 使用UUIDv4确保唯一性
  name: string;
  entries: WorldBookEntry[];
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
  order: number; // 用于排序
  // 可选的元数据
  description?: string;
  sourceCharacterId?: string; // 来源角色卡ID
  sourceCharacterName?: string; // 来源角色名称
  // 为将来的功能预留
  metadata?: Record<string, any>;
}

export interface WorldBookCollection {
  books: Record<string, WorldBook>;
  activeBookId: string | null;
  settings?: Record<string, any>;
}
