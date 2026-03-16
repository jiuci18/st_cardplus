<template>
  <el-scrollbar class="character-card-editor-scrollbar">
    <div class="content-panel-body">
      <CharacterCardButtons
        :characterName="form.data.chineseName"
        @saveCharacterCard="saveCharacterCard"
        @loadCharacterCard="loadCharacterCard"
        @resetForm="resetForm"
        @copyToClipboard="copyToClipboard"
        @importFromClipboard="(data) => importFromClipboard(data)"
      />
      <el-form
        :model="form.data"
        label-position="top"
        ref="characterFormRef"
        class="character-card-editor-form"
      >
        <section class="form-section">
          <div class="title-Btn-add form-section-title">
            <h3 class="title-fixed">
              <Icon
                icon="ph:info-duotone"
                class="form-section-icon"
              />
              基本信息
            </h3>
            <div style="display: flex; gap: 8px; margin-left: 16px">
              <el-button
                type="success"
                @click="exportBasicInfo"
                title="导出基本信息"
              >
                <Icon
                  icon="material-symbols:content-copy-outline"
                  width="18"
                  height="18"
                />
              </el-button>
            </div>
          </div>
          <div class="form-section-content">
            <div class="form-row-responsive">
              <div class="form-group-responsive">
                <label class="form-label">中文名</label>
                <el-input
                  v-model="form.data.chineseName"
                  placeholder="请输入中文名"
                />
              </div>
            </div>
            <div class="form-row-responsive">
              <div class="form-group-responsive">
                <label class="form-label">性别</label>
                <el-select
                  v-model="form.data.gender"
                  placeholder="请选择性别"
                  class="form-full-width"
                >
                  <el-option
                    label="女性"
                    value="female"
                  />
                  <el-option
                    label="男性"
                    value="male"
                  />
                  <el-option
                    label="秀吉（伪娘、正太）"
                    value="秀吉（伪娘、正太）"
                  />
                  <el-option
                    label="武装直升机"
                    value="helicopter"
                  />
                  <el-option
                    label="牢大"
                    value="Prison_big"
                  />
                  <el-option
                    label="永雏塔菲"
                    value="tiffany"
                  />
                  <el-option
                    label="赛马娘"
                    value="horse"
                  />
                  <el-option
                    label="沃尔玛购物袋"
                    value="walmartShopingBag"
                  />
                  <el-option
                    label="其他(自定义)"
                    value="other"
                  />
                </el-select>
                <el-input
                  v-if="form.data.gender === 'other'"
                  v-model="form.data.customGender"
                  placeholder="请输入角色的性别（other）"
                  style="margin-top: 10px"
                />
              </div>
              <div class="form-group-responsive">
                <label class="form-label">年龄</label>
                <el-input-number
                  v-model="form.data.age"
                  controls-position="right"
                  :min="-Infinity"
                  :max="Infinity"
                  :precision="0"
                  class="form-full-width"
                />
                <p class="form-help-text">限制为数字，请勿输入其他字段</p>
              </div>
            </div>
            <div>
              <label class="form-label">身份</label>
              <el-input
                v-model="form.data.identity"
                type="textarea"
                :rows="5"
                placeholder="请输入身份 · 一行一条"
              />
            </div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="form-section-title">
            <Icon
              icon="ph:book-open-duotone"
              class="form-section-icon"
            />
            背景故事
          </h3>
          <div class="form-section-content">
            <div>
              <label class="form-label">背景故事</label>
              <el-input
                v-model="form.data.background"
                type="textarea"
                :rows="6"
                placeholder="请输入背景故事（每行一条）"
              />
            </div>
            <div style="margin-top: 1rem">
              <div
                class="title-Btn"
                style="display: flex; align-items: center; justify-content: space-between"
              >
                <label class="form-label">MBTI性格</label>
                <el-button
                  type="primary"
                  @click="validateMBTI"
                >
                  <Icon
                    icon="material-symbols:question-exchange"
                    width="18"
                    height="18"
                    style="margin-right: 4px"
                  />
                  验证
                </el-button>
              </div>
              <p class="form-help-text">必须是有效的MBTI数值或者是 none</p>
              <el-input
                v-model="form.data.mbti"
                placeholder="请输入MBTI性格"
              />
            </div>
          </div>
        </section>

        <el-tabs
          v-model="activeTab"
          class="settings-tabs"
        >
          <el-tab-pane
            label="外观与服装"
            name="appearance"
          >
            <AppearanceAndAttireTab
              :form="form.data"
              @addAttire="addAttire"
              @removeAttire="removeAttire"
              @exportAppearance="exportAppearance"
              @exportAttires="exportAttires"
              v-model:attires="form.data.attires"
            />
          </el-tab-pane>
          <el-tab-pane
            label="角色特质"
            name="traits"
          >
            <TraitsTab
              :form="form.data"
              @addTrait="addTrait"
              @removeTrait="removeTrait"
              @exportTraits="exportTraits"
              v-model:traits="form.data.traits"
              @addRelationship="addRelationship"
              @removeRelationship="removeRelationship"
              @exportRelationships="exportRelationships"
              v-model:relationships="form.data.relationships"
              @addSkill="addSkill"
              @removeSkill="removeSkill"
              @exportSkills="exportSkills"
              v-model:skills="form.data.skills"
            />
          </el-tab-pane>
          <el-tab-pane
            label="日常与笔记"
            name="notes"
          >
            <DailyAndNotesTab
              :form="form.data"
              @update:form-likes="form.data.likes = $event"
              @update:form-dislikes="form.data.dislikes = $event"
              @update:notes="form.data.notes = $event"
            />
          </el-tab-pane>
        </el-tabs>
      </el-form>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import {
  ElButton,
  ElForm,
  ElInput,
  ElInputNumber,
  ElMessageBox,
  ElOption,
  ElScrollbar,
  ElSelect,
  ElTabPane,
  ElTabs,
} from 'element-plus';
import { nextTick, ref, watch } from 'vue';
import { useCardDataHandler } from '../composables/characterInfo/useCardDataHandler';
import { useCardSections } from '../composables/characterInfo/useCardSections';
import { useCharacterCardLifecycle } from '../composables/characterInfo/useCharacterCardLifecycle';
import type { CharacterCard } from '../types/character';
import CharacterCardButtons from './charcard/CharacterCardButtons.vue';
import AppearanceAndAttireTab from './charcard/tabs/AppearanceAndAttireTab.vue';
import DailyAndNotesTab from './charcard/tabs/DailyAndNotesTab.vue';
import TraitsTab from './charcard/tabs/TraitsTab.vue';

const props = defineProps<{
  character: CharacterCard;
}>();

const emit = defineEmits<{
  (e: 'update:character', character: CharacterCard): void;
}>();

const activeTab = ref('appearance');
const cloneCharacter = (character: CharacterCard): CharacterCard => JSON.parse(JSON.stringify(character));
const form = ref(cloneCharacter(props.character));
let isUpdatingFromProps = false;

const syncFormFromProps = (character: CharacterCard) => {
  isUpdatingFromProps = true;
  form.value = cloneCharacter(character);
  nextTick(() => {
    isUpdatingFromProps = false;
  });
};

const normalizeMeta = (updatedCharacter: CharacterCard) => {
  const fallbackMeta = props.character?.meta ?? {};
  const nextMeta = {
    ...(updatedCharacter.meta || {}),
    id: updatedCharacter.meta?.id ?? fallbackMeta.id,
    order: updatedCharacter.meta?.order ?? fallbackMeta.order,
    starred:
      typeof updatedCharacter.meta?.starred === 'boolean' ? updatedCharacter.meta.starred : (fallbackMeta.starred ?? false),
    projectId: updatedCharacter.meta?.projectId ?? fallbackMeta.projectId,
  };

  const metaChanged =
    updatedCharacter.meta?.id !== nextMeta.id ||
    updatedCharacter.meta?.order !== nextMeta.order ||
    updatedCharacter.meta?.starred !== nextMeta.starred ||
    updatedCharacter.meta?.projectId !== nextMeta.projectId;

  if (metaChanged) {
    updatedCharacter.meta = nextMeta;
  }
  return metaChanged;
};

watch(
  () => props.character,
  (newCharacter) => {
    if (!newCharacter) return;
    if (JSON.stringify(form.value) === JSON.stringify(newCharacter)) return;
    syncFormFromProps(newCharacter);
  },
  { deep: true, immediate: true }
);

watch(
  form,
  (updatedCharacter) => {
    if (isUpdatingFromProps) return;
    if (normalizeMeta(updatedCharacter)) return;
    emit('update:character', cloneCharacter(updatedCharacter));
  },
  { deep: true }
);

const { saveCharacterCard, loadCharacterCard, resetForm, copyToClipboard, importFromClipboard, processLoadedData } =
  useCardDataHandler(form);

const {
  exportBasicInfo,
  addTrait,
  removeTrait,
  addSkill,
  removeSkill,
  addRelationship,
  removeRelationship,
  addAttire,
  removeAttire,
  exportAppearance,
  exportAttires,
  exportSkills,
  exportTraits,
  exportRelationships,
} = useCardSections(form);

useCharacterCardLifecycle(form, processLoadedData);

const isValidMBTI = (mbti: string) => {
  return mbti.toLowerCase() === 'none' || /^[EI][SN][TF][JP]$/i.test(mbti);
};

interface MBTIDescriptions {
  [key: string]: string;
}

const mbtiDescriptions: MBTIDescriptions = {
  INTP: '逻辑学家',
  INTJ: '建筑师',
  ENTP: '辩论家',
  ENTJ: '指挥官',
  INFP: '调停者',
  INFJ: '提倡者',
  ENFJ: '主人公',
  ENFP: '竞选者',
  ISTJ: '物流师',
  ISFJ: '守卫者',
  ESTJ: '总经理',
  ESFJ: '执政官',
  ISTP: '鉴赏家',
  ISFP: '探险家',
  ESTP: '企业家',
  ESFP: '表演者',
  none: '未指定',
};

const validateMBTI = () => {
  if (!form.value.data.mbti) {
    ElMessageBox.alert('请输入MBTI类型', '警告');
    return;
  }
  const type = form.value.data.mbti.toUpperCase();
  if (isValidMBTI(form.value.data.mbti)) {
    const description = mbtiDescriptions[type] || mbtiDescriptions['none'];
    ElMessageBox.alert(`MBTI格式正确，类型：${type} - ${description}`, '正确');
  } else {
    ElMessageBox.alert(`MBTI格式无效：${type}，请输入4个字母的组合或"none"`, '不合规');
  }
};

defineExpose({
  exportBasicInfo,
  saveCharacterCard,
  loadCharacterCard,
  resetForm,
  addAttire,
  removeAttire,
  exportAppearance,
  exportAttires,
  copyToClipboard,
  importFromClipboard,
  exportSkills,
  exportTraits,
  exportRelationships,
});
</script>

<style scoped>
.character-card-editor-scrollbar {
  height: 100vh;
}

.content-panel-body {
  background: var(--el-bg-color);
  border-radius: 4px;
  padding: 12px;
}

.character-card-editor-form .form-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--el-fill-color-extra-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-extra-light);
}

.character-card-editor-form .form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.title-Btn-add {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.title-fixed {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.character-card-editor-form .form-section-icon {
  font-size: 18px;
  color: #409eff;
}

.character-card-editor-form .form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  display: block;
}

.form-row-responsive {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 768px) {
  .form-row-responsive {
    flex-direction: row;
    gap: 24px;
  }
}

.form-group-responsive {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.form-full-width {
  width: 100%;
}

.form-help-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin: 4px 0 0 0;
  line-height: 1.4;
}

.settings-tabs {
  margin-top: 20px;
}

:deep(.el-tabs__header) {
  margin: 0 0 20px;
}

:deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
  padding: 0 16px;
}

:deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
  font-weight: 600;
}

:deep(.el-tabs__active-bar) {
  background-color: var(--el-color-primary);
}

:deep(.el-tabs__content) {
  padding-top: 0;
}
</style>
