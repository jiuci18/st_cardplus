import { type Ref } from 'vue';
import type { WorldBookEntry, WorldBook } from '@/types/worldbook';
import { useWorldBookEntryState } from './entry/useWorldBookEntryState';
import { useWorldBookEntryActions } from './entry/useWorldBookEntryActions';
import { useWorldBookEntryIO } from './entry/useWorldBookEntryIO';
import { useWorldBookEntryAutoSave } from './entry/useWorldBookEntryAutoSave';

type EntryCallbacks = {
  updateEntries: (entries: WorldBookEntry[]) => Promise<void>;
  updateEntry: (entry: WorldBookEntry) => Promise<void>;
  addEntry: (entry: WorldBookEntry) => Promise<WorldBookEntry | null>;
  deleteEntry: (entryId: number) => Promise<boolean>;
};

export function useWorldBookEntry(activeBook: Ref<WorldBook | null>, callbacks: EntryCallbacks) {
  const state = useWorldBookEntryState(activeBook);

  const fullState = {
    ...state,
    activeBook,
  };

  const actions = useWorldBookEntryActions(fullState, callbacks);

  const io = useWorldBookEntryIO(fullState);

  const autoSave = useWorldBookEntryAutoSave(state, {
    updateEntry: callbacks.updateEntry,
  });

  return {
    ...state,
    ...actions,
    ...io,
    ...autoSave,
  };
}
