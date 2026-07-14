//! Persists the complete world-editor domain in normalized IndexedDB tables.

import {
  db,
  type StoredWorldProject,
  type StoredWorldLandmark,
  type StoredWorldForce,
  type StoredWorldRegion,
} from '../db';
import type {
  Project,
  EnhancedLandmark,
  EnhancedForce,
  EnhancedRegion,
} from '@/types/worldeditor/world-editor';
import { estimateEncodedSize, sanitizeForIndexedDB } from '../utils';

/** Complete in-memory state owned by the world editor. */
export interface WorldEditorSnapshot {
  projects: Project[];
  landmarks: EnhancedLandmark[];
  forces: EnhancedForce[];
  regions: EnhancedRegion[];
}

/** Portable representation used by application backup and restore. */
export interface WorldEditorExport {
  projects: StoredWorldProject[];
  landmarks: StoredWorldLandmark[];
  forces: StoredWorldForce[];
  regions: StoredWorldRegion[];
}

/** Storage statistics for world-editor records. */
export interface WorldEditorStats {
  projectCount: number;
  landmarkCount: number;
  forceCount: number;
  regionCount: number;
  approxBytes: number;
}

type OrderedEntity = { id: string; order: number };

const withoutOrder = <T extends OrderedEntity>(record: T): Omit<T, 'order'> => {
  const { order: _order, ...entity } = record;
  return entity;
};

const withOrder = <T extends { id: string }>(entities: T[]): Array<T & { order: number }> =>
  entities.map((entity, order) => ({ ...entity, order }));

const assertExport = (data: WorldEditorExport): void => {
  if (
    !data ||
    !Array.isArray(data.projects) ||
    !Array.isArray(data.landmarks) ||
    !Array.isArray(data.forces) ||
    !Array.isArray(data.regions)
  ) {
    throw new Error('Invalid world editor database export');
  }
};

const replaceChangedRecords = async <T extends OrderedEntity>(
  current: T[],
  next: T[],
  bulkPut: (records: T[]) => Promise<unknown>,
  bulkDelete: (ids: string[]) => Promise<unknown>
): Promise<void> => {
  const nextIds = new Set(next.map((record) => record.id));
  const deletedIds = current.filter((record) => !nextIds.has(record.id)).map((record) => record.id);
  const currentById = new Map(current.map((record) => [record.id, JSON.stringify(record)]));
  const changed = next.filter((record) => currentById.get(record.id) !== JSON.stringify(record));

  if (deletedIds.length > 0) await bulkDelete(deletedIds);
  if (changed.length > 0) await bulkPut(changed);
};

/** IndexedDB repository for world-editor state. */
export const worldEditorService = {
  /** Returns whether any world-editor table contains data. */
  async hasData(): Promise<boolean> {
    const counts = await Promise.all([
      db.worldProjects.count(),
      db.worldLandmarks.count(),
      db.worldForces.count(),
      db.worldRegions.count(),
    ]);
    return counts.some((count) => count > 0);
  },

  /** Loads all world-editor records while restoring their UI order. */
  async loadSnapshot(): Promise<WorldEditorSnapshot> {
    const [projects, landmarks, forces, regions] = await Promise.all([
      db.worldProjects.orderBy('order').toArray(),
      db.worldLandmarks.orderBy('order').toArray(),
      db.worldForces.orderBy('order').toArray(),
      db.worldRegions.orderBy('order').toArray(),
    ]);

    return {
      projects: projects.map((record) => withoutOrder(record) as Project),
      landmarks: landmarks.map((record) => withoutOrder(record) as EnhancedLandmark),
      forces: forces.map((record) => withoutOrder(record) as EnhancedForce),
      regions: regions.map((record) => withoutOrder(record) as EnhancedRegion),
    };
  },

  /**
   * Atomically reconciles all world-editor tables with an in-memory snapshot.
   * Unchanged records are not rewritten.
   */
  async saveSnapshot(snapshot: WorldEditorSnapshot): Promise<void> {
    const next = sanitizeForIndexedDB({
      projects: withOrder(snapshot.projects),
      landmarks: withOrder(snapshot.landmarks),
      forces: withOrder(snapshot.forces),
      regions: withOrder(snapshot.regions),
    }) as WorldEditorExport;

    await db.transaction(
      'rw',
      db.worldProjects,
      db.worldLandmarks,
      db.worldForces,
      db.worldRegions,
      async () => {
        const [projects, landmarks, forces, regions] = await Promise.all([
          db.worldProjects.toArray(),
          db.worldLandmarks.toArray(),
          db.worldForces.toArray(),
          db.worldRegions.toArray(),
        ]);

        await replaceChangedRecords(projects, next.projects, db.worldProjects.bulkPut.bind(db.worldProjects), db.worldProjects.bulkDelete.bind(db.worldProjects));
        await replaceChangedRecords(landmarks, next.landmarks, db.worldLandmarks.bulkPut.bind(db.worldLandmarks), db.worldLandmarks.bulkDelete.bind(db.worldLandmarks));
        await replaceChangedRecords(forces, next.forces, db.worldForces.bulkPut.bind(db.worldForces), db.worldForces.bulkDelete.bind(db.worldForces));
        await replaceChangedRecords(regions, next.regions, db.worldRegions.bulkPut.bind(db.worldRegions), db.worldRegions.bulkDelete.bind(db.worldRegions));
      }
    );
  },

  /** Exports the raw ordered records used by backup and sync. */
  async exportDatabase(): Promise<WorldEditorExport> {
    const [projects, landmarks, forces, regions] = await Promise.all([
      db.worldProjects.toArray(),
      db.worldLandmarks.toArray(),
      db.worldForces.toArray(),
      db.worldRegions.toArray(),
    ]);
    return { projects, landmarks, forces, regions };
  },

  /** Atomically replaces all world-editor records from a validated backup. */
  async importDatabase(data: WorldEditorExport): Promise<void> {
    assertExport(data);
    const sanitized = sanitizeForIndexedDB(data);
    await db.transaction(
      'rw',
      db.worldProjects,
      db.worldLandmarks,
      db.worldForces,
      db.worldRegions,
      async () => {
        await Promise.all([
          db.worldProjects.clear(),
          db.worldLandmarks.clear(),
          db.worldForces.clear(),
          db.worldRegions.clear(),
        ]);
        await Promise.all([
          sanitized.projects.length ? db.worldProjects.bulkPut(sanitized.projects) : Promise.resolve(),
          sanitized.landmarks.length ? db.worldLandmarks.bulkPut(sanitized.landmarks) : Promise.resolve(),
          sanitized.forces.length ? db.worldForces.bulkPut(sanitized.forces) : Promise.resolve(),
          sanitized.regions.length ? db.worldRegions.bulkPut(sanitized.regions) : Promise.resolve(),
        ]);
      }
    );
  },

  /** Removes every world-editor record in one transaction. */
  async clearDatabase(): Promise<void> {
    await db.transaction(
      'rw',
      db.worldProjects,
      db.worldLandmarks,
      db.worldForces,
      db.worldRegions,
      async () => {
        await Promise.all([
          db.worldProjects.clear(),
          db.worldLandmarks.clear(),
          db.worldForces.clear(),
          db.worldRegions.clear(),
        ]);
      }
    );
  },

  /** Returns counts and an approximate encoded size for storage UI. */
  async getStats(): Promise<WorldEditorStats> {
    const data = await this.exportDatabase();
    return {
      projectCount: data.projects.length,
      landmarkCount: data.landmarks.length,
      forceCount: data.forces.length,
      regionCount: data.regions.length,
      approxBytes: estimateEncodedSize(data),
    };
  },
};
