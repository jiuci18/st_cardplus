import type { WorldBookEntry } from '@/types/worldbook';

export const createDefaultEntryData = (uid: number): WorldBookEntry => ({
  uid: uid,
  comment: '',
  key: [],
  content: '',
  addMemo: true,
  order: 100,
  constant: false,
  disable: false,
  keysecondary: [],
  selectiveLogic: 0,
  selective: true,
  excludeRecursion: false,
  preventRecursion: false,
  delayUntilRecursion: false,
  probability: 100,
  useProbability: true,
  position: 1,
  role: null,
  depth: 4,
  caseSensitive: null,
  matchWholeWords: null,
  vectorized: false,
  group: '',
  groupPriority: 0,
  groupOverride: false,
  useGroupScoring: null,
  sticky: 0,
  cooldown: 0,
  delay: 0,
  automationId: '',
  outletName: '',
  // 扫描匹配选项默认值
  scanDepth: null,
  matchPersonaDescription: false,
  matchCharacterDescription: false,
  matchCharacterPersonality: false,
  matchCharacterDepthPrompt: false,
  matchScenario: false,
  matchCreatorNotes: false,
});

export const processImportedWorldBookData = (jsonData: unknown): WorldBookEntry[] | null => {
  if (
    jsonData &&
    typeof jsonData === 'object' &&
    jsonData !== null &&
    'entries' in jsonData &&
    typeof (jsonData as { entries: unknown }).entries === 'object' &&
    (jsonData as { entries: unknown }).entries !== null
  ) {
    const data = jsonData as { entries: Record<string, any> };
    const entriesFromFile = Object.values(data.entries);
    const loadedEntries: WorldBookEntry[] = [];

    entriesFromFile.forEach((entryFromFile, index) => {
      const newUid = Date.now() + index;
      const baseEntry = createDefaultEntryData(newUid);

      const newEntry: WorldBookEntry = {
        ...baseEntry,
        ...entryFromFile,
        uid: newUid,
        key: Array.isArray(entryFromFile.key) ? entryFromFile.key.map(String) : baseEntry.key,
        keysecondary: Array.isArray(entryFromFile.keysecondary)
          ? entryFromFile.keysecondary.map(String)
          : baseEntry.keysecondary,
      };
      delete newEntry.id;
      loadedEntries.push(newEntry);
    });

    return loadedEntries;
  }
  return null;
};
