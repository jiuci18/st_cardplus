import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

import type { CharacterCardCollection, CharacterCardItem } from '@/types/character/character-card-collection';
import type { CharacterCardV3 } from '@/types/character/character-card-v3';

import { createDefaultCharacterCardData, normalizeCharacterCardData } from './useV3CharacterCard';

export type SessionSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface CharacterCardEditorSession {
  cardId: string;
  draft: CharacterCardV3;
  imageFile: File | null;
  lastSavedSnapshot: string;
  saveStatus: SessionSaveStatus;
  isSaving: boolean;
}

interface UseCharacterCardEditorSessionsOptions {
  collection: Ref<CharacterCardCollection>;
  currentCardId: ComputedRef<string | null>;
}

function createSessionFromCard(card: CharacterCardItem): CharacterCardEditorSession {
  const draft = normalizeCharacterCardData(card);

  return {
    cardId: card.id,
    draft,
    imageFile: null,
    lastSavedSnapshot: JSON.stringify(draft),
    saveStatus: 'idle',
    isSaving: false,
  };
}

export function useCharacterCardEditorSessions(options: UseCharacterCardEditorSessionsOptions) {
  const { collection, currentCardId } = options;

  const sessions = ref<Record<string, CharacterCardEditorSession>>({});
  const emptyDraft = ref<CharacterCardV3>(createDefaultCharacterCardData());

  const ensureSession = (cardId: string): CharacterCardEditorSession | null => {
    const existingSession = sessions.value[cardId];
    if (existingSession) return existingSession;

    const card = collection.value.cards[cardId];
    if (!card) return null;

    const session = createSessionFromCard(card);
    sessions.value[cardId] = session;
    return session;
  };

  const getSession = (cardId: string | null): CharacterCardEditorSession | null => {
    if (!cardId) return null;
    return sessions.value[cardId] || null;
  };

  const currentSession = computed(() => getSession(currentCardId.value));
  const currentDraft = computed(() => currentSession.value?.draft || emptyDraft.value);
  const currentImageFile = computed<File | null>({
    get: () => currentSession.value?.imageFile || null,
    set: (value) => {
      if (currentSession.value) {
        currentSession.value.imageFile = value;
      }
    },
  });

  const markSessionAsPersisted = (cardId: string, status: SessionSaveStatus = 'idle') => {
    const session = getSession(cardId);
    if (!session) return;

    session.lastSavedSnapshot = JSON.stringify(session.draft);
    session.saveStatus = status;
    session.isSaving = false;
  };

  const resetSessionStatus = (cardId: string) => {
    const session = getSession(cardId);
    if (!session) return;

    session.saveStatus = 'idle';
    session.isSaving = false;
  };

  const replaceSessionDraft = (
    cardId: string,
    cardData: CharacterCardV3,
    options: { preserveImageFile?: boolean; markAsPersisted?: boolean } = {}
  ) => {
    const session = ensureSession(cardId);
    if (!session) return;

    const { preserveImageFile = false, markAsPersisted = false } = options;
    session.draft = normalizeCharacterCardData(cardData);
    if (!preserveImageFile) {
      session.imageFile = null;
    }
    if (markAsPersisted) {
      markSessionAsPersisted(cardId);
    } else {
      resetSessionStatus(cardId);
    }
  };

  const syncSessionFromCollection = (cardId: string) => {
    const card = collection.value.cards[cardId];
    if (!card) return;
    replaceSessionDraft(cardId, card, { markAsPersisted: true });
  };

  const setSessionImageFile = (cardId: string, file: File | null) => {
    const session = ensureSession(cardId);
    if (!session) return;
    session.imageFile = file;
  };

  const setSessionAvatarUrl = (cardId: string, url: string) => {
    const session = ensureSession(cardId);
    if (!session) return;

    const trimmed = url.trim();
    session.draft.avatar = trimmed || 'none';
    session.imageFile = null;
  };

  const replaceCurrentSessionDraft = (
    cardData: CharacterCardV3,
    options: { preserveImageFile?: boolean; markAsPersisted?: boolean } = {}
  ) => {
    if (!currentCardId.value) return;
    replaceSessionDraft(currentCardId.value, cardData, options);
  };

  const setCurrentSessionImageFile = (file: File | null) => {
    if (!currentCardId.value) return;
    setSessionImageFile(currentCardId.value, file);
  };

  const setCurrentSessionAvatarUrl = (url: string) => {
    if (!currentCardId.value) return;
    setSessionAvatarUrl(currentCardId.value, url);
  };

  const closeSession = (cardId: string) => {
    delete sessions.value[cardId];
  };

  const closeAllSessions = () => {
    sessions.value = {};
  };

  watch(
    currentCardId,
    (cardId) => {
      if (!cardId) return;
      ensureSession(cardId);
    },
    { immediate: true }
  );

  watch(
    () => Object.keys(collection.value.cards),
    (cardIds) => {
      const validIds = new Set(cardIds);
      Object.keys(sessions.value).forEach((sessionCardId) => {
        if (!validIds.has(sessionCardId)) {
          closeSession(sessionCardId);
        }
      });
    }
  );

  return {
    sessions,
    currentSession,
    currentDraft,
    currentImageFile,
    ensureSession,
    getSession,
    markSessionAsPersisted,
    resetSessionStatus,
    replaceSessionDraft,
    replaceCurrentSessionDraft,
    syncSessionFromCollection,
    setSessionImageFile,
    setCurrentSessionImageFile,
    setSessionAvatarUrl,
    setCurrentSessionAvatarUrl,
    closeSession,
    closeAllSessions,
  };
}
