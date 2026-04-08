import { ref } from 'vue';
import type { Project, EnhancedLandmark, EnhancedForce } from '@/types/worldeditor/world-editor';

export function useWorldEditorUI(handleProjectSubmit: (projectData: Project, editingProject: Project | null) => void) {
  const isModalVisible = ref(false);
  const editingProject = ref<Project | null>(null);

  const handleAddProject = () => {
    editingProject.value = null;
    isModalVisible.value = true;
  };

  const handleEdit = (item: Project | EnhancedLandmark | EnhancedForce) => {
    if ('createdAt' in item && !('projectId' in item)) {
      // Is a Project
      editingProject.value = item;
      isModalVisible.value = true;
    }
    // Selection of landmarks/forces will be handled by useWorldEditor
  };

  const handleModalSubmit = (projectData: Project) => {
    handleProjectSubmit(projectData, editingProject.value);
    editingProject.value = null; // Reset after submit
  };

  return {
    isModalVisible,
    editingProject,
    handleAddProject,
    handleEdit,
    handleModalSubmit,
  };
}
