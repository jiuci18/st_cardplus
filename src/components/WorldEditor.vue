<template>
  <div class="world-editor-container">
    <div class="world-editor-mobile-layout">
      <div class="main-panel-container world-editor-mobile-panel">
        <WorldGraph
          v-if="graphProjectId"
          :projects="projects"
          :landmarks="landmarks"
          :forces="forces"
          :regions="regions"
          :active-project-id="graphProjectId || activeProjectId"
          @edit-item="handleEditFromGraph"
        />
        <WorldEditorMainPanel
          v-else
          :selected-item="selectedItem"
          :all-tags="allTags"
          :all-regions="allRegions"
          :landmarks="landmarks"
          :forces="forces"
          :regions="regions"
          :create-region="createRegion"
          :projects="projects"
          :export-project="exportProject"
          :import-project-overwrite="importProjectOverwrite"
          @update:selected-item="handleSelectionFromChild"
          @create-project="handleCreateProjectFromPanel"
        />
      </div>

      <MobileBookmarkDrawer
        v-model:visible="mobileDrawerVisible"
        v-model:active-tab="mobilePanelTab"
        :items="mobileBookmarkItems"
        drawer-size="88%"
      >
        <template #pane-list>
          <WorldEditorToolbar
            :projects="projects"
            :landmarks="landmarks"
            :forces="forces"
            :regions="regions"
            :selected-item="selectedItem"
            @select="handleSelection"
            @open-graph="handleOpenGraph"
            @add="handleAdd"
            @delete="handleDelete"
            @edit="handleEdit"
            @copy="handleCopy"
            :drag-drop-handlers="dragDropHandlers"
          />
        </template>
      </MobileBookmarkDrawer>
    </div>

    <div class="world-editor-desktop-layout">
      <Splitpanes
        class="default-theme"
        style="height: 100%"
      >
        <Pane
          size="15"
          min-size="12"
          max-size="30"
        >
          <div class="toolbar-container">
            <WorldEditorToolbar
              :projects="projects"
              :landmarks="landmarks"
              :forces="forces"
              :regions="regions"
              :selected-item="selectedItem"
              @select="handleSelection"
              @open-graph="handleOpenGraph"
              @add="handleAdd"
              @delete="handleDelete"
              @edit="handleEdit"
              @copy="handleCopy"
              :drag-drop-handlers="dragDropHandlers"
            />
          </div>
        </Pane>
        <Pane
          size="85"
          min-size="70"
        >
          <div class="main-panel-container">
            <WorldGraph
              v-if="graphProjectId"
              :projects="projects"
              :landmarks="landmarks"
              :forces="forces"
              :regions="regions"
              :active-project-id="graphProjectId || activeProjectId"
              @edit-item="handleEditFromGraph"
            />
            <WorldEditorMainPanel
              v-else
              :selected-item="selectedItem"
              :all-tags="allTags"
              :all-regions="allRegions"
              :landmarks="landmarks"
              :forces="forces"
              :regions="regions"
              :create-region="createRegion"
              :projects="projects"
              :export-project="exportProject"
              :import-project-overwrite="importProjectOverwrite"
              @update:selected-item="handleSelectionFromChild"
              @create-project="handleCreateProjectFromPanel"
            />
          </div>
        </Pane>
      </Splitpanes>
    </div>
    <ProjectModal
      v-model:visible="isModalVisible"
      :project-data="editingProject"
      @submit="handleModalSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import '@/css/worldeditor.css';
import type {
  Project,
  EnhancedLandmark,
  EnhancedForce,
  EnhancedRegion,
  ProjectIntegration,
} from '@/types/world-editor';
import WorldEditorToolbar from '@/components/worldeditor/WorldEditorToolbar.vue';
import WorldEditorMainPanel from './worldeditor/WorldEditorMainPanel.vue';
import WorldGraph from './worldeditor/WorldGraph.vue';
import ProjectModal from './worldeditor/ProjectModal.vue';
import MobileBookmarkDrawer from '@/components/ui/common/MobileBookmarkDrawer.vue';
import { useWorldEditor } from '@/composables/worldeditor/useWorldEditor';
import { useWorldEditorUI } from '@/composables/worldeditor/useWorldEditorUI';
import { useDragAndDrop } from '@/composables/worldeditor/useDragAndDrop';
import { useDevice } from '@/composables/useDevice';
import { collectDescendantIds, removeLandmarkFromHierarchy } from '@/utils/worldeditor/landmarkHierarchy';
import { removeLandmarkLinksForIds } from '@/composables/worldeditor/graph/worldGraphLinks';

const graphProjectId = ref<string | null>(null);
const mobileDrawerVisible = ref(false);
const mobilePanelTab = ref('list');
const mobileBookmarkItems = [
  { key: 'list', label: '列表', drawerLabel: '项目列表', title: '项目列表', icon: 'ph:list-bullets-duotone' },
];
const { isMobile } = useDevice();

const {
  projects,
  landmarks,
  forces,
  regions,
  selectedItem,
  activeProjectId,
  allTags,
  allRegions,
  createRegion,
  handleSelection: coreHandleSelection,
  handleAdd: handleAddEntity,
  handleDelete: coreHandleDelete,
  handleCopy,
  handleProjectSubmit,
  exportProject,
  importProjectOverwrite,
} = useWorldEditor();

const handleSelection = (item: Project | EnhancedLandmark | EnhancedForce | EnhancedRegion | ProjectIntegration) => {
  coreHandleSelection(item);
  graphProjectId.value = null;
  if (isMobile.value) {
    mobileDrawerVisible.value = false;
  }
};

const handleSelectionFromChild = (
  item: Project | EnhancedLandmark | EnhancedForce | EnhancedRegion | ProjectIntegration
) => {
  coreHandleSelection(item);
  graphProjectId.value = null;
};

const handleEditFromGraph = (item: EnhancedLandmark) => {
  coreHandleSelection(item);
  graphProjectId.value = null;
};

const handleOpenGraph = (projectId: string) => {
  graphProjectId.value = projectId;
  if (isMobile.value) {
    mobileDrawerVisible.value = false;
  }
};

const {
  isModalVisible,
  editingProject,
  handleAddProject,
  handleEdit: handleEditProject,
  handleModalSubmit,
} = useWorldEditorUI(handleProjectSubmit);

const dragDropHandlers = useDragAndDrop(landmarks, forces, regions);

const handleAdd = (type: 'project' | 'landmark' | 'force' | 'region') => {
  if (type === 'project') {
    handleAddProject();
  } else {
    handleAddEntity(type);
  }
  if (isMobile.value) {
    mobileDrawerVisible.value = false;
  }
};

const handleCreateProjectFromPanel = () => {
  handleAddProject();
};

const handleEdit = (item: Project | EnhancedLandmark | EnhancedForce | EnhancedRegion | ProjectIntegration) => {
  if ('createdAt' in item && !('projectId' in item)) {
    handleEditProject(item as Project);
  } else {
    handleSelection(item);
  }
  if (isMobile.value) {
    mobileDrawerVisible.value = false;
  }
};

const deleteLandmarkTree = (landmarkId: string) => {
  const ids = collectDescendantIds(landmarks.value, landmarkId);
  ids.add(landmarkId);
  removeLandmarkLinksForIds(landmarks.value, ids);
  ids.forEach((id) => removeLandmarkFromHierarchy(landmarks.value, id));
  landmarks.value = landmarks.value.filter((landmark) => !ids.has(landmark.id));
  if (selectedItem.value && 'importance' in selectedItem.value && ids.has(selectedItem.value.id)) {
    selectedItem.value = projects.value[0] || landmarks.value[0] || forces.value[0] || regions.value[0] || null;
  }
};

const handleDelete = async (item: Project | EnhancedLandmark | EnhancedForce | EnhancedRegion | ProjectIntegration) => {
  if ('importance' in item) {
    const childIds = collectDescendantIds(landmarks.value, item.id);
    if (childIds.size > 0) {
      try {
        await ElMessageBox.confirm(
          '你必须删除或者转移本父级地标下的全部子地标才能删除！不会转移？试试在节点图拖拽或者拖拽条目。',
          '无法删除父级地标',
          {
            confirmButtonText: '一切都毁灭吧',
            cancelButtonText: '取消',
            type: 'warning',
            closeOnClickModal: false,
          }
        );
        deleteLandmarkTree(item.id);
      } catch (error) {
        return;
      }
      return;
    }
  }
  coreHandleDelete(item);
};
</script>

<style scoped>
.world-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 4px;
  background-color: var(--el-bg-color-page);
  box-sizing: border-box;
}

.toolbar-container {
  height: 100%;
  overflow: hidden;
}

.main-panel-container {
  height: 100%;
  background-color: var(--el-bg-color);
  border-radius: 4px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
  overflow: hidden;
}
</style>
