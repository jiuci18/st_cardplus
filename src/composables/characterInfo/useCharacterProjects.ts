import { computed, type Ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { v4 as uuidv4 } from 'uuid';
import type { CharacterProject } from '@/types/character/character';

interface ProjectState {
  projects: Record<string, CharacterProject>;
}

const normalizeProjectOrders = (projectsInput: Record<string, CharacterProject> = {}) => {
  const projects = { ...projectsInput };
  const values = Object.values(projects);
  const hasAnyOrder = values.some((project) => typeof project.order === 'number');

  if (!hasAnyOrder) {
    values.forEach((project, index) => {
      projects[project.id] = {
        ...project,
        order: index,
      };
    });
    return projects;
  }

  let maxOrder = values.reduce((max, project) => Math.max(max, typeof project.order === 'number' ? project.order : -1), -1);
  values.forEach((project) => {
    if (typeof project.order === 'number') return;
    maxOrder += 1;
    projects[project.id] = {
      ...project,
      order: maxOrder,
    };
  });

  return projects;
};

export function useCharacterProjects<T extends ProjectState>(characterCollection: Ref<T>) {
  const projects = computed(() => {
    return Object.values(characterCollection.value.projects).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  const ensureProjects = () => {
    const nextProjects = normalizeProjectOrders(characterCollection.value.projects || {});
    characterCollection.value = {
      ...characterCollection.value,
      projects: nextProjects,
    } as T;
  };

  const getNextProjectOrder = () => {
    const orders = Object.values(characterCollection.value.projects)
      .map((project) => project.order)
      .filter((order): order is number => typeof order === 'number');
    return orders.length > 0 ? Math.max(...orders) + 1 : 0;
  };

  const handleCreateProject = async () => {
    try {
      const createProjectResult = await ElMessageBox.prompt('请输入新项目的名称：', '创建新项目', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
        inputValue: '新项目',
      });
      const { value: projectName } = createProjectResult as { value: string };

      const newId = uuidv4();
      const newProject: CharacterProject = {
        id: newId,
        name: projectName,
        order: getNextProjectOrder(),
      };

      characterCollection.value = {
        ...characterCollection.value,
        projects: {
          ...characterCollection.value.projects,
          [newId]: newProject,
        },
      } as T;

      ElMessage.success(`项目 "${projectName}" 已创建！`);
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.info('创建操作已取消');
      }
    }
  };

  const reorderProjects = (orderedIds: string[]) => {
    if (!orderedIds.length) return;
    const updatedProjects = { ...characterCollection.value.projects };
    orderedIds.forEach((id, index) => {
      const project = updatedProjects[id];
      if (!project) return;
      updatedProjects[id] = {
        ...project,
        order: index,
      };
    });

    characterCollection.value = {
      ...characterCollection.value,
      projects: updatedProjects,
    } as T;
  };

  const handleRenameProject = async (projectId: string) => {
    const project = characterCollection.value.projects[projectId];
    if (!project) return;

    try {
      const renameProjectResult = await ElMessageBox.prompt('请输入项目的新名称：', '重命名项目', {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
        inputValue: project.name,
      });
      const { value: projectName } = renameProjectResult as { value: string };

      characterCollection.value = {
        ...characterCollection.value,
        projects: {
          ...characterCollection.value.projects,
          [projectId]: {
            ...project,
            name: projectName,
          },
        },
      } as T;

      ElMessage.success(`项目 "${project.name}" 已重命名为 "${projectName}"！`);
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.info('重命名操作已取消');
      }
    }
  };

  return {
    projects,
    ensureProjects,
    handleCreateProject,
    reorderProjects,
    handleRenameProject,
  };
}
