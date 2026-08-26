<template>
  <el-scrollbar class="character-card-editor-scrollbar">
    <div class="content-panel-body">
      <CharacterCardButtons :characterName="form.data.chineseName" @saveCharacterCard="saveCharacterCard"
        @loadCharacterCard="loadCharacterCard" @resetForm="resetForm" @copyToClipboard="copyToClipboard"
        @importFromClipboard="(data) => importFromClipboard(data)" />
      <el-form :model="form.data" label-position="top" ref="characterFormRef" class="character-card-editor-form">
        <section class="form-section">
          <div class="title-Btn-add form-section-title">
            <h3 class="title-fixed">
              <Icon icon="ph:info-duotone" class="form-section-icon" />
              基本信息
            </h3>
            <div style="display: flex; gap: 8px; margin-left: 16px">
              <el-button type="success" @click="exportBasicInfo" title="导出基本信息">
                <Icon icon="material-symbols:content-copy-outline" width="18" height="18" />
              </el-button>
            </div>
          </div>
          <div class="form-section-content">
            <div class="form-row-responsive">
              <div class="form-group-responsive">
                <label class="form-label">中文名</label>
                <div class="name-input-row">
                  <el-input v-model="form.data.chineseName" placeholder="请输入中文名" />
                  <el-popover placement="bottom" title="随机生成角色名称" :width="300" trigger="click">
                    <template #reference>
                      <el-button plain title="随机生成角色名称">
                        <Icon icon="ph:dice-five-duotone" width="20" height="20" />
                      </el-button>
                    </template>
                    <div v-if="isPresetListLoading" class="name-preset-state">
                      正在加载名称预设…
                    </div>
                    <div v-else-if="presetListError" class="name-preset-state">
                      <span>名称预设加载失败</span>
                      <el-button size="small" type="primary" plain @click="handleLoadNamePresets">重试</el-button>
                    </div>
                    <div v-else-if="namePresets.length === 0" class="name-preset-state">
                      暂无可用的名称预设
                    </div>
                    <div v-else class="name-preset-actions">
                      <div class="name-preset-gender">
                        <span>名称性别</span>
                        <el-radio-group v-model="nameRollGender" size="small">
                          <el-radio-button value="auto">跟随角色</el-radio-button>
                          <el-radio-button value="male">男性</el-radio-button>
                          <el-radio-button value="female">女性</el-radio-button>
                          <el-radio-button value="random">随机</el-radio-button>
                        </el-radio-group>
                      </div>
                      <el-button v-for="preset in namePresets" :key="preset.url" size="small" style="margin: 0"
                        :disabled="rollingPresetLabel !== null" :loading="rollingPresetLabel === preset.label"
                        @click="handleRollName(preset)">
                        {{ preset.label }}
                      </el-button>
                    </div>
                  </el-popover>
                  <el-button plain title="管理名称预设" @click="isPresetSettingsVisible = true">
                    <Icon icon="ph:gear-duotone" width="20" height="20" />
                  </el-button>
                </div>
              </div>
            </div>
            <div class="form-row-responsive">
              <div class="form-group-responsive">
                <label class="form-label">性别</label>
                <el-select v-model="form.data.gender" placeholder="请选择性别" class="form-full-width">
                  <el-option label="女性" value="female" />
                  <el-option label="男性" value="male" />
                  <el-option label="秀吉（伪娘、正太）" value="秀吉（伪娘、正太）" />
                  <el-option label="武装直升机" value="helicopter" />
                  <el-option label="牢大" value="Prison_big" />
                  <el-option label="永雏塔菲" value="tiffany" />
                  <el-option label="赛马娘" value="horse" />
                  <el-option label="沃尔玛购物袋" value="walmartShopingBag" />
                  <el-option label="其他(自定义)" value="other" />
                </el-select>
                <el-input v-if="form.data.gender === 'other'" v-model="form.data.customGender"
                  placeholder="请输入角色的性别（other）" style="margin-top: 10px" />
              </div>
              <div class="form-group-responsive">
                <label class="form-label">年龄</label>
                <div style="display: flex; gap: 8px; align-items: center">
                  <el-input-number v-model="form.data.age" controls-position="right" :min="-Infinity" :max="Infinity"
                    :precision="0" class="form-full-width" style="flex: 1" />
                  <el-popover placement="bottom" title="随机生成年龄" :width="200" trigger="click">
                    <template #reference>
                      <el-button plain title="随机生成年龄">
                        <Icon icon="ph:dice-five-duotone" width="20" height="20" />
                      </el-button>
                    </template>
                    <div style="display: flex; flex-direction: column; gap: 8px">
                      <el-button size="small" style="margin: 0" @click="rollAge(8, 12)">幼年 (8-12)</el-button>
                      <el-button size="small" style="margin: 0" @click="rollAge(13, 17)">少年 (13-17)</el-button>
                      <el-button size="small" style="margin: 0" @click="rollAge(18, 35)">青年 (18-35)</el-button>
                      <el-button size="small" style="margin: 0" @click="rollAge(36, 55)">中年 (36-55)</el-button>
                      <el-button size="small" style="margin: 0" @click="rollAge(56, 100)">老年 (56-100)</el-button>
                      <el-button size="small" style="margin: 0" @click="rollAge(100, 1000)">长生种 (100-1000)</el-button>
                      <div style="
                          font-size: 12px;
                          color: var(--el-text-color-secondary);
                          margin-top: 4px;
                        ">
                        自定义范围：
                      </div>
                      <div style="display: flex; gap: 4px; align-items: center">
                        <el-input-number v-model="customAgeMin" size="small" :controls="false" placeholder="最小"
                          style="width: 100%" />
                        <span>-</span>
                        <el-input-number v-model="customAgeMax" size="small" :controls="false" placeholder="最大"
                          style="width: 100%" />
                        <el-button size="small" type="primary" plain style="margin: 0" @click="rollCustomAge">
                          <Icon icon="ph:dice-five-duotone" width="16" height="16" />
                        </el-button>
                      </div>
                    </div>
                  </el-popover>
                </div>
                <p class="form-help-text">限制为数字，请勿输入其他字段</p>
              </div>
              <div class="form-group-responsive">
                <label class="form-label">身高</label>
                <el-input v-model="form.data.appearance.height" placeholder="请输入身高特征" />
              </div>
            </div>
            <div>
              <label class="form-label">身份</label>
              <el-input v-model="form.data.identity" type="textarea" :rows="5" placeholder="请输入身份 · 一行一条" />
            </div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="form-section-title">
            <Icon icon="ph:book-open-duotone" class="form-section-icon" />
            背景故事
          </h3>
          <div class="form-section-content">
            <div>
              <label class="form-label">背景故事</label>
              <el-input v-model="form.data.background" type="textarea" :rows="6" placeholder="请输入背景故事（每行一条）" />
            </div>
            <div style="margin-top: 1rem">
              <div class="title-Btn" style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                ">
                <label class="form-label">MBTI性格</label>
                <el-button type="primary" @click="validateMBTI">
                  <Icon icon="material-symbols:question-exchange" width="18" height="18" style="margin-right: 4px" />
                  验证
                </el-button>
              </div>
              <p class="form-help-text">必须是有效的MBTI数值或者是 none</p>
              <el-autocomplete v-model="form.data.mbti" :fetch-suggestions="querySearchMBTI" placeholder="请输入或选择MBTI性格"
                class="form-full-width" clearable>
                <template #default="{ item }">
                  <div style="
                      display: flex;
                      flex-direction: column;
                      padding: 4px 0;
                      line-height: 1.4;
                    ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                      ">
                      <span style="font-weight: bold">{{ item.value }}</span>
                      <span style="color: var(--el-color-primary); font-size: 13px">{{ item.desc }}</span>
                    </div>
                    <span style="
                        color: var(--el-text-color-secondary);
                        font-size: 12px;
                        margin-top: 2px;
                        white-space: normal;
                        word-break: break-all;
                      ">
                      {{ item.detail }}
                    </span>
                  </div>
                </template>
              </el-autocomplete>
            </div>
          </div>
        </section>

        <el-tabs v-model="activeTab" class="settings-tabs">
          <el-tab-pane label="外观与服装" name="appearance">
            <AppearanceAndAttireTab :form="form.data" @addAttire="addAttire" @removeAttire="removeAttire"
              @exportAppearance="exportAppearance" @exportAttires="exportAttires" v-model:attires="form.data.attires" />
          </el-tab-pane>
          <el-tab-pane label="角色特质" name="traits">
            <TraitsTab :form="form.data" @addTrait="addTrait" @removeTrait="removeTrait" @exportTraits="exportTraits"
              v-model:traits="form.data.traits" @addRelationship="addRelationship"
              @removeRelationship="removeRelationship" @exportRelationships="exportRelationships"
              v-model:relationships="form.data.relationships" @addSkill="addSkill" @removeSkill="removeSkill"
              @exportSkills="exportSkills" v-model:skills="form.data.skills" />
          </el-tab-pane>
          <el-tab-pane label="日常与笔记" name="notes">
            <DailyAndNotesTab :form="form.data" @update:form-likes="form.data.likes = $event"
              @update:form-dislikes="form.data.dislikes = $event" @update:notes="form.data.notes = $event" />
          </el-tab-pane>
        </el-tabs>
      </el-form>
    </div>
  </el-scrollbar>

  <el-drawer v-model="isPresetSettingsVisible" title="名称预设管理" size="400px" append-to-body>
    <div style="display: flex; flex-direction: column; gap: 20px; padding: 0 16px">
      <el-button type="success" @click="handleSavePresetSettings" style="width: 100%">保存并重新加载</el-button>
      <el-alert title="免责声明与贡献指南" type="warning" show-icon :closable="false">
        <template #default>
          <div style="margin-top: 4px">
            随机名称仅供创作参考，可能与现实人物或已有作品角色重名，请自行核对。
          </div>
          <el-link type="primary" href="https://jiuci.top/wiki/cardplus/pr_new_namelist/" target="_blank"
            style="font-size: 12px; margin-top: 8px">
            如何贡献名称预设数据？
          </el-link>
        </template>
      </el-alert>

      <div>
        <div style="font-weight: bold; margin-bottom: 8px">注册表 URLs</div>
        <div style="
            font-size: 12px;
            color: var(--el-text-color-secondary);
            margin-bottom: 8px;
          ">
          提供包含多个名称预设的 JSON 列表文件地址。
        </div>
        <div v-for="(_, idx) in namePresetSettings.registries" :key="'reg-' + idx"
          style="display: flex; gap: 8px; margin-bottom: 8px">
          <el-input v-model="namePresetSettings.registries[idx]" placeholder="输入 URL" />
          <el-button type="danger" plain @click="namePresetSettings.registries.splice(idx, 1)">
            <Icon icon="ph:trash-duotone" />
          </el-button>
        </div>
        <el-button type="primary" plain size="small" @click="namePresetSettings.registries.push('')">添加注册表
          URL</el-button>
      </div>

      <el-divider style="margin: 0" />

      <div>
        <div style="font-weight: bold; margin-bottom: 8px">手动添加的预设</div>
        <div style="
            font-size: 12px;
            color: var(--el-text-color-secondary);
            margin-bottom: 8px;
          ">
          直接添加单个名称预设 JSON 文件的地址。
        </div>
        <div v-for="(preset, idx) in namePresetSettings.manualPresets" :key="'man-' + idx" style="
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 12px;
            border: 1px solid var(--el-border-color);
            padding: 8px;
            border-radius: 4px;
          ">
          <el-input v-model="preset.label" placeholder="预设名称（例如：科幻风格）" size="small" />
          <el-input v-model="preset.url" placeholder="JSON 文件 URL" size="small" />
          <el-button type="danger" plain size="small" style="align-self: flex-end"
            @click="namePresetSettings.manualPresets.splice(idx, 1)">删除</el-button>
        </div>
        <el-button type="primary" plain size="small"
          @click="namePresetSettings.manualPresets.push({ label: '', url: '' })">添加单个预设</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  ElButton,
  ElForm,
  ElInput,
  ElInputNumber,
  ElLink,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPopover,
  ElRadioButton,
  ElRadioGroup,
  ElScrollbar,
  ElSelect,
  ElTabPane,
  ElTabs,
} from "element-plus";
import { nextTick, onMounted, ref, watch } from "vue";
import { useCardDataHandler } from "../composables/characterInfo/useCardDataHandler";
import { useCardSections } from "../composables/characterInfo/useCardSections";
import { useCharacterCardLifecycle } from "../composables/characterInfo/useCharacterCardLifecycle";
import {
  CharacterNamePresetLoadError,
  useCharacterNamePresets,
} from "@/composables/characterInfo/useCharacterNamePresets";
import type { CharacterCard } from "@/types/character/character";
import type { CharacterNamePreset } from "@/composables/characterInfo/characterNamePresets";
import CharacterCardButtons from "./charcard/CharacterCardButtons.vue";
import AppearanceAndAttireTab from "./charcard/tabs/AppearanceAndAttireTab.vue";
import DailyAndNotesTab from "./charcard/tabs/DailyAndNotesTab.vue";
import TraitsTab from "./charcard/tabs/TraitsTab.vue";

const props = defineProps<{
  character: CharacterCard;
}>();

const emit = defineEmits<{
  (e: "update:character", character: CharacterCard): void;
}>();

const activeTab = ref("appearance");
const cloneCharacter = (character: CharacterCard): CharacterCard =>
  JSON.parse(JSON.stringify(character));
const form = ref(cloneCharacter(props.character));
type NameRollGender = "auto" | "male" | "female" | "random";
const nameRollGender = ref<NameRollGender>("auto");
const customAgeMin = ref<number | undefined>(undefined);
const customAgeMax = ref<number | undefined>(undefined);
const {
  presets: namePresets,
  isPresetListLoading,
  presetListError,
  rollingPresetLabel,
  settings: namePresetSettings,
  loadPresetList,
  rollFromPreset,
} = useCharacterNamePresets();

const isPresetSettingsVisible = ref(false);
const handleSavePresetSettings = async () => {
  // 过滤掉空的项
  namePresetSettings.value.registries =
    namePresetSettings.value.registries.filter((url) => url.trim() !== "");
  namePresetSettings.value.manualPresets =
    namePresetSettings.value.manualPresets.filter(
      (p) => p.label.trim() !== "" && p.url.trim() !== "",
    );
  await loadPresetList();
  isPresetSettingsVisible.value = false;
};

const namePresetErrorMessage = (error: unknown): string => {
  if (!(error instanceof CharacterNamePresetLoadError))
    return "名称预设操作失败";

  switch (error.code) {
    case "list_fetch_failed":
      return "名称预设列表加载失败，请重试";
    case "table_fetch_failed":
      return "名称表加载失败，请重试";
    case "invalid_table":
      return "名称表格式无效";
    case "roll_in_progress":
      return "正在生成名称，请稍候";
    case "no_available_names":
      return "该预设的可用名称均已被加入黑名单";
  }
};

const handleLoadNamePresets = async (): Promise<void> => {
  try {
    await loadPresetList();
  } catch (error) {
    ElMessage.error(namePresetErrorMessage(error));
  }
};

const handleRollName = async (preset: CharacterNamePreset): Promise<void> => {
  try {
    const gender =
      nameRollGender.value === "auto"
        ? form.value.data.gender
        : nameRollGender.value;
    form.value.data.chineseName = await rollFromPreset(preset, gender);
  } catch (error) {
    ElMessage.error(namePresetErrorMessage(error));
  }
};

onMounted(() => {
  void handleLoadNamePresets();
});

const rollCustomAge = () => {
  const min = customAgeMin.value ?? 0;
  const max = customAgeMax.value ?? 100;
  if (min > max) {
    ElMessage.warning("最小值不能大于最大值");
    return;
  }
  rollAge(min, max);
};

const rollAge = (min: number, max: number) => {
  form.value.data.age = Math.floor(Math.random() * (max - min + 1)) + min;
};
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
      typeof updatedCharacter.meta?.starred === "boolean"
        ? updatedCharacter.meta.starred
        : (fallbackMeta.starred ?? false),
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
  { deep: true, immediate: true },
);

watch(
  form,
  (updatedCharacter) => {
    if (isUpdatingFromProps) return;
    if (normalizeMeta(updatedCharacter)) return;
    emit("update:character", cloneCharacter(updatedCharacter));
  },
  { deep: true },
);

const {
  saveCharacterCard,
  loadCharacterCard,
  resetForm,
  copyToClipboard,
  importFromClipboard,
  processLoadedData,
} = useCardDataHandler(form);

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
  return mbti.toLowerCase() === "none" || /^[EI][SN][TF][JP]$/i.test(mbti);
};

interface MBTIDescriptions {
  [key: string]: string;
}

const mbtiDescriptions: MBTIDescriptions = {
  INTP: "逻辑学家",
  INTJ: "建筑师",
  ENTP: "辩论家",
  ENTJ: "指挥官",
  INFP: "调停者",
  INFJ: "提倡者",
  ENFJ: "主人公",
  ENFP: "竞选者",
  ISTJ: "物流师",
  ISFJ: "守卫者",
  ESTJ: "总经理",
  ESFJ: "执政官",
  ISTP: "鉴赏家",
  ISFP: "探险家",
  ESTP: "企业家",
  ESFP: "表演者",
  none: "未指定",
};

const mbtiDetails: Record<string, string> = {
  INTP: "富有创造力的发明家，对知识有着永不满足的渴望。",
  INTJ: "富有想象力和战略性的思考者，一切皆在计划之中。",
  ENTP: "聪明好奇的思考者，热衷于智力上的挑战。",
  ENTJ: "大胆、富有想象力且意志强大的领导者，总能找到解决方法。",
  INFP: "诗意、善良、利他，总是致力于帮助正当事业。",
  INFJ: "安静而神秘，同时鼓舞人心且不知疲倦的理想主义者。",
  ENFJ: "富有魅力、鼓舞人心的领导者，能够让听众为之倾倒。",
  ENFP: "热情、有创造力且爱好社交的自由精神者，总能找到理由微笑。",
  ISTJ: "注重实用和逻辑，事实大于一切，可靠性毋庸置疑。",
  ISFJ: "非常专注和温暖的守护者，时刻准备着保护爱的人。",
  ESTJ: "出色的管理者，在管理事物或人方面无与伦比。",
  ESFJ: "极度关心他人、喜欢社交，总是乐于助人。",
  ISTP: "大胆而实际的实验者，精通各种工具的使用。",
  ISFP: "灵活且有魅力的艺术家，随时准备探索和体验新事物。",
  ESTP: "聪明、精力充沛的感知者，非常享受充满冒险的生活。",
  ESFP: "自发的、充满活力的热心人，生活在他们周围绝不会无聊。",
  none: "暂不指定或不适用 MBTI 性格类型。",
};

const mbtiOptions = Object.entries(mbtiDescriptions).map(([type, desc]) => ({
  value: type,
  desc,
  detail: mbtiDetails[type],
}));

const querySearchMBTI = (queryString: string, cb: (arg: any) => void) => {
  const results = queryString
    ? mbtiOptions.filter(
      (item) =>
        item.value.toLowerCase().includes(queryString.toLowerCase()) ||
        item.desc.includes(queryString),
    )
    : mbtiOptions;
  cb(results);
};

const validateMBTI = () => {
  if (!form.value.data.mbti) {
    ElMessageBox.alert("请输入MBTI类型", "警告");
    return;
  }
  const type = form.value.data.mbti.toUpperCase();
  if (isValidMBTI(form.value.data.mbti)) {
    const description = mbtiDescriptions[type] || mbtiDescriptions["none"];
    ElMessageBox.alert(`MBTI格式正确，类型：${type} - ${description}`, "正确");
  } else {
    ElMessageBox.alert(
      `MBTI格式无效：${type}，请输入4个字母的组合或"none"`,
      "不合规",
    );
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

.name-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-preset-actions,
.name-preset-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name-preset-gender {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.name-preset-gender :deep(.el-radio-group) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.name-preset-gender :deep(.el-radio-button__inner) {
  width: 100%;
}

.name-preset-state {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.name-preset-warning {
  padding: 8px 10px;
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: var(--el-border-radius-base);
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
  font-size: 12px;
  line-height: 1.5;
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
