<template>
  <el-scrollbar class="worldbook-editor-scrollbar">
    <div class="content-panel-body">
      <div
        v-if="!force"
        class="worldbook-editor-empty-state"
      >
        <el-empty
          description="请在列表中选择或新增一个势力进行编辑 "
          :image-size="80"
        ></el-empty>
      </div>
      <el-form
        v-if="force"
        :model="force"
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
                v-model="force.name"
                placeholder="例如：铁炉堡议会"
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
                v-model="force.description"
                type="textarea"
                :rows="5"
                placeholder="关于这个势力的详细描述..."
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

        <!-- 组织属性 -->
        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:bank-duotone"
              class="form-section-icon"
            />
            组织属性
          </h3>
          <div class="form-section-content">
            <div class="form-grid-2-col">
              <div>
                <label class="form-label">类型</label>
                <el-select
                  v-model="force.type"
                  class="form-full-width"
                  filterable
                  allow-create
                  default-first-option
                  :reserve-keyword="false"
                  placeholder="选择或输入势力类型"
                >
                  <el-option
                    v-for="type in forceTypes"
                    :key="type"
                    :label="localizeForceType(type)"
                    :value="type"
                  />
                </el-select>
              </div>
              <div>
                <label class="form-label">强度 (1-5)</label>
                <el-input-number
                  v-model.number="force.power"
                  :min="1"
                  controls-position="right"
                  class="form-full-width"
                />
              </div>
              <div>
                <label class="form-label">总部位置</label>
                <el-select
                  v-model="force.headquarters"
                  filterable
                  allow-create
                  default-first-option
                  placeholder="选择或输入总部地标"
                  class="form-full-width"
                >
                  <el-option
                    v-for="landmark in projectLandmarks"
                    :key="landmark.id"
                    :label="landmark.name"
                    :value="landmark.id"
                  />
                </el-select>
                <p
                  v-if="errors.headquarters"
                  class="error-message"
                >
                  {{ errors.headquarters }}
                </p>
              </div>
              <div>
                <label class="form-label">总成员数</label>
                <el-input-number
                  v-model.number="force.totalMembers"
                  controls-position="right"
                  class="form-full-width"
                />
              </div>
            </div>
            <div>
              <label class="form-label">领导者</label>
              <div class="entry-cards-grid">
                <div
                  v-for="(leader, index) in force.leaders"
                  :key="leader.id"
                  class="entry-card"
                >
                  <div class="entry-card-header">
                    <span class="entry-card-title">领导者 {{ index + 1 }}</span>
                    <el-popconfirm
                      title="确定删除这位领导者吗？"
                      @confirm="removeLeader(index)"
                    >
                      <template #reference>
                        <el-button
                          type="danger"
                          circle
                          plain
                          size="small"
                        >
                          <Icon icon="ph:trash-duotone" />
                        </el-button>
                      </template>
                    </el-popconfirm>
                  </div>

                  <div class="entry-card-body">
                    <div class="entry-field">
                      <label class="entry-field-label">头衔</label>
                      <el-input
                        v-model="leader.title"
                        placeholder="例如: 议会首席"
                      />
                    </div>

                    <div class="entry-field">
                      <label class="entry-field-label">姓名</label>
                      <el-input
                        v-model="leader.name"
                        placeholder="例如: 麦格尼·铜须"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <el-button
                @click="addLeader"
                type="primary"
                plain
                class="form-full-width"
              >
                <Icon icon="ph:plus-circle-duotone" />
                添加领导者
              </el-button>
            </div>
            <div>
              <label class="form-label">分部</label>
              <div class="entry-cards-grid">
                <div
                  v-for="(branch, index) in force.branchLocations"
                  :key="branch.id"
                  class="entry-card"
                >
                  <div class="entry-card-header">
                    <span class="entry-card-title">分部 {{ index + 1 }}</span>
                    <el-popconfirm
                      title="确定删除这个分部吗？"
                      @confirm="removeBranchLocation(index)"
                    >
                      <template #reference>
                        <el-button
                          type="danger"
                          circle
                          plain
                          size="small"
                        >
                          <Icon icon="ph:trash-duotone" />
                        </el-button>
                      </template>
                    </el-popconfirm>
                  </div>

                  <div class="entry-card-body">
                    <div class="entry-field">
                      <label class="entry-field-label">分部类型</label>
                      <el-input
                        v-model="branch.type"
                        placeholder="例如: 分舵、接应点"
                      />
                    </div>

                    <div class="entry-field">
                      <label class="entry-field-label">位置</label>
                      <el-select
                        v-model="branch.locationId"
                        filterable
                        placeholder="选择地标位置"
                        class="form-full-width"
                      >
                        <el-option
                          v-for="landmark in projectLandmarks"
                          :key="landmark.id"
                          :label="landmark.name"
                          :value="landmark.id"
                        />
                      </el-select>
                    </div>

                    <div class="entry-field">
                      <label class="entry-field-label">主理人 (可选)</label>
                      <el-input
                        v-model="branch.manager"
                        placeholder="例如: 张三"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <el-button
                @click="addBranchLocation"
                type="primary"
                plain
                class="form-full-width"
              >
                <Icon icon="ph:plus-circle-duotone" />
                添加分部
              </el-button>
            </div>
          </div>
        </section>

        <div class="form-grid-2-col">
          <!-- 外交关系 -->
          <section class="form-section">
            <h3 class="form-section-title">
              <Icon
                icon="ph:handshake-duotone"
                class="form-section-icon"
              />
              外交关系
            </h3>
            <div class="form-section-content">
              <div>
                <label class="form-label">盟友</label>
                <el-select
                  v-model="force.allies"
                  multiple
                  filterable
                  placeholder="选择盟友势力"
                  class="form-full-width"
                >
                  <el-option
                    v-for="item in filteredForces"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </div>
              <div>
                <label class="form-label">宿敌</label>
                <el-select
                  v-model="force.enemies"
                  multiple
                  filterable
                  placeholder="选择宿敌势力"
                  class="form-full-width"
                >
                  <el-option
                    v-for="item in filteredForces"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </div>
            </div>
          </section>

          <!-- 资源与能力 -->
          <section class="form-section">
            <h3 class="form-section-title">
              <Icon
                icon="ph:sword-duotone"
                class="form-section-icon"
              />
              资源与能力
            </h3>
            <div class="form-section-content">
              <div>
                <label class="form-label">特殊能力</label>
                <el-select
                  ref="capabilitiesSelectRef"
                  v-model="force.capabilities"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  :reserve-keyword="false"
                  placeholder="例如：符文锻造, 元素抵抗"
                  class="form-full-width"
                ></el-select>
              </div>
              <div>
                <label class="form-label">弱点</label>
                <el-select
                  ref="weaknessesSelectRef"
                  v-model="force.weaknesses"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  :reserve-keyword="false"
                  placeholder="例如：惧怕暗影魔法, 内部纷争"
                  class="form-full-width"
                ></el-select>
              </div>
            </div>
          </section>
        </div>

        <!-- 时间线 -->
        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:clock-clockwise-duotone"
              class="form-section-icon"
            />
            势力时间线
          </h3>
          <div class="form-section-content">
            <div>
              <label class="form-label">历史事件</label>
              <div class="entry-cards-grid">
                <div
                  v-for="(event, index) in force.timeline"
                  :key="event.id"
                  class="entry-card"
                >
                  <div class="entry-card-header">
                    <span class="entry-card-title">事件 {{ index + 1 }}</span>
                    <el-popconfirm
                      title="确定删除这个事件吗？"
                      @confirm="removeTimelineEvent(index)"
                    >
                      <template #reference>
                        <el-button
                          type="danger"
                          circle
                          plain
                          size="small"
                        >
                          <Icon icon="ph:trash-duotone" />
                        </el-button>
                      </template>
                    </el-popconfirm>
                  </div>

                  <div class="entry-card-body">
                    <div class="entry-field">
                      <label class="entry-field-label">日期</label>
                      <el-input
                        v-model="event.date"
                        placeholder="例如: 1024年春"
                      />
                    </div>

                    <div class="entry-field">
                      <label class="entry-field-label">事件标题</label>
                      <el-input
                        v-model="event.title"
                        placeholder="例如: 铁炉堡大议会成立"
                      />
                    </div>

                    <div class="entry-field">
                      <label class="entry-field-label">事件描述</label>
                      <el-input
                        v-model="event.description"
                        type="textarea"
                        :rows="3"
                        placeholder="详细描述这个历史事件..."
                      />
                    </div>

                    <div class="entry-field">
                      <label class="entry-field-label">影响</label>
                      <el-input
                        v-model="event.impact"
                        type="textarea"
                        :rows="2"
                        placeholder="这个事件对势力产生了什么影响..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <el-button
                @click="addTimelineEvent"
                type="primary"
                plain
                class="form-full-width"
              >
                <Icon icon="ph:plus-circle-duotone" />
                添加历史事件
              </el-button>
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
          <div class="form-section-content">
            <div>
              <label class="form-label">标签</label>
              <el-select
                ref="tagsSelectRef"
                v-model="force.tags"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="例如：王国, 守序善良, 军事"
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
            <div>
              <label class="form-label">备注</label>
              <el-input
                v-model="force.notes"
                type="textarea"
                :rows="3"
                placeholder="内部备注或额外信息..."
              />
            </div>
          </div>
        </section>
      </el-form>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { toRefs, watch, computed, nextTick, onBeforeUnmount, ref, type ComponentPublicInstance } from 'vue';
import {
  ElScrollbar,
  ElForm,
  ElInput,
  ElSelect,
  ElOption,
  ElInputNumber,
  ElEmpty,
  ElButton,
  ElPopconfirm,
} from 'element-plus';
import { Icon } from '@iconify/vue';
import type { EnhancedForce, EnhancedLandmark } from '@/types/worldeditor/world-editor';
import { ForceType } from '@/types/worldeditor/world-editor';
import { useValidation, forceValidationRules } from '@/composables/worldeditor/useValidation';
import { getForceTypeLabel } from '@/utils/worldeditor/typeMeta';
import { bindDelimitedPaste, mergeUniqueValues } from '@/utils/multiValuePaste';
import { v4 as uuidv4 } from 'uuid';
import '@/css/worldbook.css';

interface Props {
  force: EnhancedForce | null;
  allTags?: string[];
  allForces?: EnhancedForce[];
  allLandmarks?: EnhancedLandmark[];
}
const props = defineProps<Props>();
const { errors, validate } = useValidation();
const { force } = toRefs(props);
const forceTypes = Object.values(ForceType);
type SelectComponentInstance = ComponentPublicInstance & { $el: HTMLElement };
const capabilitiesSelectRef = ref<SelectComponentInstance | null>(null);
const weaknessesSelectRef = ref<SelectComponentInstance | null>(null);
const tagsSelectRef = ref<SelectComponentInstance | null>(null);
let pasteCleanupFns: Array<() => void> = [];

const filteredForces = computed(() => {
  if (!props.allForces || !props.force) {
    return [];
  }
  return props.allForces.filter((f) => f.id !== props.force!.id);
});

const projectLandmarks = computed(() => {
  if (!props.allLandmarks || !props.force) {
    return [];
  }
  return props.allLandmarks.filter((l) => l.projectId === props.force!.projectId);
});

const localizeForceType = (type: string): string => getForceTypeLabel(type);

const clearPasteHandlers = () => {
  pasteCleanupFns.forEach((cleanup) => cleanup());
  pasteCleanupFns = [];
};

const bindPasteHandlers = async () => {
  clearPasteHandlers();
  await nextTick();

  const capabilitiesCleanup = bindDelimitedPaste(capabilitiesSelectRef.value?.$el, (values) => {
    if (!props.force) return;
    props.force.capabilities = mergeUniqueValues(props.force.capabilities || [], values);
  });
  const weaknessesCleanup = bindDelimitedPaste(weaknessesSelectRef.value?.$el, (values) => {
    if (!props.force) return;
    props.force.weaknesses = mergeUniqueValues(props.force.weaknesses || [], values);
  });
  const tagsCleanup = bindDelimitedPaste(tagsSelectRef.value?.$el, (values) => {
    if (!props.force) return;
    props.force.tags = mergeUniqueValues(props.force.tags || [], values);
  });

  pasteCleanupFns = [capabilitiesCleanup, weaknessesCleanup, tagsCleanup].filter(
    (cleanup): cleanup is () => void => typeof cleanup === 'function'
  );
};

const addLeader = () => {
  if (props.force) {
    if (!props.force.leaders) {
      props.force.leaders = [];
    }
    props.force.leaders.push({
      id: uuidv4(),
      name: '',
      title: '',
    });
  }
};

const removeLeader = (index: number) => {
  if (props.force && props.force.leaders) {
    props.force.leaders.splice(index, 1);
  }
};

const addBranchLocation = () => {
  if (props.force) {
    if (!props.force.branchLocations) {
      props.force.branchLocations = [];
    }
    props.force.branchLocations.push({
      id: uuidv4(),
      type: '',
      locationId: '',
      manager: '',
    });
  }
};

const removeBranchLocation = (index: number) => {
  if (props.force && props.force.branchLocations) {
    props.force.branchLocations.splice(index, 1);
  }
};

const addTimelineEvent = () => {
  if (props.force) {
    if (!props.force.timeline) {
      props.force.timeline = [];
    }
    props.force.timeline.push({
      id: uuidv4(),
      date: '',
      title: '',
      description: '',
      impact: '',
    });
  }
};

const removeTimelineEvent = (index: number) => {
  if (props.force && props.force.timeline) {
    props.force.timeline.splice(index, 1);
  }
};

watch(
  () => props.force,
  (newForce) => {
    if (newForce) {
      // Ensure leaders array exists
      if (!newForce.leaders) {
        newForce.leaders = [];
      }
      // Ensure branchLocations array exists
      if (!newForce.branchLocations) {
        newForce.branchLocations = [];
      }
      // Ensure allies and enemies arrays exist
      if (!newForce.allies) {
        newForce.allies = [];
      }
      if (!newForce.enemies) {
        newForce.enemies = [];
      }
      // Ensure timeline array exists
      if (!newForce.timeline) {
        newForce.timeline = [];
      }
      validate(newForce, forceValidationRules);
    }
    void bindPasteHandlers();
  },
  { deep: true, immediate: true }
);

onBeforeUnmount(() => {
  clearPasteHandlers();
});
</script>

<style scoped>
.worldbook-editor-scrollbar {
  height: 100%;
}

/* ===== 统一的条目卡片样式 ===== */
.entry-card {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  padding: 12px;
  background: var(--el-fill-color-extra-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-extra-light);
  transition: all 0.2s;
}

.entry-card:hover {
  border-color: var(--el-border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* 卡片头部 */
.entry-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.entry-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

/* 卡片主体 */
.entry-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 字段容器 */
.entry-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 字段标签 */
.entry-field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

/* 卡片网格容器 - 默认单列 */
.entry-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

/* 平板端: 两列布局 */
@media (min-width: 768px) {
  .entry-cards-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* 桌面端: 三列布局 */
@media (min-width: 1200px) {
  .entry-cards-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
</style>
