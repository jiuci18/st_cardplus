import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  clearEditSessionDirectory,
  getEditSessionDirectory,
  trackIndexedDbEdit,
  trackStorageEdit,
} from '../../src/utils/editSessionTracker.ts';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

let originalWindow: typeof globalThis.window | undefined;

beforeEach(() => {
  originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { sessionStorage: new MemoryStorage() },
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

test('records_storage_edits_in_session_directory', () => {
  trackStorageEdit({ storage: 'localStorage', operation: 'set', key: 'settings' });
  trackStorageEdit({ storage: 'localStorage', operation: 'remove', key: 'settings' });

  const directory = getEditSessionDirectory();
  assert.equal(directory.records.length, 2);
  assert.equal(directory.entries['localStorage:settings'].count, 2);
  assert.deepEqual(directory.entries['localStorage:settings'].operations, ['set', 'remove']);
});

test('records_indexeddb_edits_with_changed_fields', () => {
  trackIndexedDbEdit({ table: 'books', operation: 'update', primaryKey: 'book-1', fields: ['name'] });
  trackIndexedDbEdit({ table: 'books', operation: 'update', primaryKey: 'book-1', fields: ['updatedAt'] });

  const entry = getEditSessionDirectory().entries['indexedDB:books/book-1'];
  assert.equal(entry.count, 2);
  assert.deepEqual(entry.fields, ['name', 'updatedAt']);
});

test('clears_session_directory_without_application_edits', () => {
  trackStorageEdit({ storage: 'localStorage', operation: 'set', key: 'settings' });
  clearEditSessionDirectory();

  assert.equal(getEditSessionDirectory().records.length, 0);
});
