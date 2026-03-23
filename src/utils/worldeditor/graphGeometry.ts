import type { EnhancedLandmark } from '@/types/world-editor';

type HandleSide = 'left' | 'right' | 'top' | 'bottom';

const BRIDGE_NODE_WIDTH = 120;
const BRIDGE_NODE_HEIGHT = 24;

const DEFAULT_GRAPH_COLUMNS = 4;
const DEFAULT_GRAPH_SPACING_X = 220;
const DEFAULT_GRAPH_SPACING_Y = 160;
const DEFAULT_GRAPH_BOUNDS = {
  minX: 0,
  maxX: 400,
  minY: 0,
  maxY: 260,
};
const DEFAULT_BRIDGE_MARGIN = 80;
const DEFAULT_BRIDGE_SPACING = 70;

const isLargeLandmark = (landmark: EnhancedLandmark) => {
  const type = landmark.type || '';
  return type === 'natural' || type === 'chasm' || type === 'canyon';
};

const getLandmarkNodeSize = (landmark: EnhancedLandmark) => {
  if (isLargeLandmark(landmark)) {
    return { width: 240, height: 46 };
  }

  return { width: 180, height: 38 };
};

export const createDefaultGraphPosition = (index: number) => ({
  x: (index % DEFAULT_GRAPH_COLUMNS) * DEFAULT_GRAPH_SPACING_X,
  y: Math.floor(index / DEFAULT_GRAPH_COLUMNS) * DEFAULT_GRAPH_SPACING_Y,
});

export const getLandmarkNodeCenter = (landmark: EnhancedLandmark): { x: number; y: number } | null => {
  if (!landmark.position) return null;
  const { width, height } = getLandmarkNodeSize(landmark);
  return { x: landmark.position.x + width / 2, y: landmark.position.y + height / 2 };
};

export const getFacingEdgeMidpoint = (
  landmark: EnhancedLandmark,
  targetCenter: { x: number; y: number }
): { x: number; y: number } | null => {
  const center = getLandmarkNodeCenter(landmark);
  if (!center) return null;
  const { width, height } = getLandmarkNodeSize(landmark);
  const dx = targetCenter.x - center.x;
  const dy = targetCenter.y - center.y;
  const side: HandleSide = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'bottom' : 'top';

  if (side === 'left') return { x: center.x - width / 2, y: center.y };
  if (side === 'right') return { x: center.x + width / 2, y: center.y };
  if (side === 'top') return { x: center.x, y: center.y - height / 2 };
  return { x: center.x, y: center.y + height / 2 };
};

export const getLandmarkSideMidpoint = (
  landmark: EnhancedLandmark,
  side: HandleSide
): { x: number; y: number } | null => {
  const center = getLandmarkNodeCenter(landmark);
  if (!center) return null;
  const { width, height } = getLandmarkNodeSize(landmark);
  if (side === 'left') return { x: center.x - width / 2, y: center.y };
  if (side === 'right') return { x: center.x + width / 2, y: center.y };
  if (side === 'top') return { x: center.x, y: center.y - height / 2 };
  return { x: center.x, y: center.y + height / 2 };
};

export const parseHandleSide = (handle?: string): HandleSide | undefined => {
  if (!handle) return undefined;
  if (handle === 'sr' || handle === 'tr' || handle.endsWith('right')) return 'right';
  if (handle === 'sl' || handle === 'tl' || handle.endsWith('left')) return 'left';
  if (handle === 'st' || handle === 'tt' || handle.endsWith('top')) return 'top';
  if (handle === 'sb' || handle === 'tb' || handle.endsWith('bottom')) return 'bottom';
  return undefined;
};

export const positionToSide = (
  parent?: { x: number; y: number },
  external?: { x: number; y: number }
): HandleSide | null => {
  if (!parent || !external) return null;
  const dx = external.x - parent.x;
  const dy = external.y - parent.y;
  if (dx === 0 && dy === 0) return null;
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const normalized = (angle + 360) % 360;
  if (normalized >= 315 || normalized < 45) return 'top';
  if (normalized >= 45 && normalized < 135) return 'right';
  if (normalized >= 135 && normalized < 225) return 'bottom';
  return 'left';
};

export const invertHandleSide = (side: HandleSide): HandleSide => {
  switch (side) {
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
  }
};

export const getBridgeHandlePoint = (
  position: { x: number; y: number },
  side: HandleSide
): { x: number; y: number } => {
  if (side === 'left') return { x: position.x, y: position.y + BRIDGE_NODE_HEIGHT / 2 };
  if (side === 'right') return { x: position.x + BRIDGE_NODE_WIDTH, y: position.y + BRIDGE_NODE_HEIGHT / 2 };
  if (side === 'top') return { x: position.x + BRIDGE_NODE_WIDTH / 2, y: position.y };
  return { x: position.x + BRIDGE_NODE_WIDTH / 2, y: position.y + BRIDGE_NODE_HEIGHT };
};

export const getGraphBounds = (landmarks: EnhancedLandmark[]) => {
  if (landmarks.length === 0) {
    return { ...DEFAULT_GRAPH_BOUNDS };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  landmarks.forEach((landmark, index) => {
    const position = landmark.position ?? createDefaultGraphPosition(index);
    minX = Math.min(minX, position.x);
    maxX = Math.max(maxX, position.x);
    minY = Math.min(minY, position.y);
    maxY = Math.max(maxY, position.y);
  });

  return { minX, maxX, minY, maxY };
};

export const getDefaultBridgePositionForSide = (
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  side: HandleSide,
  order: number
) => {
  if (side === 'left') {
    return { x: bounds.minX - DEFAULT_BRIDGE_MARGIN, y: bounds.minY + order * DEFAULT_BRIDGE_SPACING };
  }
  if (side === 'right') {
    return { x: bounds.maxX + DEFAULT_BRIDGE_MARGIN, y: bounds.minY + order * DEFAULT_BRIDGE_SPACING };
  }
  if (side === 'top') {
    return { x: bounds.minX + order * DEFAULT_BRIDGE_SPACING, y: bounds.minY - DEFAULT_BRIDGE_MARGIN };
  }
  return { x: bounds.minX + order * DEFAULT_BRIDGE_SPACING, y: bounds.maxY + DEFAULT_BRIDGE_MARGIN };
};
