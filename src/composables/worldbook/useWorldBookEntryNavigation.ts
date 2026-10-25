import { computed, type Ref } from 'vue';
import type { WorldBook, WorldBookEntry } from '../../types/worldbook.ts';

interface EntryNavigationOptions {
  books: Ref<WorldBook[]>;
  activeBook: Ref<WorldBook | null>;
  selectedEntry: Ref<WorldBookEntry | null>;
  selectEntry: (bookId: string, index: number | null) => void;
}

export function useWorldBookEntryNavigation(options: EntryNavigationOptions) {
  const { books, activeBook, selectedEntry, selectEntry } = options;
  const currentEntryIndex = computed(() => selectedEntry.value
    ? activeBook.value?.entries.findIndex(entry => entry.uid === selectedEntry.value!.uid) ?? -1 : -1);
  const totalEntries = computed(() => activeBook.value?.entries.length ?? 0);
  const allKeywords = computed(() => [...new Set(
    (activeBook.value?.entries ?? []).flatMap(entry => [...(entry.key ?? []), ...(entry.keysecondary ?? [])]).filter(Boolean),
  )]);

  const target = (step: -1 | 1) => {
    const book = activeBook.value;
    if (!book) return null;
    const index = currentEntryIndex.value + step;
    if (index >= 0 && index < book.entries.length) return { bookId: book.id, index };
    const bookIndex = books.value.findIndex(item => item.id === book.id);
    if (bookIndex < 0) return null;
    const adjacent = books.value[bookIndex + step];
    if (!adjacent) return null;
    return {
      bookId: adjacent.id,
      index: adjacent.entries.length ? (step === 1 ? 0 : adjacent.entries.length - 1) : null,
    };
  };
  const isCrossBook = (step: -1 | 1) => {
    const next = target(step);
    return next !== null && next.bookId !== activeBook.value?.id;
  };
  const navigate = (step: -1 | 1) => {
    const next = target(step);
    if (next) selectEntry(next.bookId, next.index);
  };

  return {
    currentEntryIndex,
    totalEntries,
    allKeywords,
    isNextEntryInDifferentBook: computed(() => isCrossBook(1)),
    isPreviousEntryInDifferentBook: computed(() => isCrossBook(-1)),
    goToPreviousEntry: () => navigate(-1),
    goToNextEntry: () => navigate(1),
  };
}
