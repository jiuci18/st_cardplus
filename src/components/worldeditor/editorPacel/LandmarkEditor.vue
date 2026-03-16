<template>
  <el-scrollbar class="worldbook-editor-scrollbar">
    <div class="content-panel-body">
      <div
        v-if="!landmark"
        class="worldbook-editor-empty-state"
      >
        <el-empty
          description="请在列表中选择或新增一个地标进行编辑 "
          :image-size="80"
        ></el-empty>
      </div>
      <el-form
        v-if="landmark"
        :model="landmark"
        label-position="top"
        class="worldbook-editor-form"
      >
        <!-- 基础信息 -->
        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:info-duotone"
              class="form-section-icon"
            />
            基础信息
          </h3>
          <div class="form-section-content">
            <div>
              <label class="form-label">名称</label>
              <el-input
                v-model="landmark.name"
                placeholder="例如：风语者山峰"
              />
              <p
                v-if="errors.name"
                class="error-message"
              >
                {{ errors.name }}
              </p>
            </div>
            <div>
              <label class="form-label">描述</label>
              <el-input
                v-model="landmark.description"
                type="textarea"
                :rows="5"
                placeholder="关于这个地标的详细描述..."
              />
              <p
                v-if="errors.description"
                class="error-message"
              >
                {{ errors.description }}
              </p>
            </div>
          </div>
        </section>

        <!-- 分类属性 -->
        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:tag-duotone"
              class="form-section-icon"
            />
            分类属性
          </h3>
          <div class="form-grid-3-col">
            <div>
              <label class="form-label">类型</label>
              <el-select
                v-model="landmark.type"
                class="form-full-width"
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="选择或输入地标类型"
              >
                <el-option
                  v-for="type in landmarkTypes"
                  :key="type"
                  :label="localizeLandmarkType(type)"
                  :value="type"
                />
              </el-select>
            </div>
            <div class="form-grid-span-2">
              <label class="form-label">重要性 (1-5)</label>
              <el-input-number
                v-model.number="landmark.importance"
                :min="1"
                controls-position="right"
                class="form-full-width"
              />
            </div>
            <div class="form-grid-span-3">
              <label class="form-label">标签</label>
              <el-select
                ref="tagsSelectRef"
                v-model="landmark.tags"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="例如：山脉, 险峻, 神秘"
                class="form-full-width"
              >
                <el-option
                  v-for="tag in props.allTags"
                  :key="tag"
                  :label="tag"
                  :value="tag"
                />
              </el-select>
            </div>
          </div>
        </section>

        <!-- 位置信息 -->
        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:map-pin-duotone"
              class="form-section-icon"
            />
            位置与关系
          </h3>
          <div class="form-section-content form-grid-2-col">
            <div class="form-section-content">
              <div>
                <label class="form-label">所属区域</label>
                <RegionSelect
                  v-model="landmark.regionId"
                  :regions="projectRegions"
                  :project-id="landmark.projectId"
                  :allow-create="true"
                  placeholder="选择或输入区域名称"
                  :create-region="props.createRegion"
                />
              </div>
              <div class="form-grid-2-col">
                <div>
                  <label class="form-label">父级地标</label>
                  <el-select
                    v-model="selectedParentId"
                    clearable
                    filterable
                    placeholder="选择父级地标"
                    class="form-full-width"
                  >
                    <el-option
                      v-for="item in availableParentLandmarks"
                      :key="item.id"
                      :label="item.name"
                      :value="item.id"
                    />
                  </el-select>
                </div>
                <div>
                  <label class="form-label">道路链接</label>
                  <el-select
                    v-model="selectedRoadLinkIds"
                    multiple
                    clearable
                    filterable
                    :reserve-keyword="false"
                    :disabled="roadLinkOptions.length === 0"
                    placeholder="取消选择即可断开道路链接"
                    class="form-full-width"
                  >
                    <el-option
                      v-for="item in roadLinkOptions"
                      :key="item.id"
                      :label="item.name"
                      :value="item.id"
                    />
                  </el-select>
                </div>
              </div>
              <div>
                <label class="form-label">重要地标</label>
                <el-select
                  v-model="landmark.keyLandmarkId"
                  clearable
                  filterable
                  placeholder="选择一个重要地标"
                  class="form-full-width"
                >
                  <el-option
                    v-for="item in filteredLandmarks"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </div>
            </div>
            <div
              v-if="landmark.relativePosition"
              class="form-grid-4-col"
            >
              <div>
                <label class="form-label">北</label>
                <el-select
                  v-model="landmark.relativePosition.north"
                  multiple
                  clearable
                  filterable
                  collapse-tags
                  :reserve-keyword="false"
                  placeholder="选择北方地标"
                  class="form-full-width"
                >
                  <el-option
                    v-for="item in filteredLandmarks"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </div>
              <div>
                <label class="form-label">南</label>
                <el-select
                  v-model="landmark.relativePosition.south"
                  multiple
                  clearable
                  filterable
                  collapse-tags
                  :reserve-keyword="false"
                  placeholder="选择南方地标"
                  class="form-full-width"
                >
                  <el-option
                    v-for="item in filteredLandmarks"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </div>
              <div>
                <label class="form-label">东</label>
                <el-select
                  v-model="landmark.relativePosition.east"
                  multiple
                  clearable
                  filterable
                  collapse-tags
                  :reserve-keyword="false"
                  placeholder="选择东方地标"
                  class="form-full-width"
                >
                  <el-option
                    v-for="item in filteredLandmarks"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </div>
              <div>
                <label class="form-label">西</label>
                <el-select
                  v-model="landmark.relativePosition.west"
                  multiple
                  clearable
                  filterable
                  collapse-tags
                  :reserve-keyword="false"
                  placeholder="选择西方地标"
                  class="form-full-width"
                >
                  <el-option
                    v-for="item in filteredLandmarks"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </div>
            </div>
            <div class="form-grid-span-2">
              <label class="form-label">子地标</label>
              <div class="child-landmark-list">
                <span
                  v-if="childLandmarks.length === 0"
                  class="child-landmark-empty"
                >
                  暂无子地标
                </span>
                <el-tag
                  v-for="child in childLandmarks"
                  :key="child.id"
                  size="small"
                  effect="plain"
                >
                  {{ child.name }}
                </el-tag>
              </div>
            </div>
          </div>
        </section>

        <!-- 势力驻地 -->
        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:flag-duotone"
              class="form-section-icon"
            />
            势力驻地
          </h3>
          <div class="form-section-content">
            <div
              v-if="forcesAtLandmark.length === 0"
              class="empty-inline"
            >
              暂无势力驻扎在此地标
            </div>
            <div
              v-else
              class="force-summary-list"
            >
              <div
                v-for="force in forcesAtLandmark"
                :key="force.id"
                class="force-summary-item"
              >
                <div class="force-summary-main">
                  <span class="force-summary-name">{{ force.name }}</span>
                  <div class="force-summary-tags">
                    <el-tag
                      v-for="tag in force.roles"
                      :key="tag"
                      size="small"
                      type="info"
                      effect="plain"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </div>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="emitSelectForce(force.raw)"
                >
                  快速编辑
                </el-button>
              </div>
            </div>
          </div>
        </section>

        <!-- 扩展属性 -->
        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:leaf-duotone"
              class="form-section-icon"
            />
            扩展属性
          </h3>
          <div class="form-grid-3-col">
            <div>
              <label class="form-label">气候</label>
              <el-select
                v-model="landmark.climate"
                filterable
                allow-create
                default-first-option
                placeholder="例如：寒带苔原"
                class="form-full-width"
              >
                <el-option
                  v-for="item in commonClimates"
                  :key="item.name"
                  :label="item.name"
                  :value="item.name"
                >
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                    <span>{{ item.name }}</span>
                    <el-tooltip
                      :content="item.description"
                      placement="right"
                    >
                      <Icon
                        icon="ph:info-duotone"
                        style="margin-left: 8px; color: var(--el-text-color-secondary)"
                      />
                    </el-tooltip>
                  </div>
                </el-option>
              </el-select>
            </div>
            <div>
              <label class="form-label">地形</label>
              <el-select
                v-model="landmark.terrain"
                filterable
                allow-create
                default-first-option
                placeholder="例如：山地, 森林"
                class="form-full-width"
              >
                <el-option
                  v-for="terrain in commonTerrains"
                  :key="terrain"
                  :label="terrain"
                  :value="terrain"
                />
              </el-select>
            </div>
            <div>
              <label class="form-label">人口</label>
              <el-input-number
                v-model.number="landmark.population"
                controls-position="right"
                class="form-full-width"
              />
            </div>
            <div>
              <label class="form-label">防御等级</label>
              <el-input-number
                v-model.number="landmark.defenseLevel"
                controls-position="right"
                class="form-full-width"
              />
            </div>
            <div class="form-grid-span-3">
              <label class="form-label">资源</label>
              <el-select
                ref="resourcesSelectRef"
                v-model="landmark.resources"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="例如：铁矿, 魔法水晶"
                class="form-full-width"
              ></el-select>
            </div>
          </div>
        </section>

        <!-- 元数据 -->
        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:note-pencil-duotone"
              class="form-section-icon"
            />
            元数据
          </h3>
          <div>
            <label class="form-label">备注</label>
            <el-input
              v-model="landmark.notes"
              type="textarea"
              :rows="3"
              placeholder="内部备注或额外信息..."
            />
          </div>
        </section>
      </el-form>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { watch, computed, nextTick, onBeforeUnmount, ref, type ComponentPublicInstance } from 'vue';
import {
  ElScrollbar,
  ElForm,
  ElInput,
  ElSelect,
  ElOption,
  ElInputNumber,
  ElEmpty,
  ElTooltip,
  ElTag,
  ElButton,
} from 'element-plus';
import { Icon } from '@iconify/vue';
import type { EnhancedLandmark, EnhancedForce, EnhancedRegion } from '@/types/world-editor';
import { LandmarkType } from '@/types/world-editor';
import { getLandmarkTypeLabel } from '@/utils/worldeditor/typeMeta';
import { useValidation } from '@/composables/worldeditor/useValidation';
import { collectDescendantIds, getParentLandmarkId, setLandmarkParent } from '@/utils/worldeditor/landmarkHierarchy';
import { formatRoadLinkLabel, getRoadConnectionLengthText, unlinkLandmarks } from '@/composables/worldeditor/graph/worldGraphLinks';
import { bindDelimitedPaste, mergeUniqueValues } from '@/utils/multiValuePaste';
import RegionSelect from '../RegionSelect.vue';
import '@/css/worldbook.css';

interface Props {
  landmark: EnhancedLandmark | null;
  allLandmarks?: EnhancedLandmark[];
  allTags?: string[];
  allForces?: EnhancedForce[];
  allRegions?: EnhancedRegion[];
  createRegion?: (name: string, projectId: string) => EnhancedRegion;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'select-force', force: EnhancedForce): void;
}>();
type SelectComponentInstance = ComponentPublicInstance & { $el: HTMLElement };
const tagsSelectRef = ref<SelectComponentInstance | null>(null);
const resourcesSelectRef = ref<SelectComponentInstance | null>(null);
let pasteCleanupFns: Array<() => void> = [];

// 虽然WorldBookEditor中没有直接使用，但考虑到LandmarkEditor原有功能，暂时保留校验逻辑
// 如果父组件统一处理，则可以移除
const { errors } = useValidation();

const landmarkTypes = Object.values(LandmarkType);

const commonClimates = [
  { name: '热带雨林', description: '全年高温多雨，物种丰富' },
  { name: '热带草原', description: '有明显的干湿两季，广阔的草原和稀疏的树木' },
  { name: '热带季风', description: '全年高温，分旱雨两季，雨季降水集中' },
  { name: '沙漠', description: '极端干旱，温差大，植被稀少' },
  { name: '亚热带季风', description: '夏季高温多雨，冬季温和少雨' },
  { name: '地中海', description: '夏季炎热干燥，冬季温和多雨' },
  { name: '温带海洋性', description: '全年温和湿润，气温年较差小' },
  { name: '温带大陆性', description: '冬冷夏热，年温差大，降水集中在夏季' },
  { name: '温带季风', description: '夏季高温多雨，冬季寒冷干燥' },
  { name: '亚寒带针叶林', description: '冬季漫长严寒，夏季短暂凉爽，以针叶林为主' },
  { name: '苔原', description: '全年低温，土壤冻结，只有苔藓、地衣等低等植物' },
  { name: '冰原', description: '终年严寒，地面覆盖厚厚的冰雪' },
  { name: '高原山地', description: '海拔高，气温随海拔升高而降低，气候垂直变化显著' },
  { name: '沼泽', description: '地表过湿或有薄层积水，生长着湿生和水生植物' },
  { name: '火山', description: '受火山活动影响，地热资源丰富，土壤肥沃' },
  { name: '魔法/虚空', description: '受魔法或异常能量影响的超自然气候' },
];

const commonTerrains = [
  '平原',
  '丘陵',
  '山地',
  '高原',
  '盆地',
  '森林',
  '草原',
  '沙漠',
  '沼泽',
  '海岸',
  '岛屿',
  '火山',
  '冰川',
  '河流',
  '湖泊',
];

const localizeLandmarkType = (type: string): string => getLandmarkTypeLabel(type);

const isConnectedLandmark = (source: EnhancedLandmark, target: EnhancedLandmark) => {
  if (source.relatedLandmarks?.includes(target.id)) return true;
  if (source.roadConnections?.some((conn) => conn.targetId === target.id)) return true;
  if (target.relatedLandmarks?.includes(source.id)) return true;
  if (target.roadConnections?.some((conn) => conn.targetId === source.id)) return true;
  return false;
};

const getRoadLinkedIds = (landmark: EnhancedLandmark, allLandmarks: EnhancedLandmark[]) => {
  const ids = new Set<string>();
  (landmark.roadConnections || []).forEach((conn) => ids.add(conn.targetId));
  allLandmarks.forEach((item) => {
    if (item.id !== landmark.id && item.roadConnections?.some((conn) => conn.targetId === landmark.id)) {
      ids.add(item.id);
    }
  });
  return ids;
};

// 过滤掉当前正在编辑的地标，用于相对位置选择
const filteredLandmarks = computed(() => {
  if (!props.allLandmarks || !props.landmark) {
    return [];
  }
  return props.allLandmarks.filter(
    (item) =>
      item.id !== props.landmark!.id &&
      item.projectId === props.landmark!.projectId &&
      isConnectedLandmark(props.landmark!, item)
  );
});

const projectRegions = computed(() => {
  if (!props.landmark || !props.allRegions) return [];
  return props.allRegions.filter((region) => region.projectId === props.landmark!.projectId);
});

const availableParentLandmarks = computed(() => {
  if (!props.landmark || !props.allLandmarks) return [];
  const descendants = collectDescendantIds(props.allLandmarks, props.landmark.id);
  return props.allLandmarks.filter(
    (item) =>
      item.projectId === props.landmark!.projectId && item.id !== props.landmark!.id && !descendants.has(item.id)
  );
});

const selectedParentId = computed({
  get: () => {
    if (!props.landmark) return '';
    return getParentLandmarkId(props.landmark) || '';
  },
  set: (value: string) => {
    if (!props.landmark || !props.allLandmarks) return;
    const nextParentId = value || null;
    setLandmarkParent(props.allLandmarks, props.landmark.id, nextParentId);
  },
});

const childLandmarks = computed(() => {
  if (!props.landmark || !props.allLandmarks) return [];
  const childIds = props.landmark.childLandmarkIds;
  const map = new Map(props.allLandmarks.map((item) => [item.id, item]));
  return childIds.map((id) => map.get(id)).filter(Boolean) as EnhancedLandmark[];
});

const roadLinkOptions = computed(() => {
  if (!props.landmark || !props.allLandmarks) return [];
  const ids = getRoadLinkedIds(props.landmark, props.allLandmarks);
  const landmarkMap = new Map(props.allLandmarks.map((item) => [item.id, item]));
  return Array.from(ids).map((id) => {
    const match = landmarkMap.get(id);
    if (!match || match.projectId !== props.landmark!.projectId) {
      return { id, name: `未知地标 (${id})`, missing: true };
    }
    const distanceText = getRoadConnectionLengthText(props.landmark!, match, undefined, props.allLandmarks);
    return { id: match.id, name: formatRoadLinkLabel(match.name, distanceText, '与此地标的距离'), missing: false };
  });
});

const selectedRoadLinkIds = computed({
  get: () => {
    if (!props.landmark || !props.allLandmarks) return [];
    return roadLinkOptions.value.map((item) => item.id);
  },
  set: (nextIds: string[]) => {
    if (!props.landmark || !props.allLandmarks) return;
    const currentIds = new Set(roadLinkOptions.value.map((item) => item.id));
    const nextIdSet = new Set(nextIds || []);
    currentIds.forEach((id) => {
      if (!nextIdSet.has(id)) {
        unlinkLandmarks(props.allLandmarks!, props.landmark!.id, id);
      }
    });
  },
});

const forcesAtLandmark = computed(() => {
  if (!props.allForces || !props.landmark) return [];
  const landmark = props.landmark;
  return props.allForces
    .filter((force) => force.projectId === landmark.projectId)
    .map((force) => {
      const roles: string[] = [];
      if (force.headquarters === landmark.id) {
        roles.push('总部');
      }
      if (force.branchLocations?.some((branch) => branch.locationId === landmark.id)) {
        roles.push('分部');
      }
      return { id: force.id, name: force.name, roles, raw: force };
    })
    .filter((force) => force.roles.length > 0);
});

const emitSelectForce = (force: EnhancedForce) => {
  emit('select-force', force);
};

const clearPasteHandlers = () => {
  pasteCleanupFns.forEach((cleanup) => cleanup());
  pasteCleanupFns = [];
};

const bindPasteHandlers = async () => {
  clearPasteHandlers();
  await nextTick();

  const tagCleanup = bindDelimitedPaste(tagsSelectRef.value?.$el, (values) => {
    if (!props.landmark) return;
    props.landmark.tags = mergeUniqueValues(props.landmark.tags || [], values);
  });
  const resourceCleanup = bindDelimitedPaste(resourcesSelectRef.value?.$el, (values) => {
    if (!props.landmark) return;
    props.landmark.resources = mergeUniqueValues(props.landmark.resources || [], values);
  });

  pasteCleanupFns = [tagCleanup, resourceCleanup].filter(
    (cleanup): cleanup is () => void => typeof cleanup === 'function'
  );
};

const normalizeRelativePosition = (landmark: EnhancedLandmark) => {
  if (!landmark.relativePosition) {
    landmark.relativePosition = { north: [], south: [], east: [], west: [] };
    return;
  }
  landmark.relativePosition.north = landmark.relativePosition.north || [];
  landmark.relativePosition.south = landmark.relativePosition.south || [];
  landmark.relativePosition.east = landmark.relativePosition.east || [];
  landmark.relativePosition.west = landmark.relativePosition.west || [];
};

const pruneRelativePosition = (landmark: EnhancedLandmark, allowedIds: Set<string>) => {
  normalizeRelativePosition(landmark);
  const relativePosition = landmark.relativePosition!;
  const filterIds = (value?: string[]) => (value || []).filter((id) => allowedIds.has(id));
  relativePosition.north = filterIds(relativePosition.north);
  relativePosition.south = filterIds(relativePosition.south);
  relativePosition.east = filterIds(relativePosition.east);
  relativePosition.west = filterIds(relativePosition.west);
};

watch(
  () => props.landmark,
  (newLandmark) => {
    if (newLandmark) {
      normalizeRelativePosition(newLandmark);
    }
    void bindPasteHandlers();
  },
  { immediate: true }
);

watch(
  [() => props.landmark, filteredLandmarks],
  ([landmark]) => {
    if (!landmark) return;
    const allowedIds = new Set(filteredLandmarks.value.map((item) => item.id));
    pruneRelativePosition(landmark, allowedIds);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearPasteHandlers();
});
</script>

<style scoped>
.worldbook-editor-scrollbar {
  height: 100%;
}

.empty-inline {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.force-summary-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.force-summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-light);
  gap: 12px;
}

.child-landmark-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border-radius: 6px;
  border: 1px dashed var(--el-border-color);
  background: var(--el-fill-color-light);
  min-height: 36px;
}

.child-landmark-empty {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.force-summary-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.force-summary-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.force-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
