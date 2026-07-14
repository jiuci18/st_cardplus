//! Builds the local and remote resource trees displayed on the welcome page.

import { computed, ref, type ComputedRef, type Ref } from "vue";
import { characterCardService } from "@/database/appdb/characterCardService";
import { presetService } from "@/database/appdb/presetService";
import { worldBookService } from "@/database/appdb/worldBookService";
import { worldEditorService } from "@/database/appdb/worldEditorService";
import type { BarkeepStatus } from "@/types/barkeep";

export interface LocalWelcomeStats {
  characters: number;
  worlds: number;
  presets: number;
  landmarks: number;
}

export interface ResourceTreeNode {
  id: string;
  label: string;
  icon: string;
  route?: string;
  nodeType: "group" | "resource";
  count: number;
  children?: ResourceTreeNode[];
}

export interface TreeNodeContext {
  node?: {
    expanded?: boolean;
    collapse?: () => void;
    expand?: () => void;
  };
}

const resourceTreeProps = { children: "children", label: "label" };
const localResourceExpandedKeys = ["characters", "worlds", "presets"];
const remoteResourceExpandedKeys = [
  "remote-characters",
  "remote-worlds",
  "remote-presets",
];

function createLocalTree(
  characters: Awaited<ReturnType<typeof characterCardService.getFullCharacterCardCollection>>,
  worlds: Awaited<ReturnType<typeof worldBookService.getFullWorldBookCollection>>,
  presets: Awaited<ReturnType<typeof presetService.getAllPresets>>,
): ResourceTreeNode[] {
  const characterCards = Object.values(characters.cards);
  const worldBooks = Object.values(worlds.books);

  return [
    {
      id: "characters",
      label: "角色",
      icon: "material-symbols:person-outline",
      route: "/cardmanager",
      nodeType: "group",
      count: characterCards.length,
      children: characterCards.map((card) => ({
        id: `character:${card.id}`,
        label: card.name || card.data?.name || "未命名角色",
        icon: "material-symbols:person-outline",
        route: "/cardmanager",
        nodeType: "resource",
        count: 0,
      })),
    },
    {
      id: "worlds",
      label: "世界书",
      icon: "material-symbols:book-outline",
      route: "/worldbook",
      nodeType: "group",
      count: worldBooks.length,
      children: worldBooks.map((book) => ({
        id: `world:${book.id}`,
        label: book.name || "未命名世界书",
        icon: "material-symbols:article-outline",
        route: "/worldbook",
        nodeType: "resource",
        count: 0,
      })),
    },
    {
      id: "presets",
      label: "预设",
      icon: "material-symbols:settings-input-component-outline",
      route: "/presetmanager",
      nodeType: "group",
      count: presets.length,
      children: presets.map((preset) => ({
        id: `preset:${preset.id}`,
        label: preset.name || "未命名预设",
        icon: "material-symbols:tune",
        route: "/presetmanager",
        nodeType: "resource",
        count: 0,
      })),
    },
  ];
}

function toggleNode(context?: TreeNodeContext): void {
  const node = context?.node;
  if (node?.expanded) {
    node.collapse?.();
  } else {
    node?.expand?.();
  }
}

/** Owns welcome-page resource counts, trees, and resource-tree interactions. */
export function useWelcomeResources(
  status: Ref<BarkeepStatus | null>,
  navigate: (route: string) => void,
): {
  localStats: Ref<LocalWelcomeStats>;
  localResourceTree: Ref<ResourceTreeNode[]>;
  remoteResourceTree: ComputedRef<ResourceTreeNode[]>;
  resourceTreeProps: typeof resourceTreeProps;
  localResourceExpandedKeys: string[];
  remoteResourceExpandedKeys: string[];
  loadLocalStats: () => Promise<void>;
  handleLocalResourceNodeClick: (
    data: ResourceTreeNode,
    context?: TreeNodeContext,
  ) => void;
  handleRemoteResourceNodeClick: (
    data: ResourceTreeNode,
    context?: TreeNodeContext,
  ) => void;
} {
  const localStats = ref<LocalWelcomeStats>({
    characters: 0,
    worlds: 0,
    presets: 0,
    landmarks: 0,
  });
  const localResourceTree = ref<ResourceTreeNode[]>([
    { id: "characters", label: "角色", icon: "material-symbols:person-outline", route: "/cardmanager", nodeType: "group", count: 0, children: [] },
    { id: "worlds", label: "世界书", icon: "material-symbols:book-outline", route: "/worldbook", nodeType: "group", count: 0, children: [] },
    { id: "presets", label: "预设", icon: "material-symbols:settings-input-component-outline", route: "/presetmanager", nodeType: "group", count: 0, children: [] },
  ]);

  const remoteResourceTree = computed<ResourceTreeNode[]>(() => [
    { id: "remote-characters", label: "角色", icon: "material-symbols:person-outline", nodeType: "group", count: status.value?.counts.characters ?? 0, children: [] },
    { id: "remote-worlds", label: "世界书", icon: "material-symbols:book-outline", nodeType: "group", count: status.value?.counts.worlds ?? 0, children: [] },
    { id: "remote-presets", label: "预设", icon: "material-symbols:settings-input-component-outline", nodeType: "group", count: status.value?.counts.presets ?? 0, children: [] },
  ]);

  const loadLocalStats = async (): Promise<void> => {
    try {
      const [characters, worlds, presets, worldEditorStats] = await Promise.all([
        characterCardService.getFullCharacterCardCollection(),
        worldBookService.getFullWorldBookCollection(),
        presetService.getAllPresets(),
        worldEditorService.getStats(),
      ]);
      const characterCount = Object.keys(characters.cards).length;
      const worldCount = Object.keys(worlds.books).length;

      localStats.value = {
        characters: characterCount,
        worlds: worldCount,
        presets: presets.length,
        landmarks: worldEditorStats.landmarkCount,
      };
      localResourceTree.value = createLocalTree(characters, worlds, presets);
    } catch (error) {
      console.error("Failed to load local welcome stats", error);
    }
  };

  return {
    localStats,
    localResourceTree,
    remoteResourceTree,
    resourceTreeProps,
    localResourceExpandedKeys,
    remoteResourceExpandedKeys,
    loadLocalStats,
    handleLocalResourceNodeClick: (data, context) => {
      if (data.nodeType === "group") {
        toggleNode(context);
      } else if (data.route) {
        navigate(data.route);
      }
    },
    handleRemoteResourceNodeClick: (_data, context) => toggleNode(context),
  };
}

