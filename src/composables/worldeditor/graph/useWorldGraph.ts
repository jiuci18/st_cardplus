import { computed, ref, watch, h, onBeforeUnmount, type CSSProperties, type ComputedRef, type Ref } from 'vue';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type Node,
  type EdgeProps,
  type Connection,
  type EdgeChange,
} from '@vue-flow/core';
import type { Project, EnhancedLandmark, EnhancedForce, EnhancedRegion, RoadConnection } from '@/types/world-editor';
import type { LandmarkNodeData, LandmarkNodeForce } from '@/types/worldeditor/worldGraphNodes';
import {
  linkLandmarks,
  recalculateRoadConnectionLengths,
  unlinkLandmarks,
} from '@/composables/worldeditor/graph/worldGraphLinks';
import { createDefaultGraphPosition } from '@/utils/worldeditor/graphGeometry';

export interface WorldGraphProps {
  projects: Project[];
  landmarks: EnhancedLandmark[];
  forces: EnhancedForce[];
  regions: EnhancedRegion[];
  activeProjectId?: string | null;
}

export interface WorldGraphOptions {
  landmarkScope?: ComputedRef<EnhancedLandmark[]>;
}

interface WorldGraphState {
  nodes: Ref<Node[]>;
  edges: Ref<Edge[]>;
  edgeTypes: { removable: (edgeProps: EdgeProps) => ReturnType<typeof h> };
  projectRegions: ComputedRef<EnhancedRegion[]>;
  selectedLandmark: ComputedRef<EnhancedLandmark | null>;
  selectedForces: ComputedRef<LandmarkNodeForce[]>;
  inspectorStyle: ComputedRef<CSSProperties>;
  startDrag: (event: MouseEvent) => void;
  handleNodeDragStop: (event: unknown, node?: Node) => void;
  handleConnect: (params: Connection) => void;
  handleEdgesChange: (changes: EdgeChange[]) => void;
  handleNodeClick: (event: unknown, node?: Node) => void;
  clearSelection: () => void;
}

interface RemovableEdgeData {
  onRemove?: (edgeId: string) => void;
  roadLength?: number;
}

export const useWorldGraph = (props: WorldGraphProps, options?: WorldGraphOptions): WorldGraphState => {
  const selectedLandmarkId = ref<string | null>(null);

  const RemovableEdge = (edgeProps: EdgeProps): ReturnType<typeof h> => {
    const [edgePath, labelX, labelY] = getBezierPath(edgeProps);
    const edgeData = (edgeProps.data || {}) as RemovableEdgeData;
    const roadLength =
      typeof edgeData.roadLength === 'number' && Number.isFinite(edgeData.roadLength) ? edgeData.roadLength : null;
    const onRemove = (event: MouseEvent) => {
      event.stopPropagation();
      const remove = edgeData.onRemove;
      remove?.(edgeProps.id);
    };

    return h('g', { class: 'removable-edge' }, [
      h(BaseEdge, { path: edgePath, markerEnd: edgeProps.markerEnd }),
      h(EdgeLabelRenderer, null, {
        default: () =>
          h(
            'div',
            {
              class: 'edge-label',
              style: {
                position: 'absolute',
                top: '0',
                left: '0',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              },
            },
            [
              roadLength !== null
                ? h(
                    'span',
                    {
                      class: 'edge-length-label',
                      style: {
                        fontSize: '11px',
                        color: '#334155',
                        background: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '999px',
                        padding: '1px 6px',
                      },
                    },
                    `${roadLength}`
                  )
                : null,
              h(
                'button',
                {
                  class: 'edge-remove-button',
                  type: 'button',
                  onClick: onRemove,
                  style: {
                    borderRadius: '999px',
                    color: '#000',
                    cursor: 'pointer',
                    fontSize: '11px',
                    lineHeight: '1',
                  },
                },
                'X'
              ),
            ]
          ),
      }),
    ]);
  };

  const edgeTypes: WorldGraphState['edgeTypes'] = { removable: RemovableEdge };

  const activeProjectId = computed(() => {
    if (props.activeProjectId) return props.activeProjectId;
    return props.projects[0]?.id || null;
  });
  const projectLandmarksAll = computed(() => {
    if (!activeProjectId.value) return [];
    return props.landmarks.filter((l) => l.projectId === activeProjectId.value);
  });
  const projectLandmarks = computed(() => {
    if (options?.landmarkScope) return options.landmarkScope.value;
    return projectLandmarksAll.value;
  });
  const projectForces = computed(() => {
    if (!activeProjectId.value) return [];
    return props.forces.filter((f) => f.projectId === activeProjectId.value);
  });
  const projectRegions = computed(() => {
    if (!activeProjectId.value) return [];
    return props.regions.filter((r) => r.projectId === activeProjectId.value);
  });
  const regionInfoMap = computed(
    () => new Map(projectRegions.value.map((region) => [region.id, { name: region.name, color: region.color }]))
  );
  const projectLandmarkMap = computed(() => new Map(projectLandmarks.value.map((landmark) => [landmark.id, landmark])));
  const projectLandmarkMapAll = computed(
    () => new Map(projectLandmarksAll.value.map((landmark) => [landmark.id, landmark]))
  );
  const projectLandmarkIdSet = computed(() => new Set(projectLandmarks.value.map((landmark) => landmark.id)));
  const selectedLandmark = computed(() => {
    if (!selectedLandmarkId.value) return null;
    return projectLandmarkMapAll.value.get(selectedLandmarkId.value) || null;
  });

  const forceRoleAtLandmark = (force: EnhancedForce, landmark: EnhancedLandmark) => {
    if (force.headquarters === landmark.id) {
      return '总部';
    }
    if (force.branchLocations?.some((branch) => branch.locationId === landmark.id)) {
      return '分部';
    }
    return null;
  };

  const getForcesAtLandmark = (landmark: EnhancedLandmark): LandmarkNodeForce[] =>
    projectForces.value
      .map((force) => ({ force, role: forceRoleAtLandmark(force, landmark) }))
      .filter((item) => item.role !== null)
      .map((item) => ({
        id: item.force.id,
        name: item.force.name,
        role: item.role ?? undefined,
      }));

  const selectedForces = computed(() => {
    if (!selectedLandmark.value) return [];
    return getForcesAtLandmark(selectedLandmark.value);
  });

  const ensureLandmarkPositions = (landmarks: EnhancedLandmark[]) => {
    landmarks.forEach((landmark, index) => {
      if (!landmark.position) {
        landmark.position = createDefaultGraphPosition(index);
      }
    });
  };

  const nodes = computed<Node[]>(() =>
    projectLandmarks.value.map((landmark, index) => {
      const position = landmark.position ?? createDefaultGraphPosition(index);
      const forcesAt = getForcesAtLandmark(landmark);
      const regionInfo = landmark.regionId ? regionInfoMap.value.get(landmark.regionId) : null;
      const data: LandmarkNodeData = {
        id: landmark.id,
        name: landmark.name,
        region: regionInfo?.name ?? '',
        regionColor: regionInfo?.color ?? '',
        importance: landmark.importance,
        population: landmark.population,
        forces: forcesAt,
        childCount: landmark.childLandmarkIds?.length ?? 0,
        type: landmark.type,
      };

      return {
        id: landmark.id,
        type: 'landmark',
        position: {
          x: position.x,
          y: position.y,
        },
        data,
      };
    })
  );

  const getRoadConnection = (landmark: EnhancedLandmark, targetId: string): RoadConnection | null => {
    if (!landmark.roadConnections) return null;
    return landmark.roadConnections.find((conn) => conn.targetId === targetId) || null;
  };

  const edges = computed<Edge[]>(() => {
    const existing = new Set<string>();
    const edgeList: Edge[] = [];
    const landmarkMap = projectLandmarkMap.value;

    const addEdge = (a: string, b: string) => {
      if (a === b) return;
      const ids = [a, b].sort();
      const key = `${ids[0]}--${ids[1]}`;
      if (existing.has(key)) return;
      existing.add(key);

      const source = ids[0];
      const target = ids[1];
      const sourceLandmark = landmarkMap.get(source);
      const targetLandmark = landmarkMap.get(target);
      const connection = sourceLandmark ? getRoadConnection(sourceLandmark, target) : null;
      const fallbackConnection = targetLandmark ? getRoadConnection(targetLandmark, source) : null;
      const sourceHandle = connection?.handle ?? fallbackConnection?.targetHandle;
      const targetHandle = connection?.targetHandle ?? fallbackConnection?.handle;
      const roadLength = connection?.length ?? fallbackConnection?.length;

      edgeList.push({
        id: `edge-${key}`,
        source,
        target,
        sourceHandle,
        targetHandle,
        type: 'removable',
        data: {
          onRemove: removeEdgeById,
          roadLength,
        },
      });
    };

    projectLandmarks.value.forEach((landmark) => {
      (landmark.relatedLandmarks || []).forEach((relatedId) => {
        if (landmarkMap.has(relatedId)) {
          addEdge(landmark.id, relatedId);
        }
      });
    });

    return edgeList;
  });

  const edgeEndpointMap = computed(
    () => new Map(edges.value.map((edge) => [edge.id, { source: edge.source, target: edge.target }]))
  );

  function removeEdgeById(edgeId: string) {
    const endpoints = edgeEndpointMap.value.get(edgeId) || null;
    if (!endpoints) return;
    unlinkLandmarks(projectLandmarks.value, endpoints.source, endpoints.target);
  }

  const roadLengthDependencyKey = computed(() =>
    projectLandmarksAll.value
      .map((landmark) => {
        const position = landmark.position ? `${landmark.position.x},${landmark.position.y}` : '';
        const connections = (landmark.roadConnections || [])
          .map((conn) => `${conn.targetId}:${conn.handle || ''}:${conn.targetHandle || ''}`)
          .join('|');
        return `${landmark.id}@${position}@${connections}`;
      })
      .join('||')
  );

  watch(
    projectLandmarks,
    (landmarks) => {
      ensureLandmarkPositions(landmarks);
    },
    { immediate: true }
  );

  watch(
    roadLengthDependencyKey,
    () => {
      recalculateRoadConnectionLengths(projectLandmarksAll.value);
    },
    { immediate: true }
  );

  watch(activeProjectId, () => {
    selectedLandmarkId.value = null;
  });

  const recalcRelativePositions = () => {
    const list = projectLandmarks.value.filter((item) => item.position);
    const adjacency = new Map<string, Set<string>>();
    list.forEach((landmark) => adjacency.set(landmark.id, new Set<string>()));

    const connectPair = (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      if (!projectLandmarkIdSet.value.has(sourceId) || !projectLandmarkIdSet.value.has(targetId)) return;
      adjacency.get(sourceId)?.add(targetId);
      adjacency.get(targetId)?.add(sourceId);
    };

    list.forEach((landmark) => {
      (landmark.relatedLandmarks || []).forEach((targetId) => connectPair(landmark.id, targetId));
      (landmark.roadConnections || []).forEach((conn) => connectPair(landmark.id, conn.targetId));
    });

    list.forEach((landmark) => {
      const connectedCandidates = Array.from(adjacency.get(landmark.id) || [])
        .map((id) => projectLandmarkMap.value.get(id))
        .filter((item): item is EnhancedLandmark => Boolean(item?.position));
      const position = landmark.position;
      if (!position) return;
      const closest = {
        north: { id: undefined as string | undefined, dist: Number.POSITIVE_INFINITY },
        south: { id: undefined as string | undefined, dist: Number.POSITIVE_INFINITY },
        east: { id: undefined as string | undefined, dist: Number.POSITIVE_INFINITY },
        west: { id: undefined as string | undefined, dist: Number.POSITIVE_INFINITY },
      };

      connectedCandidates.forEach((other) => {
        if (other.id === landmark.id || !other.position) return;
        const dx = other.position.x - position.x;
        const dy = other.position.y - position.y;
        const dist = dx * dx + dy * dy;

        if (dy < 0 && Math.abs(dy) >= Math.abs(dx) && dist < closest.north.dist) {
          closest.north = { id: other.id, dist };
        } else if (dy > 0 && Math.abs(dy) >= Math.abs(dx) && dist < closest.south.dist) {
          closest.south = { id: other.id, dist };
        } else if (dx > 0 && Math.abs(dx) >= Math.abs(dy) && dist < closest.east.dist) {
          closest.east = { id: other.id, dist };
        } else if (dx < 0 && Math.abs(dx) >= Math.abs(dy) && dist < closest.west.dist) {
          closest.west = { id: other.id, dist };
        }
      });

      if (!landmark.relativePosition) {
        landmark.relativePosition = {};
      }
      const singleSelection = (id?: string) => (id ? [id] : []);
      landmark.relativePosition.north = singleSelection(closest.north.id);
      landmark.relativePosition.south = singleSelection(closest.south.id);
      landmark.relativePosition.east = singleSelection(closest.east.id);
      landmark.relativePosition.west = singleSelection(closest.west.id);
    });
  };

  const relativePositionDependencyKey = computed(() =>
    projectLandmarks.value
      .map((landmark) => {
        const position = landmark.position ? `${landmark.position.x},${landmark.position.y}` : '';
        const related = (landmark.relatedLandmarks || []).join(',');
        const roads = (landmark.roadConnections || []).map((conn) => conn.targetId).join(',');
        return `${landmark.id}@${position}@${related}@${roads}`;
      })
      .join('||')
  );

  watch(
    relativePositionDependencyKey,
    () => {
      recalcRelativePositions();
    },
    { immediate: true }
  );

  const handleNodeDragStop = (event: unknown, node?: Node) => {
    const resolvedNode = node ?? (event as { node?: Node })?.node;
    if (!resolvedNode?.id) return;
    const target = projectLandmarks.value.find((item) => item.id === resolvedNode.id);
    if (target) {
      target.position = { x: resolvedNode.position.x, y: resolvedNode.position.y };
    }
  };

  const handleConnect = (params: Connection) => {
    const source = params.source;
    const target = params.target;
    if (!source || !target || source === target) return;

    const sourceHandle = params.sourceHandle ?? undefined;
    const targetHandle = params.targetHandle ?? undefined;

    linkLandmarks(projectLandmarks.value, source, target, sourceHandle, targetHandle);
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    const removed = changes.filter((change) => change.type === 'remove');
    if (removed.length === 0) return;

    removed.forEach((change) => {
      if (!('id' in change)) return;
      const endpoints = edgeEndpointMap.value.get(change.id);
      if (!endpoints) return;
      unlinkLandmarks(projectLandmarks.value, endpoints.source, endpoints.target);
    });
  };

  const inspectorPosition = ref({ x: 50, y: 50 });
  const isDragging = ref(false);
  const dragStart = ref({ x: 0, y: 0 });

  const inspectorStyle = computed(
    (): CSSProperties => ({
      position: 'absolute',
      left: `${inspectorPosition.value.x}px`,
      top: `${inspectorPosition.value.y}px`,
      zIndex: 10,
    })
  );

  const startDrag = (event: MouseEvent) => {
    isDragging.value = true;
    dragStart.value = {
      x: event.clientX - inspectorPosition.value.x,
      y: event.clientY - inspectorPosition.value.y,
    };
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value) return;
    inspectorPosition.value = {
      x: event.clientX - dragStart.value.x,
      y: event.clientY - dragStart.value.y,
    };
  };

  const stopDrag = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  };

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  });

  const handleNodeClick = (event: unknown, node?: Node) => {
    const resolvedNode = node ?? (event as { node?: Node })?.node;
    if (!resolvedNode?.id) return;
    selectedLandmarkId.value = resolvedNode.id;
  };

  const clearSelection = () => {
    selectedLandmarkId.value = null;
  };

  return {
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
  } as WorldGraphState;
};
