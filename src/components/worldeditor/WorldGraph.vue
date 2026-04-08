<template>
  <div class="world-graph">
    <div class="graph-canvas">
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :fit-view-on-init="true"
        :delete-key-code="['Backspace', 'Delete']"
        :connection-mode="ConnectionMode.Strict"
        :min-zoom="0.2"
        :max-zoom="2"
        :edge-types="edgeTypes"
        @node-drag-stop="handleNodeDragStop"
        @connect="handleConnect"
        @edges-change="handleEdgesChange"
        @node-click="handleNodeClick"
      >
        <Background
          :gap="18"
          :size="1"
          color="#c9ced6"
        />
        <Controls position="bottom-right" />
        <template #node-landmark="{ data }">
          <LandmarkNode :data="data" />
        </template>
      </VueFlow>
      <div class="graph-canvas-hint flex flex-col items-start gap-2">
        <span class="graph-hint-title">WorldGraph · 图例</span>
        <span class="graph-hint-item">
          <span class="graph-hint-pill is-forces">
            <Icon icon="ph:users-three" />
          </span>
          势力数量
        </span>
        <span class="graph-hint-item">
          <span class="graph-hint-pill is-children">
            <Icon icon="ph:tree-structure" />
          </span>
          子地标数量
        </span>
        <span class="graph-hint-item">
          <span class="graph-hint-line"></span>
          道路连接
        </span>
        <span class="graph-hint-item">
          <span class="graph-hint-shield">
            <Icon icon="ph:shield-fill" />
            <span class="graph-hint-shield-text">3</span>
          </span>
          区域颜色 + 重要性
        </span>
      </div>
    </div>

    <WorldGraphInspector
      v-if="selectedLandmark"
      :selected-landmark="selectedLandmark"
      :selected-forces="selectedForces"
      :project-regions="projectRegions"
      :inspector-style="inspectorStyle"
      :start-drag="startDrag"
      @close="clearSelection"
      @edit="emitEditSelected"
    />

    <div
      v-if="childGraphVisible"
      class="child-graph-popup"
      :style="childGraphStyle"
    >
      <div
        class="child-graph-header"
        @mousedown="startChildGraphDrag"
        style="margin-top: 16px"
      >
        <div class="child-graph-title">{{ childGraphTitle }}</div>
        <button
          @click="closeChildGraph"
          class="close-button"
        >
          <Icon icon="ph:x" />
        </button>
      </div>
      <div class="child-graph-body">
        <div
          class="child-graph-canvas"
          :style="{ height: `${childGraphSize.height - 84}px` }"
        >
          <VueFlow
            :nodes="childGraphNodesWithBridges"
            :edges="childGraphEdgesWithBridges"
            :fit-view-on-init="true"
            :delete-key-code="['Backspace', 'Delete']"
            :connection-mode="ConnectionMode.Strict"
            :min-zoom="0.2"
            :max-zoom="2"
            :edge-types="childEdgeTypes"
            @node-drag-stop="handleChildNodeDragStopProxy"
            @connect="handleChildConnectProxy"
            @edges-change="handleChildEdgesChangeProxy"
            @node-click="handleChildNodeClick"
          >
            <Background
              :gap="18"
              :size="1"
              color="#c9ced6"
            />
            <Controls position="bottom-right" />
            <template #node-landmark="{ data }">
              <LandmarkNode :data="data" />
            </template>
            <template #node-bridge="{ data }">
              <BridgeNode :data="data" />
            </template>
          </VueFlow>
        </div>
      </div>
      <WorldGraphInspector
        v-if="childSelectedLandmark"
        :selected-landmark="childSelectedLandmark"
        :selected-forces="childSelectedForces"
        :project-regions="projectRegions"
        :inspector-style="childInspectorStyle"
        :start-drag="startChildInspectorDrag"
        @close="clearChildSelection"
        @edit="emitEditSelected"
      />
      <button
        class="child-graph-resizer"
        @mousedown.stop.prevent="startChildGraphResize"
        aria-label="调整窗口大小"
      ></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWorldGraphView } from '@/composables/worldeditor/graph/useWorldGraphView';
import type { EnhancedForce, EnhancedLandmark, EnhancedRegion, Project } from '@/types/worldeditor/world-editor';
import { Icon } from '@iconify/vue';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/controls/dist/style.css';
import { ConnectionMode, VueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import BridgeNode from './graph/BridgeNode.vue';
import LandmarkNode from './graph/LandmarkNode.vue';
import WorldGraphInspector from './graph/WorldGraphInspector.vue';

interface Props {
  projects: Project[];
  landmarks: EnhancedLandmark[];
  forces: EnhancedForce[];
  regions: EnhancedRegion[];
  activeProjectId?: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'edit-item', item: EnhancedLandmark): void;
}>();

const {
  nodes,
  edges,
  edgeTypes,
  projectRegions,
  selectedLandmark,
  selectedForces,
  inspectorStyle,
  startDrag,
  handleNodeDragStop,
  handleConnect,
  handleEdgesChange,
  handleNodeClick,
  clearSelection,
  childGraphVisible,
  childGraphTitle,
  childGraphStyle,
  childGraphSize,
  childGraphNodesWithBridges,
  childGraphEdgesWithBridges,
  childEdgeTypes,
  childSelectedLandmark,
  childSelectedForces,
  childInspectorStyle,
  startChildInspectorDrag,
  startChildGraphDrag,
  startChildGraphResize,
  handleChildNodeDragStopProxy,
  handleChildConnectProxy,
  handleChildEdgesChangeProxy,
  handleChildNodeClick,
  clearChildSelection,
  closeChildGraph,
  emitEditSelected,
} = useWorldGraphView(props, {
  onEdit: (item) => emit('edit-item', item),
});
</script>

<style scoped>
.world-graph {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  height: 100%;
  position: relative;
}

.graph-canvas {
  position: relative;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: linear-gradient(135deg, #f6f2ea 0%, #edf1f7 100%);
  overflow: hidden;
}

.graph-canvas-hint {
  position: absolute;
  left: 12px;
  bottom: 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  pointer-events: none;
}

.graph-hint-title {
  font-weight: 600;
}

.graph-hint-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.graph-hint-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid #dfe3ea;
  background: #ffffff;
  font-size: 12px;
}

.graph-hint-pill.is-forces {
  color: #2563eb;
}

.graph-hint-pill.is-children {
  color: #16a34a;
}

.graph-hint-line {
  display: inline-block;
  width: 24px;
  height: 2px;
  background: #64748b;
  border-radius: 999px;
}

.graph-hint-shield {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: #3b82f6;
  font-size: 16px;
}

.graph-hint-shield-text {
  position: absolute;
  font-size: 9px;
  font-weight: 700;
  color: #0f172a;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.9);
}

.child-graph-canvas {
  height: 320px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: linear-gradient(135deg, #f6f2ea 0%, #edf1f7 100%);
  overflow: hidden;
}

.child-graph-canvas :deep(.vue-flow__node-bridge) {
  z-index: 2;
}

.child-graph-popup {
  width: 460px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  position: relative;
}

.child-graph-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
}

.child-graph-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.child-graph-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.child-graph-resizer {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 16px;
  height: 16px;
  border: none;
  background: linear-gradient(
    135deg,
    transparent 45%,
    var(--el-border-color) 45%,
    var(--el-border-color) 55%,
    transparent 55%
  );
  cursor: se-resize;
  padding: 0;
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.vue-flow__edge-labels) {
  pointer-events: all;
}

:deep(.edge-label) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

:deep(.edge-remove-button:hover) {
  color: var(--el-color-danger);
  border-color: var(--el-color-danger);
}

@media (max-width: 900px) {
  .world-graph {
    grid-template-columns: 1fr;
  }

  .graph-inspector {
    order: -1;
  }
}

/* 移动端适配：弹窗约束在视口内 */
@media screen and (max-width: 768px) {
  .child-graph-popup {
    position: fixed !important;
    left: 8px !important;
    top: auto !important;
    bottom: 60px !important;
    right: 8px !important;
    width: auto !important;
    max-height: 60vh;
    z-index: 100 !important;
    overflow: hidden;
  }

  .child-graph-popup > .child-graph-body > .child-graph-canvas {
    height: calc(60vh - 100px) !important;
  }

  .child-graph-popup > .child-graph-resizer {
    display: none;
  }

  .graph-canvas-hint {
    display: none;
  }
}
</style>
