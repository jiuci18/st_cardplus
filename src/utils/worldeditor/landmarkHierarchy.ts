import type { EnhancedLandmark } from '@/types/worldeditor/world-editor';

export const getParentLandmarkId = (landmark: EnhancedLandmark): string | null => {
  return landmark.parentLandmarkIds[0] || null;
};

export const normalizeLandmarkHierarchy = (landmarks: EnhancedLandmark[]) => {
  const map = new Map(landmarks.map((landmark) => [landmark.id, landmark]));

  landmarks.forEach((landmark) => {
    landmark.parentLandmarkIds = landmark.parentLandmarkIds.filter((id) => map.has(id) && id !== landmark.id);
    if (landmark.parentLandmarkIds.length > 1) {
      landmark.parentLandmarkIds = [landmark.parentLandmarkIds[0]];
    }
    landmark.childLandmarkIds = landmark.childLandmarkIds.filter(Boolean);
    if (landmark.position) {
      landmark.position = { ...landmark.position };
    }
  });

  landmarks.forEach((landmark) => {
    landmark.childLandmarkIds = [];
  });

  landmarks.forEach((landmark) => {
    const parentId = getParentLandmarkId(landmark);
    if (!parentId || parentId === landmark.id) return;
    const parent = map.get(parentId);
    if (!parent) return;
    if (!parent.childLandmarkIds.includes(landmark.id)) {
      parent.childLandmarkIds.push(landmark.id);
    }
  });
};

export const collectDescendantIds = (landmarks: EnhancedLandmark[], rootId: string) => {
  const map = new Map(landmarks.map((landmark) => [landmark.id, landmark]));
  const visited = new Set<string>();
  const stack = map.get(rootId)?.childLandmarkIds.slice() || [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    map.get(current)?.childLandmarkIds.forEach((id) => stack.push(id));
  }

  return visited;
};

export const setLandmarkParent = (landmarks: EnhancedLandmark[], childId: string, parentId: string | null) => {
  const map = new Map(landmarks.map((landmark) => [landmark.id, landmark]));
  const child = map.get(childId);
  if (!child) return;

  const oldParentId = getParentLandmarkId(child);
  if (parentId && parentId !== oldParentId) {
    const relatedIds = new Set<string>(child.relatedLandmarks || []);
    (child.roadConnections || []).forEach((conn) => relatedIds.add(conn.targetId));
    relatedIds.forEach((relatedId) => {
      const other = map.get(relatedId);
      if (!other) return;
      other.relatedLandmarks = (other.relatedLandmarks || []).filter((id) => id !== childId);
      other.roadConnections = (other.roadConnections || []).filter((conn) => conn.targetId !== childId);
    });
    child.relatedLandmarks = [];
    child.roadConnections = [];
  }
  if (oldParentId && map.has(oldParentId)) {
    const oldParent = map.get(oldParentId);
    if (oldParent) {
      oldParent.childLandmarkIds = oldParent.childLandmarkIds.filter((id) => id !== childId);
    }
  }

  if (!parentId || !map.has(parentId) || parentId === childId) {
    child.parentLandmarkIds = [];
    return;
  }

  const parent = map.get(parentId);
  child.parentLandmarkIds = [parentId];
  if (parent) {
    if (!parent.childLandmarkIds.includes(childId)) {
      parent.childLandmarkIds.push(childId);
    }
    if (!child.regionId && parent.regionId) {
      child.regionId = parent.regionId;
    }
  }
};

export const removeLandmarkFromHierarchy = (landmarks: EnhancedLandmark[], landmarkId: string) => {
  const map = new Map(landmarks.map((landmark) => [landmark.id, landmark]));
  const landmark = map.get(landmarkId);
  if (!landmark) return;

  const parentId = getParentLandmarkId(landmark);
  if (parentId && map.has(parentId)) {
    const parent = map.get(parentId);
    if (parent) {
      parent.childLandmarkIds = parent.childLandmarkIds.filter((id) => id !== landmarkId);
    }
  }

  landmark.childLandmarkIds.forEach((childId) => {
    const child = map.get(childId);
    if (child) {
      child.parentLandmarkIds = child.parentLandmarkIds.filter((id) => id !== landmarkId);
    }
  });
};
