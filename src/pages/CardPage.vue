<template>
  <div class="card-page-container">
    <div
      class="card-page-mobile-layout"
      v-if="useNewEditor"
    >
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
          <el-empty description="请先打开角色列表选择一个角色，或创建一个新角色" />
        </div>
      </div>

      <MobileBookmarkDrawer
        v-model:visible="mobileDrawerVisible"
        v-model:active-tab="mobilePanelTab"
        :items="mobileBookmarkItems"
        drawer-size="88%"
      >
        <template #pane-list>
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
            @rename-project="handleRenameProject"
          />
        </template>
      </MobileBookmarkDrawer>
    </div>

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
            @rename-project="handleRenameProject"
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
import { ElEmpty } from 'element-plus';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import MobileBookmarkDrawer from '@/components/ui/common/MobileBookmarkDrawer.vue';
import CharacterListSidebar from '../components/charcard/CharacterListSidebar.vue';
import { useCharacterCollection } from '../composables/characterInfo/useCharacterCollection';
import { useDevice } from '../composables/useDevice';
import type { CharacterCard } from '../types/character';

const { isMobile } = useDevice();
const useNewEditor = ref(true);
const editorComponent = shallowRef<Component | null>(null);
const mobileDrawerVisible = ref(false);
const mobilePanelTab = ref('list');
const mobileBookmarkItems = [
  { key: 'list', label: '列表', drawerLabel: '角色列表', title: '角色列表', icon: 'ph:users-three-duotone' },
];

const {
  characterCollection,
  projects,
  activeCharacterId,
  activeCharacter,
  handleSelectCharacter,
  handleCreateProject,
  handleRenameProject,
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
    mobileDrawerVisible.value = false;
  }
};

watch(activeCharacterId, (newId) => {
  if (isMobile.value && !newId) {
    mobilePanelTab.value = 'list';
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
  position: relative;
}

.editor-area {
  flex-grow: 1;
  overflow-y: hidden;
  height: 100%;
}

.card-page-desktop-layout {
  display: none;
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
