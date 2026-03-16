import { computed, type Ref } from 'vue';
import type { Project, LogicBlock, StageScheme, EditorError } from '@/types/ejs-editor';
import { ElMessage } from 'element-plus';
import { nowIso, formatDateTime } from '@/utils/datetime';
import { saveFile } from '@/utils/fileSave';

export function useEjsProject(
  projects: Ref<Project[]>,
  currentProjectId: Ref<string>,
  yamlInput: Ref<string>,
  logicBlocks: Ref<LogicBlock[]>,
  currentSchemeId: Ref<string>,
  selectedStageId: Ref<string>,
  importYamlVariables: () => void,
  generateEjsTemplate: () => void,
  loadSchemeState: (scheme: StageScheme) => void,
  saveCurrentSchemeState: () => void,
  createStageScheme: (name: string, description?: string) => string,
  switchStageScheme: (schemeId: string) => void,
  errors: Ref<EditorError[]>
) {
  const currentProject = computed(() => projects.value.find((project) => project.id === currentProjectId.value));

  function convertLegacyData(projectData: any): LogicBlock[] {
    if (projectData.logicBlocks) {
      return projectData.logicBlocks; // Already new format
    }
    if (projectData.stages && Array.isArray(projectData.stages)) {
      // Old format detected, convert it
      const defaultBlock: LogicBlock = {
        id: `block_legacy_${Date.now()}`,
        name: '默认逻辑块',
        stages: projectData.stages,
        defaultStageContent: projectData.defaultStageContent || '// 默认情况',
        enabled: true,
      };
      return [defaultBlock];
    }
    return []; // No stage data
  }

  function createProject(name: string = `项目${projects.value.length + 1}`, copyFromCurrent: boolean = false): string {
    if (currentProjectId.value) {
      saveCurrentProjectState();
    }

    const newProject: Project = {
      id: `project_${Date.now()}`,
      name,
      yamlInput: copyFromCurrent ? yamlInput.value : '',
      logicBlocks: copyFromCurrent ? JSON.parse(JSON.stringify(logicBlocks.value)) : [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    projects.value.push(newProject);
    currentProjectId.value = newProject.id;
    loadProjectState(newProject);

    return newProject.id;
  }

  function switchProject(projectId: string) {
    const project = projects.value.find((p) => p.id === projectId);
    if (!project) throw new Error(`项目 ${projectId} 不存在`);

    saveCurrentProjectState();
    currentProjectId.value = projectId;
    loadProjectState(project);
  }

  function saveCurrentProjectState() {
    if (!currentProjectId.value) return;

    const project = projects.value.find((p) => p.id === currentProjectId.value);
    if (project) {
      project.yamlInput = yamlInput.value;
      project.logicBlocks = JSON.parse(JSON.stringify(logicBlocks.value));
      project.currentSchemeId = currentSchemeId.value;
      project.updatedAt = nowIso();
      saveCurrentSchemeState();
    }
  }

  function loadProjectState(project: Project) {
    yamlInput.value = project.yamlInput;
    if (project.yamlInput) {
      importYamlVariables();
    }

    const loadedLogicBlocks = convertLegacyData(project);

    if (project.stageSchemes && project.stageSchemes.length > 0) {
      const firstScheme = project.stageSchemes[0];
      const targetSchemeId = project.currentSchemeId || (firstScheme ? firstScheme.id : '');
      const targetScheme = project.stageSchemes.find((s) => s.id === targetSchemeId);

      if (targetScheme) {
        currentSchemeId.value = targetSchemeId;
        loadSchemeState(targetScheme);
      } else {
        logicBlocks.value = loadedLogicBlocks;
        currentSchemeId.value = '';
      }
    } else {
      logicBlocks.value = loadedLogicBlocks;
      currentSchemeId.value = '';
    }

    const firstLogicBlock = logicBlocks.value[0];
    if (firstLogicBlock && firstLogicBlock.stages && firstLogicBlock.stages.length > 0) {
      const firstStage = firstLogicBlock.stages[0];
      if (firstStage) {
        selectedStageId.value = `${firstLogicBlock.id}/${firstStage.id}`;
      }
    } else {
      selectedStageId.value = '';
    }

    generateEjsTemplate();
  }

  function renameProject(projectId: string, newName: string) {
    const project = projects.value.find((p) => p.id === projectId);
    if (project) {
      project.name = newName;
      project.updatedAt = nowIso();
    }
  }

  function deleteProject(projectId: string) {
    const index = projects.value.findIndex((p) => p.id === projectId);
    if (index > -1) {
      projects.value.splice(index, 1);
      if (currentProjectId.value === projectId) {
        if (projects.value.length > 0) {
          const firstProject = projects.value[0];
          if (firstProject) {
            switchProject(firstProject.id);
          }
        } else {
          createProject('默认项目');
        }
      }
    }
  }

  function importAsNewProject(config: any, name?: string) {
    const projectName = name || `导入项目_${formatDateTime(nowIso())}`;

    const newProject: Project = {
      id: `project_${Date.now()}`,
      name: projectName,
      yamlInput: config.yamlInput || '',
      logicBlocks: convertLegacyData(config),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    projects.value.push(newProject);
    switchProject(newProject.id);
    return newProject.id;
  }

  function exportConfig() {
    return {
      yamlInput: yamlInput.value,
      logicBlocks: logicBlocks.value,
      timestamp: nowIso(),
    };
  }

  function importConfig(config: any, replaceCurrentProject: boolean = false, projectName?: string) {
    try {
      const importedLogicBlocks = convertLegacyData(config);

      if (replaceCurrentProject && currentProjectId.value) {
        const project = projects.value.find((p) => p.id === currentProjectId.value);
        if (project) {
          project.yamlInput = config.yamlInput || '';
          project.logicBlocks = importedLogicBlocks;
          project.updatedAt = nowIso();
          loadProjectState(project);
        }
      } else {
        if (projects.value.length > 0) {
          importAsNewProject(config, projectName);
        } else {
          yamlInput.value = config.yamlInput || '';
          logicBlocks.value = importedLogicBlocks;
          if (config.yamlInput) importYamlVariables();
          const firstLogicBlock = logicBlocks.value[0];
          if (firstLogicBlock && firstLogicBlock.stages && firstLogicBlock.stages.length > 0) {
            const firstStage = firstLogicBlock.stages[0];
            if (firstStage) {
              selectedStageId.value = `${firstLogicBlock.id}/${firstStage.id}`;
            }
          }
          generateEjsTemplate();
        }
      }
    } catch (error) {
      errors.value.push({
        type: 'yaml',
        message: `导入配置错误: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }

  function initializeStore() {
    if (projects.value.length === 0 && !currentProjectId.value) {
      const defaultProjectId = createProject('默认项目', false);
      const project = projects.value.find((p) => p.id === defaultProjectId);
      if (project) {
        const defaultSchemeId = createStageScheme('默认方案', '初始阶段配置方案');
        switchStageScheme(defaultSchemeId);
      }
    }
  }

  async function exportCurrentProject() {
    if (!currentProject.value) {
      ElMessage.error('没有当前项目可供导出');
      return;
    }

    saveCurrentProjectState(); // 确保状态最新

    const projectData = { ...currentProject.value };
    const projectJson = JSON.stringify(projectData, null, 2);
    await saveFile({
      data: new TextEncoder().encode(projectJson),
      fileName: `${currentProject.value.name || 'Untitled Project'}.json`,
      mimeType: 'application/json',
    });
    ElMessage.success(`项目 "${currentProject.value.name}" 已导出`);
  }

  async function exportWorkspace() {
    saveCurrentProjectState(); // 保存当前项目以包含最新更改

    const workspace = {
      projects: projects.value,
      currentProjectId: currentProjectId.value,
      version: 1,
      exportedAt: nowIso(),
    };

    const workspaceJson = JSON.stringify(workspace, null, 2);
    await saveFile({
      data: new TextEncoder().encode(workspaceJson),
      fileName: `ejs-workspace-backup-${nowIso().slice(0, 10)}.json`,
      mimeType: 'application/json',
    });
    ElMessage.success('EJS 工作区已导出');
  }

  function importProjectsFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          const data = JSON.parse(json);

          if (data.projects && Array.isArray(data.projects)) {
            // Workspace import
            if (typeof data.currentProjectId !== 'string' && data.projects.length > 0) {
              ElMessage.warning('工作区文件缺少当前项目ID，将加载第一个项目');
            }
            projects.value = data.projects;
            const newCurrentId = data.currentProjectId || (data.projects.length > 0 ? data.projects[0].id : '');
            if (newCurrentId) {
              switchProject(newCurrentId);
            }
            ElMessage.success(`工作区导入成功，包含 ${data.projects.length} 个项目`);
          } else {
            // Single project import
            if (!data.id || !data.name) {
              throw new Error('无效的项目文件，缺少 `id` 或 `name` 字段');
            }
            importAsNewProject(data, data.name);
            ElMessage.success(`项目 "${data.name}" 已成功导入`);
          }
        } catch (error) {
          ElMessage.error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return {
    currentProject,
    createProject,
    switchProject,
    saveCurrentProjectState,
    loadProjectState,
    renameProject,
    deleteProject,
    importAsNewProject,
    exportConfig,
    importConfig,
    initializeStore,
    exportCurrentProject,
    exportWorkspace,
    importProjectsFromFile,
  };
}
