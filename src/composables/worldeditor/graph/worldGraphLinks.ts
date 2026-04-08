import type { EnhancedLandmark } from '@/types/worldeditor/world-editor';
import { getParentLandmarkId } from '@/utils/worldeditor/landmarkHierarchy';
import {
  getBridgeHandlePoint,
  getDefaultBridgePositionForSide,
  getFacingEdgeMidpoint,
  getGraphBounds,
  getLandmarkNodeCenter,
  getLandmarkSideMidpoint,
  invertHandleSide,
  parseHandleSide,
  positionToSide,
} from '@/utils/worldeditor/graphGeometry';

const ensureRelatedLandmark = (landmark: EnhancedLandmark, targetId: string) => {
  if (!landmark.relatedLandmarks) {
    landmark.relatedLandmarks = [];
  }
  if (!landmark.relatedLandmarks.includes(targetId)) {
    landmark.relatedLandmarks.push(targetId);
  }
};

const euclideanDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(b.x - a.x, b.y - a.y);

const isDescendantOf = (
  landmark: EnhancedLandmark,
  ancestorId: string,
  landmarkMap: Map<string, EnhancedLandmark>
): boolean => {
  let current = getParentLandmarkId(landmark);
  while (current) {
    if (current === ancestorId) return true;
    const parent = landmarkMap.get(current);
    if (!parent) return false;
    current = getParentLandmarkId(parent);
  }
  return false;
};

const getDefaultBridgePosition = (
  parent: EnhancedLandmark,
  externalId: string,
  landmarks: EnhancedLandmark[],
  landmarkMap: Map<string, EnhancedLandmark>
): { x: number; y: number } | null => {
  const descendants = landmarks.filter(
    (landmark) => landmark.id !== parent.id && isDescendantOf(landmark, parent.id, landmarkMap)
  );
  const sideCounts = { left: 0, right: 0, top: 0, bottom: 0 };
  const bounds = getGraphBounds(descendants);

  const externalIds = new Set<string>();
  (parent.relatedLandmarks || []).forEach((id) => externalIds.add(id));
  (parent.roadConnections || []).forEach((conn) => externalIds.add(conn.targetId));

  for (const currentExternalId of externalIds) {
    if (currentExternalId === parent.id) continue;
    const external = landmarkMap.get(currentExternalId);
    if (!external || isDescendantOf(external, parent.id, landmarkMap)) continue;
    const side = positionToSide(parent.position, external.position);
    if (!side) continue;
    const count = sideCounts[side]++;
    if (currentExternalId === externalId) {
      return getDefaultBridgePositionForSide(bounds, side, count);
    }
  }

  return null;
};

const resolveBridgeRouteLength = (
  source: EnhancedLandmark,
  target: EnhancedLandmark,
  landmarks: EnhancedLandmark[]
): number | undefined => {
  const landmarkMap = new Map(landmarks.map((item) => [item.id, item]));

  const resolveFor = (descendant: EnhancedLandmark, external: EnhancedLandmark): number | undefined => {
    let currentParentId = getParentLandmarkId(descendant);
    while (currentParentId) {
      const parent = landmarkMap.get(currentParentId);
      if (!parent) break;
      if (external.id !== parent.id && !isDescendantOf(external, parent.id, landmarkMap)) {
        const parentConn = parent.roadConnections?.find((conn) => conn.targetId === external.id);
        const externalConn = external.roadConnections?.find((conn) => conn.targetId === parent.id);
        if (parentConn || externalConn) {
          const bridgePosition =
            parent.bridgePositions?.[external.id] ??
            getDefaultBridgePosition(parent, external.id, landmarks, landmarkMap);
          const side = positionToSide(parent.position, external.position);
          if (!bridgePosition || !side) {
            currentParentId = getParentLandmarkId(parent);
            continue;
          }
          const descendantConn = descendant.roadConnections?.find((conn) => conn.targetId === external.id);
          const reverseConn = external.roadConnections?.find((conn) => conn.targetId === descendant.id);
          const descendantToBridge = estimateRoadLengthFromLandmarkToPoint(
            descendant,
            getBridgeHandlePoint(bridgePosition, invertHandleSide(side)),
            descendantConn?.handle ?? reverseConn?.targetHandle
          );
          const parentToExternal =
            parentConn?.length ??
            externalConn?.length ??
            calculateRoadLength(
              parent,
              external,
              parentConn?.handle ?? externalConn?.targetHandle,
              parentConn?.targetHandle ?? externalConn?.handle
            );
          if (descendantToBridge !== undefined && parentToExternal !== undefined) {
            return descendantToBridge + parentToExternal;
          }
        }
      }
      currentParentId = getParentLandmarkId(parent);
    }
    return undefined;
  };

  return resolveFor(source, target) ?? resolveFor(target, source);
};

const calculateRoadLength = (
  source: EnhancedLandmark,
  target: EnhancedLandmark,
  sourceHandle?: string,
  targetHandle?: string
): number | undefined => {
  if (!source.position || !target.position) return undefined;
  const sourceCenter = getLandmarkNodeCenter(source);
  const targetCenter = getLandmarkNodeCenter(target);
  if (!sourceCenter || !targetCenter) return undefined;
  const sourceSide = parseHandleSide(sourceHandle);
  const targetSide = parseHandleSide(targetHandle);
  const sourceAnchor = sourceSide
    ? getLandmarkSideMidpoint(source, sourceSide)
    : getFacingEdgeMidpoint(source, targetCenter);
  const targetAnchor = targetSide
    ? getLandmarkSideMidpoint(target, targetSide)
    : getFacingEdgeMidpoint(target, sourceCenter);
  if (!sourceAnchor || !targetAnchor) return undefined;
  return Math.round(euclideanDistance(sourceAnchor, targetAnchor));
};

export const estimateRoadLengthBetweenLandmarks = (
  source: EnhancedLandmark,
  target: EnhancedLandmark,
  sourceHandle?: string,
  targetHandle?: string
): number | undefined => calculateRoadLength(source, target, sourceHandle, targetHandle);

export const estimateRoadLengthFromLandmarkToPoint = (
  source: EnhancedLandmark,
  targetPoint: { x: number; y: number },
  sourceHandle?: string
): number | undefined => {
  if (!source.position) return undefined;
  const sourceCenter = getLandmarkNodeCenter(source);
  if (!sourceCenter) return undefined;
  const sourceSide = parseHandleSide(sourceHandle);
  const sourceAnchor = sourceSide
    ? getLandmarkSideMidpoint(source, sourceSide)
    : getFacingEdgeMidpoint(source, targetPoint);
  if (!sourceAnchor) return undefined;
  return Math.round(euclideanDistance(sourceAnchor, targetPoint));
};

const upsertRoadConnection = (
  landmark: EnhancedLandmark,
  targetId: string,
  handle?: string,
  targetHandle?: string,
  length?: number
) => {
  if (!landmark.roadConnections) {
    landmark.roadConnections = [];
  }
  const existing = landmark.roadConnections.find((conn) => conn.targetId === targetId);
  if (existing) {
    existing.handle = handle;
    existing.targetHandle = targetHandle;
    existing.length = length;
  } else {
    landmark.roadConnections.push({ targetId, handle, targetHandle, length });
  }
};

export const linkLandmarks = (
  landmarks: EnhancedLandmark[],
  sourceId: string,
  targetId: string,
  sourceHandle?: string,
  targetHandle?: string
) => {
  const sourceLandmark = landmarks.find((item) => item.id === sourceId);
  const targetLandmark = landmarks.find((item) => item.id === targetId);
  if (!sourceLandmark || !targetLandmark) return;
  const computedLength = calculateRoadLength(sourceLandmark, targetLandmark, sourceHandle, targetHandle);

  ensureRelatedLandmark(sourceLandmark, targetId);
  ensureRelatedLandmark(targetLandmark, sourceId);
  upsertRoadConnection(sourceLandmark, targetId, sourceHandle, targetHandle, computedLength);
  upsertRoadConnection(targetLandmark, sourceId, targetHandle, sourceHandle, computedLength);
};

const getRoadConnectionLength = (
  source: EnhancedLandmark,
  target: EnhancedLandmark,
  landmarks?: EnhancedLandmark[]
): number | undefined => {
  if (landmarks) {
    const bridgeLength = resolveBridgeRouteLength(source, target, landmarks);
    if (bridgeLength !== undefined) return bridgeLength;
  }
  const direct = source.roadConnections?.find((conn) => conn.targetId === target.id);
  if (direct?.length !== undefined) return direct.length;
  const reverse = target.roadConnections?.find((conn) => conn.targetId === source.id);
  return reverse?.length;
};

export const recalculateRoadConnectionLengths = (landmarks: EnhancedLandmark[]) => {
  const landmarkMap = new Map(landmarks.map((item) => [item.id, item]));
  const processedPairs = new Set<string>();

  landmarks.forEach((source) => {
    (source.roadConnections || []).forEach((connection) => {
      const target = landmarkMap.get(connection.targetId);
      if (!target) return;
      const pairKey = [source.id, target.id].sort().join('--');
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const sourceConn = source.roadConnections?.find((conn) => conn.targetId === target.id);
      const targetConn = target.roadConnections?.find((conn) => conn.targetId === source.id);
      const computedLength = calculateRoadLength(
        source,
        target,
        sourceConn?.handle ?? targetConn?.targetHandle,
        sourceConn?.targetHandle ?? targetConn?.handle
      );
      if (sourceConn) sourceConn.length = computedLength;
      if (targetConn) targetConn.length = computedLength;
    });
  });
};

export const unlinkLandmarks = (landmarks: EnhancedLandmark[], sourceId: string, targetId: string) => {
  const sourceLandmark = landmarks.find((item) => item.id === sourceId);
  const targetLandmark = landmarks.find((item) => item.id === targetId);
  if (sourceLandmark) {
    sourceLandmark.relatedLandmarks = (sourceLandmark.relatedLandmarks || []).filter((id) => id !== targetId);
    sourceLandmark.roadConnections = (sourceLandmark.roadConnections || []).filter(
      (conn) => conn.targetId !== targetId
    );
  }
  if (targetLandmark) {
    targetLandmark.relatedLandmarks = (targetLandmark.relatedLandmarks || []).filter((id) => id !== sourceId);
    targetLandmark.roadConnections = (targetLandmark.roadConnections || []).filter(
      (conn) => conn.targetId !== sourceId
    );
  }
};

export const removeLandmarkLinksForIds = (landmarks: EnhancedLandmark[], ids: Set<string>) => {
  if (ids.size === 0) return;
  landmarks.forEach((landmark) => {
    landmark.relatedLandmarks = (landmark.relatedLandmarks || []).filter((id) => !ids.has(id));
    landmark.roadConnections = (landmark.roadConnections || []).filter((conn) => !ids.has(conn.targetId));
    if (landmark.bridgePositions) {
      const next = Object.fromEntries(
        Object.entries(landmark.bridgePositions).filter(([externalId]) => !ids.has(externalId))
      );
      landmark.bridgePositions = next;
    }
  });
};

export const getRoadConnectionLengthText = (
  source: EnhancedLandmark,
  target?: EnhancedLandmark | null,
  unit?: string,
  landmarks?: EnhancedLandmark[]
): string => {
  if (!target) return '未计算';
  const length = getRoadConnectionLength(source, target, landmarks);
  if (length === undefined) return '未计算';
  return unit ? `${length} ${unit}` : String(length);
};

export const formatRoadLinkLabel = (targetName: string, distanceText: string, label: string): string =>
  `${targetName} (${label}: ${distanceText})`;
