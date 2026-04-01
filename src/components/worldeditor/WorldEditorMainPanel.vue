<template>
  <div class="world-editor-main-panel">
    <template v-if="props.selectedItem">
      <div
        class="editor-content"
        :key="props.selectedItem.id"
      >
        <ProjectEditor
          v-if="isProject(props.selectedItem)"
          :project="props.selectedItem"
          :on-export-project="props.exportProject"
          :on-import-project-overwrite="props.importProjectOverwrite"
        />
        <LandmarkEditor
          v-else-if="isLandmark(props.selectedItem)"
          :landmark="props.selectedItem"
          :all-landmarks="props.landmarks"
          :all-tags="props.allTags"
          :all-regions="props.allRegions"
          :all-forces="props.forces"
          :create-region="props.createRegion"
          @select-force="handleSelectForce"
        />
        <RegionEditor
          v-else-if="isRegion(props.selectedItem)"
          :region="props.selectedItem"
        />
        <ForceEditor
          v-else-if="isForce(props.selectedItem)"
          :force="props.selectedItem"
          :all-tags="props.allTags"
          :all-forces="props.forces"
          :all-landmarks="props.landmarks"
        />
        <IntegratedPanel
          v-else-if="isIntegration(props.selectedItem)"
          :integration="props.selectedItem"
          :current-project="getCurrentProject(props.selectedItem)"
          :landmarks="props.landmarks || []"
          :regions="props.regions || []"
          :forces="props.forces || []"
        />
        <div
          v-else
          class="editor-placeholder"
        >
          <p>未知项目类型</p>
        </div>
      </div>
    </template>
    <div
      v-else
      class="editor-placeholder"
    >
      <p>
        请选择一个条目/功能以使用，或者
        <button
          type="button"
          class="create-project-link"
          @click="handleCreateProject"
        >
          新建
        </button>
        一个项目
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  EnhancedForce,
  EnhancedLandmark,
  EnhancedRegion,
  Project,
  ProjectIntegration,
} from '@/types/world-editor';
import ForceEditor from './editorPacel/ForceEditor.vue';
import IntegratedPanel from './editorPacel/IntegratedPanel.vue';
import LandmarkEditor from './editorPacel/LandmarkEditor.vue';
import RegionEditor from './editorPacel/RegionEditor.vue';
import ProjectEditor from './ProjectEditor.vue';

interface Props {
  selectedItem: Project | EnhancedLandmark | EnhancedForce | EnhancedRegion | ProjectIntegration | null;
  allTags?: string[];
  allRegions?: EnhancedRegion[];
  landmarks?: EnhancedLandmark[];
  forces?: EnhancedForce[];
  regions?: EnhancedRegion[];
  createRegion?: (name: string, projectId: string) => EnhancedRegion;
  projects?: Project[];
  exportProject?: (projectId: string) => void | Promise<void>;
  importProjectOverwrite?: (projectId: string) => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:selectedItem', item: Project | EnhancedLandmark | EnhancedForce | EnhancedRegion): void;
  (e: 'create-project'): void;
}>();

const handleCreateProject = () => {
  emit('create-project');
};

const handleSelectForce = (force: EnhancedForce) => {
  emit('update:selectedItem', force);
};

const isProject = (item: any): item is Project => {
  return item && 'createdAt' in item && !('projectId' in item);
};

const isLandmark = (item: any): item is EnhancedLandmark => {
  return item && 'projectId' in item && 'importance' in item;
};

const isForce = (item: any): item is EnhancedForce => {
  return item && 'projectId' in item && 'power' in item;
};

const isRegion = (item: any): item is EnhancedRegion => {
  return item && 'projectId' in item && 'color' in item;
};

const isIntegration = (item: any): item is ProjectIntegration => {
  return item && item.type === 'integration';
};

const getCurrentProject = (integration: ProjectIntegration): Project | null => {
  if (!props.projects) return null;
  return props.projects.find((p) => p.id === integration.projectId) || null;
};
</script>

<style scoped>
.world-editor-main-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.world-editor-main-panel > .editor-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.world-editor-main-panel > .editor-placeholder,
.world-editor-main-panel > .editor-content > .editor-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  color: var(--el-text-color-placeholder);
  text-align: center;
  padding: 20px;
  box-sizing: border-box;
}

.create-project-link {
  border: none;
  background: transparent;
  padding: 0 2px;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
}

.create-project-link:hover {
  color: var(--el-color-primary-light-3);
}
</style>
