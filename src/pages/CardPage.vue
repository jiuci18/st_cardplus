<template>
  <div class="card-page-container">
    <!-- Mobile Layout -->
    <div
      class="card-page-mobile-layout"
      v-if="useNewEditor"
    >
      <el-tabs
        v-model="activeTab"
        type="border-card"
        class="card-page-tabs-mobile"
      >
        <el-tab-pane name="list">
          <template #label>
            <span>
              <i class="el-icon-user"></i>
              角色列表
            </span>
          </template>
          <CharacterListSidebar
            :characters="characters"
            :projects="projects"
            :active-character-id="activeCharacterId"
            @select="handleSelectCharacterWithTabSwitch"
            @create-project="handleCreateProject"
            @create="handleCreateCharacter"
            @delete="handleDeleteCharacter"
            @import="handleImportCharacter"
            @reorder="handleReorderCharacterPatches"
            @reorder-projects="handleReorderProjects"
            @toggle-star="handleToggleStar"
          />
        </el-tab-pane>
        <el-tab-pane
          name="editor"
          :disabled="!activeCharacter"
        >
          <template #label>
            <span>
              <i class="el-icon-edit"></i>
              {{ activeCharacter ? activeCharacter.data.chineseName || '编辑中' : '编辑角色' }}
            </span>
          </template>
          <div class="editor-area">
            <component
              :is="editorComponent"
              v-if="activeCharacter"
              :character="activeCharacter"
              @update:character="handleUpdateCharacter"
            />
            <div
              v-else
              class="editor-empty-state"
            >
              <el-empty description="请在左侧选择一个角色进行编辑，或创建一个新角色 " />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Desktop Layout -->
    <div
      class="card-page-desktop-layout"
      v-if="useNewEditor"
    >
      <Splitpanes
        class="default-theme"
        style="width: 100%; height: 100%"
      >
        <Pane
          size="15"
          min-size="10"
          max-size="25"
        >
          <CharacterListSidebar
            :characters="characters"
            :projects="projects"
            :active-character-id="activeCharacterId"
            @select="handleSelectCharacter"
            @create-project="handleCreateProject"
            @create="handleCreateCharacter"
            @delete="handleDeleteCharacter"
            @import="handleImportCharacter"
            @reorder="handleReorderCharacterPatches"
            @reorder-projects="handleReorderProjects"
            @toggle-star="handleToggleStar"
          />
        </Pane>
        <Pane size="85">
          <div class="editor-area">
            <component
              :is="editorComponent"
              v-if="activeCharacter"
              :character="activeCharacter"
              @update:character="handleUpdateCharacter"
            />
            <div
              v-else
              class="editor-empty-state"
            >
              <el-empty description="请在左侧选择一个角色进行编辑，或创建一个新角色 " />
            </div>
          </div>
        </Pane>
      </Splitpanes>
    </div>

    <div
      v-if="!useNewEditor"
      class="editor-area-full"
    >
      <component :is="editorComponent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted, ref, shallowRef, onMounted } from 'vue';
import type { Component } from 'vue';
import { ElEmpty, ElTabs, ElTabPane } from 'element-plus';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import CharacterListSidebar from '../components/charcard/CharacterListSidebar.vue';
import { useCharacterCollection } from '../composables/characterInfo/useCharacterCollection';
import { useDevice } from '../composables/useDevice';
import type { CharacterCard } from '../types/character';

const { isMobile } = useDevice();
const activeTab = ref('list');
const useNewEditor = ref(true);
const editorComponent = shallowRef<Component | null>(null);

const {
  characterCollection,
  projects,
  activeCharacterId,
  activeCharacter,
  handleSelectCharacter,
  handleCreateProject,
  handleCreateCharacter,
  handleDeleteCharacter,
  handleImportCharacter,
  updateCharacter,
  applyCharacterOrderPatches,
  reorderProjects,
  setCharacterStar,
} = useCharacterCollection();

const handleSelectCharacterWithTabSwitch = (characterId: string) => {
  handleSelectCharacter(characterId);
  if (isMobile.value) {
    activeTab.value = 'editor';
  }
};

watch(activeCharacterId, (newId) => {
  if (isMobile.value && !newId) {
    activeTab.value = 'list';
  }
});

const characters = computed(() => Object.values(characterCollection.value.characters));

const handleUpdateCharacter = (updatedCharacter: CharacterCard) => {
  if (!updatedCharacter) return;
  const characterId = updatedCharacter.meta?.id || activeCharacterId.value;
  if (!characterId) return;
  updateCharacter(characterId, updatedCharacter);
};

const handleReorderCharacterPatches = (patches: Array<{ id: string; order: number; projectId: string | null }>) => {
  if (!patches.length) return;
  applyCharacterOrderPatches(patches);
};

const handleReorderProjects = (orderedIds: string[]) => {
  if (!orderedIds.length) return;
  reorderProjects(orderedIds);
};

const handleToggleStar = (characterId: string, starred: boolean) => {
  setCharacterStar(characterId, starred);
};

// Store the original title
const originalTitle = document.title;

// Watch for changes in the active character and update the document title
watch(
  activeCharacter,
  (newCharacter) => {
    if (newCharacter && newCharacter.data.chineseName) {
      document.title = `角色卡 : ${newCharacter.data.chineseName}`;
    } else {
      document.title = '角色卡编辑器';
    }
  },
  { immediate: true, deep: true }
);

onMounted(async () => {
  const module = await import('../components/CharacterInfoEditor.vue');
  editorComponent.value = module.default;
});

// Restore the original title when the component is unmounted
onUnmounted(() => {
  document.title = originalTitle;
});
</script>

<style scoped>
.card-page-container {
  width: 100%;
  height: 100%;
}

.card-page-mobile-layout {
  display: block;
  height: 100%;
}

.card-page-desktop-layout {
  display: none;
}

.card-page-tabs-mobile {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__content) {
  height: 100%;
  overflow-y: auto;
}

.editor-area {
  flex-grow: 1;
  overflow-y: hidden;
  height: 100%;
}

.editor-empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.editor-area-full {
  width: 100%;
  height: 100%;
}

@media (min-width: 768px) {
  .card-page-mobile-layout {
    display: none;
  }

  .card-page-desktop-layout {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
}
</style>
