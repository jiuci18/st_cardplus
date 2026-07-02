import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import type {
  Project,
  EnhancedLandmark,
  EnhancedForce,
  EnhancedRegion,
  ProjectIntegration,
} from '@/types/worldeditor/world-editor';
import { LandmarkType, ImportanceLevel, ForceType, PowerLevel } from '@/types/worldeditor/world-editor';
import { v4 as uuidv4 } from 'uuid';
import { getSetting, localStorageStore } from '@/utils/localStorageUtils';
import {
  worldEditorService,
  type WorldEditorSnapshot,
} from '@/database/appdb/worldEditorService';
import { nowIso } from '@/utils/datetime';
import { pickRandomRegionColor } from '@/utils/worldeditor/regionColors';
import { normalizeLandmarkHierarchy, removeLandmarkFromHierarchy } from '@/utils/worldeditor/landmarkHierarchy';
import { removeLandmarkLinksForIds } from '@/composables/worldeditor/graph/worldGraphLinks';
import { saveFile } from '@/utils/system/fileSave';
import { ElMessage } from 'element-plus';

const WORLD_EDITOR_DATA_KEY = 'world-editor-data';

interface WorldProjectPackage {
  version: 1;
  exportedAt: string;
  project: Project;
  landmarks: EnhancedLandmark[];
  forces: EnhancedForce[];
  regions: EnhancedRegion[];
}

class LegacyWorldEditorDataError extends Error {}

const parseLegacySnapshot = (raw: string): WorldEditorSnapshot => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new LegacyWorldEditorDataError('旧版世界编辑器数据无法解析，原数据已保留');
  }

  if (
    !value ||
    typeof value !== 'object' ||
    !Array.isArray((value as WorldEditorSnapshot).projects) ||
    !Array.isArray((value as WorldEditorSnapshot).landmarks) ||
    !Array.isArray((value as WorldEditorSnapshot).forces) ||
    !Array.isArray((value as WorldEditorSnapshot).regions)
  ) {
    throw new LegacyWorldEditorDataError('旧版世界编辑器数据格式不正确，原数据已保留');
  }

  return value as WorldEditorSnapshot;
};

export function useWorldEditor() {
  // State Management
  const projects = ref<Project[]>([]);
  const landmarks = ref<EnhancedLandmark[]>([]);
  const forces = ref<EnhancedForce[]>([]);
  const regions = ref<EnhancedRegion[]>([]);
  const selectedItem = ref<Project | EnhancedLandmark | EnhancedForce | EnhancedRegion | ProjectIntegration | null>(
    null
  );
  const isLoading = ref(true);
  const loadError = ref<string | null>(null);
  const canRecoverLegacyData = ref(false);
  const isRecoveringLegacyData = ref(false);
  let isHydrated = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSnapshot: WorldEditorSnapshot | null = null;
  let saveInFlight: Promise<void> | null = null;

  const createSnapshot = (): WorldEditorSnapshot =>
    JSON.parse(
      JSON.stringify({
        projects: projects.value,
        landmarks: landmarks.value,
        forces: forces.value,
        regions: regions.value,
      })
    ) as WorldEditorSnapshot;

  const drainSaveQueue = (): Promise<void> => {
    if (saveInFlight) return saveInFlight;

    const task = (async () => {
      while (pendingSnapshot) {
        const snapshot = pendingSnapshot;
        pendingSnapshot = null;
        try {
          await worldEditorService.saveSnapshot(snapshot);
        } catch (error) {
          console.error('Failed to save world editor data:', error);
          ElMessage.error('世界编辑器数据保存失败，后续修改时将重试');
          break;
        }
      }
    })();

    saveInFlight = task.finally(() => {
      saveInFlight = null;
      if (pendingSnapshot) void drainSaveQueue();
    });
    return saveInFlight;
  };

  const scheduleSave = () => {
    if (!isHydrated) return;
    if (saveTimer) clearTimeout(saveTimer);
    const delay = Math.max(0, getSetting('autoSaveDebounce') * 1000);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      pendingSnapshot = createSnapshot();
      void drainSaveQueue();
    }, delay);
  };

  const flushSave = async () => {
    if (!isHydrated) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      pendingSnapshot = createSnapshot();
    }
    if (pendingSnapshot) {
      await drainSaveQueue();
    } else if (saveInFlight) {
      await saveInFlight;
    }
  };

  // Data Persistence
  watch(
    [projects, landmarks, forces, regions],
    scheduleSave,
    { deep: true }
  );

  // Computed properties
  const allTags = computed(() => {
    const tags = new Set<string>();
    landmarks.value.forEach((item) => {
      if (item.tags) {
        item.tags.forEach((tag) => tags.add(tag));
      }
    });
    forces.value.forEach((item) => {
      if (item.tags) {
        item.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags);
  });

  const allRegions = computed(() => regions.value);

  const activeProjectId = computed(() => {
    if (!selectedItem.value) return projects.value[0]?.id;
    if ('projectId' in selectedItem.value) {
      return selectedItem.value.projectId;
    }
    // if selected item is a project
    if ('createdAt' in selectedItem.value) {
      return selectedItem.value.id;
    }
    return projects.value[0]?.id;
  });

  // Methods
  const handleSelection = (item: Project | EnhancedLandmark | EnhancedForce | EnhancedRegion | ProjectIntegration) => {
    selectedItem.value = item;
  };

  const createNewLandmark = (projectId: string): EnhancedLandmark => ({
    id: uuidv4(),
    projectId: projectId,
    name: '新地标',
    description: '',
    type: LandmarkType.CUSTOM,
    importance: ImportanceLevel.NORMAL,
    tags: [],
    regionId: undefined,
    position: undefined,
    parentLandmarkIds: [],
    childLandmarkIds: [],
    controllingForces: [],
    relatedLandmarks: [],
    roadConnections: [],
    resources: [],
    notes: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1,
  });

  const createNewRegion = (projectId: string): EnhancedRegion => ({
    id: uuidv4(),
    projectId: projectId,
    name: '新区域',
    description: '',
    color: pickRandomRegionColor(),
    notes: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1,
  });

  const createRegion = (name: string, projectId: string): EnhancedRegion => {
    const newRegion = createNewRegion(projectId);
    newRegion.name = name.trim() || '新区域';
    regions.value.unshift(newRegion);
    return newRegion;
  };

  const createNewForce = (projectId: string): EnhancedForce => ({
    id: uuidv4(),
    projectId: projectId,
    name: '新势力',
    description: '',
    type: ForceType.CUSTOM,
    power: PowerLevel.MODERATE,
    structure: { hierarchy: [], decisionMaking: '', recruitment: '' },
    leaders: [],
    members: [],
    totalMembers: 0,
    controlledTerritories: [],
    influenceAreas: [],
    allies: [],
    enemies: [],
    neutral: [],
    resources: [],
    capabilities: [],
    weaknesses: [],
    timeline: [],
    tags: [],
    notes: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1,
  });

  const handleAdd = (type: 'landmark' | 'force' | 'region') => {
    const projectId = activeProjectId.value;
    if (!projectId) {
      console.error('No active project to add the item to.');
      return;
    }

    if (type === 'landmark') {
      const newLandmark = createNewLandmark(projectId);
      landmarks.value.unshift(newLandmark);
      selectedItem.value = newLandmark;
    } else if (type === 'region') {
      const newRegion = createNewRegion(projectId);
      regions.value.unshift(newRegion);
      selectedItem.value = newRegion;
    } else {
      const newForce = createNewForce(projectId);
      forces.value.unshift(newForce);
      selectedItem.value = newForce;
    }
  };

  const handleDelete = (item: Project | EnhancedLandmark | EnhancedForce | EnhancedRegion | ProjectIntegration) => {
    if ('type' in item && item.type === 'integration') {
      console.warn('Integration nodes cannot be deleted.');
      return;
    }

    if ('projectId' in item) {
      if ('importance' in item) {
        removeLandmarkLinksForIds(landmarks.value, new Set([item.id]));
        removeLandmarkFromHierarchy(landmarks.value, item.id);
        const index = landmarks.value.findIndex((l) => l.id === item.id);
        if (index > -1) landmarks.value.splice(index, 1);
      } else if ('power' in item) {
        const index = forces.value.findIndex((f) => f.id === item.id);
        if (index > -1) forces.value.splice(index, 1);
      } else {
        const index = regions.value.findIndex((r) => r.id === item.id);
        if (index > -1) regions.value.splice(index, 1);
        landmarks.value.forEach((landmark) => {
          if (landmark.regionId === item.id) {
            landmark.regionId = undefined;
          }
        });
      }
    } else if ('createdAt' in item) {
      const project = item as Project;
      if (projects.value.length <= 1) {
        console.warn('Cannot delete the last project.');
        return;
      }
      const index = projects.value.findIndex((p) => p.id === project.id);
      if (index > -1) {
        landmarks.value = landmarks.value.filter((l) => l.projectId !== project.id);
        forces.value = forces.value.filter((f) => f.projectId !== project.id);
        regions.value = regions.value.filter((r) => r.projectId !== project.id);
        projects.value.splice(index, 1);
      }
    }

    if (selectedItem.value?.id === item.id) {
      selectedItem.value = projects.value[0] || landmarks.value[0] || forces.value[0] || regions.value[0] || null;
    }
  };

  const handleCopy = (item: EnhancedLandmark | EnhancedForce | EnhancedRegion) => {
    if ('importance' in item) {
      const landmarkItem = item as EnhancedLandmark;
      const newLandmark: EnhancedLandmark = {
        ...landmarkItem,
        id: uuidv4(),
        name: `${landmarkItem.name} (复制)`,
        parentLandmarkIds: [],
        childLandmarkIds: [],
        position: landmarkItem.position ? { ...landmarkItem.position } : undefined,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      landmarks.value.unshift(newLandmark);
      selectedItem.value = newLandmark;
    } else if ('power' in item) {
      const forceItem = item as EnhancedForce;
      const newForce: EnhancedForce = {
        ...forceItem,
        id: uuidv4(),
        name: `${forceItem.name} (复制)`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      forces.value.unshift(newForce);
      selectedItem.value = newForce;
    } else {
      const regionItem = item as EnhancedRegion;
      const newRegion: EnhancedRegion = {
        ...regionItem,
        id: uuidv4(),
        name: `${regionItem.name} (复制)`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      regions.value.unshift(newRegion);
      selectedItem.value = newRegion;
    }
  };

  const handleProjectSubmit = (projectData: Project, editingProject: Project | null) => {
    if (editingProject) {
      const index = projects.value.findIndex((p) => p.id === editingProject.id);
      if (index !== -1) {
        projects.value[index] = { ...projects.value[index], ...projectData, updatedAt: nowIso() };
      }
    } else {
      const newProject = {
        ...projectData,
        id: uuidv4(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      projects.value.unshift(newProject);
      selectedItem.value = newProject;
    }
  };

  const exportProject = async (projectId: string) => {
    const project = projects.value.find((item) => item.id === projectId);
    if (!project) {
      ElMessage.error('未找到当前项目');
      return;
    }

    const exportData: WorldProjectPackage = {
      version: 1,
      exportedAt: nowIso(),
      project: JSON.parse(JSON.stringify(project)),
      landmarks: landmarks.value.filter((item) => item.projectId === projectId).map((item) => JSON.parse(JSON.stringify(item))),
      forces: forces.value.filter((item) => item.projectId === projectId).map((item) => JSON.parse(JSON.stringify(item))),
      regions: regions.value.filter((item) => item.projectId === projectId).map((item) => JSON.parse(JSON.stringify(item))),
    };

    const safeName = (project.name || '未命名项目').replace(/[\\/:*?"<>|]/g, '-');
    await saveFile({
      data: new TextEncoder().encode(JSON.stringify(exportData, null, 2)),
      fileName: `${safeName}.json`,
      mimeType: 'application/json;charset=utf-8',
    });
    ElMessage.success(`项目「${project.name || '未命名项目'}」已导出`);
  };

  const replaceProjectContent = (projectId: string, imported: WorldProjectPackage) => {
    const projectIndex = projects.value.findIndex((item) => item.id === projectId);
    const currentProject = projects.value[projectIndex];
    if (projectIndex === -1 || !currentProject) {
      throw new Error('当前项目不存在');
    }

    const nextProject: Project = {
      ...currentProject,
      name: imported.project?.name?.trim() || currentProject.name,
      description: imported.project?.description || '',
      updatedAt: nowIso(),
    };

    const nextLandmarks = imported.landmarks.map((item) => ({ ...item, projectId }));
    const nextForces = imported.forces.map((item) => ({ ...item, projectId }));
    const nextRegions = imported.regions.map((item) => ({ ...item, projectId }));

    projects.value.splice(projectIndex, 1, nextProject);
    landmarks.value = landmarks.value.filter((item) => item.projectId !== projectId).concat(nextLandmarks);
    forces.value = forces.value.filter((item) => item.projectId !== projectId).concat(nextForces);
    regions.value = regions.value.filter((item) => item.projectId !== projectId).concat(nextRegions);
    normalizeLandmarkHierarchy(landmarks.value);

    if (selectedItem.value && 'createdAt' in selectedItem.value && selectedItem.value.id === projectId) {
      selectedItem.value = nextProject;
    }
  };

  const importProjectOverwrite = (projectId: string) => {
    const project = projects.value.find((item) => item.id === projectId);
    if (!project) {
      ElMessage.error('未找到当前项目');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const content = String(loadEvent.target?.result || '');
          const parsed = JSON.parse(content) as Partial<WorldProjectPackage>;
          if (
            !parsed ||
            typeof parsed !== 'object' ||
            !parsed.project ||
            !Array.isArray(parsed.landmarks) ||
            !Array.isArray(parsed.forces) ||
            !Array.isArray(parsed.regions)
          ) {
            throw new Error('文件格式不正确，无法覆盖当前项目');
          }

          replaceProjectContent(projectId, parsed as WorldProjectPackage);
          ElMessage.success(`项目「${project.name || '未命名项目'}」已覆盖导入`);
        } catch (error) {
          ElMessage.error(error instanceof Error ? error.message : '导入失败');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const loadWorldEditorData = async () => {
    isLoading.value = true;
    loadError.value = null;
    canRecoverLegacyData.value = false;
    isHydrated = false;

    try {
      const legacyRaw = localStorageStore.get(WORLD_EDITOR_DATA_KEY);
      const hasIndexedData = await worldEditorService.hasData();
      let snapshot: WorldEditorSnapshot;

      if (!hasIndexedData && legacyRaw !== null) {
        snapshot = parseLegacySnapshot(legacyRaw);
        normalizeLandmarkHierarchy(snapshot.landmarks);
        await worldEditorService.saveSnapshot(snapshot);
        localStorageStore.remove(WORLD_EDITOR_DATA_KEY);
      } else {
        snapshot = await worldEditorService.loadSnapshot();
        if (legacyRaw !== null) localStorageStore.remove(WORLD_EDITOR_DATA_KEY);
      }

      projects.value = snapshot.projects;
      landmarks.value = snapshot.landmarks;
      forces.value = snapshot.forces;
      regions.value = snapshot.regions;
      normalizeLandmarkHierarchy(landmarks.value);
      selectedItem.value = landmarks.value[0] || forces.value[0] || regions.value[0] || null;
      isHydrated = true;
    } catch (error) {
      console.error('Failed to load world editor data:', error);
      canRecoverLegacyData.value = error instanceof LegacyWorldEditorDataError;
      loadError.value = error instanceof Error ? error.message : '世界编辑器数据加载失败';
    } finally {
      isLoading.value = false;
    }
  };

  const downloadLegacyDataAndReset = async () => {
    const raw = localStorageStore.get(WORLD_EDITOR_DATA_KEY);
    if (raw === null || isRecoveringLegacyData.value) return;

    isRecoveringLegacyData.value = true;
    try {
      const result = await saveFile({
        data: new TextEncoder().encode(raw),
        fileName: `world-editor-legacy-recovery-${nowIso().slice(0, 10)}.json`,
        mimeType: 'application/json;charset=utf-8',
        quickSave: false,
      });
      if (result.canceled) return;

      await worldEditorService.clearDatabase();
      localStorageStore.remove(WORLD_EDITOR_DATA_KEY);
      ElMessage.success('旧数据已下载，世界编辑器工作区已重建');
      await loadWorldEditorData();
    } catch (error) {
      console.error('Failed to recover legacy world editor data:', error);
      ElMessage.error('下载或重建工作区失败，旧数据未被删除');
    } finally {
      isRecoveringLegacyData.value = false;
    }
  };

  const handlePageHide = () => {
    void flushSave();
  };

  onMounted(() => {
    window.addEventListener('pagehide', handlePageHide);
    void loadWorldEditorData();
  });

  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', handlePageHide);
    void flushSave();
  });

  return {
    projects,
    landmarks,
    forces,
    regions,
    selectedItem,
    isLoading,
    loadError,
    canRecoverLegacyData,
    isRecoveringLegacyData,
    activeProjectId,
    allTags,
    allRegions,
    createRegion,
    handleSelection,
    handleAdd,
    handleDelete,
    handleCopy,
    handleProjectSubmit,
    exportProject,
    importProjectOverwrite,
    retryStorageLoad: loadWorldEditorData,
    downloadLegacyDataAndReset,
  };
}
