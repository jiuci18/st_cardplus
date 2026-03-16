<template>
  <div class="editor-panel">
    <div class="panel-header">
      <h3>{{ panelTitle }}</h3>
      <div class="header-actions">
        <el-button :icon="CopyDocument" size="small" @click="$emit('add-clipboard')" :disabled="!selectedPrompt">
          加入剪贴板
        </el-button>
        <div v-if="activePreset" class="save-button-group">
          <el-button type="primary" size="small" @click="$emit('save')">
            保存
          </el-button>
          <el-tooltip :content="getTooltipText()" placement="bottom" :show-arrow="false" :offset="8" :hide-after="0">
            <div class="save-status-badge" :class="getBadgeClass()" @click="$emit('toggle-mode')">
              <Icon v-if="saveStatus === 'saving'" icon="eos-icons:loading" class="badge-icon spinning" />
              <Icon v-else-if="saveStatus === 'saved'" icon="ph:check-circle-fill" class="badge-icon" />
              <Icon v-else-if="saveStatus === 'error'" icon="ph:warning-circle-fill" class="badge-icon" />
              <Icon v-else :icon="getModeIcon()" class="badge-icon" />
              <span class="badge-text">{{ getBadgeText() }}</span>
            </div>
          </el-tooltip>
        </div>
      </div>
    </div>
    <div v-if="!activePreset" class="empty-state">
      <el-empty description="请先选择一个预设" :image-size="160" />
    </div>
    <el-scrollbar v-else class="panel-scroll editor-content">
      <el-tabs v-model="localActiveTab" :before-leave="handleBeforeTabLeave">
        <el-tab-pane label="头部设置" name="header">
          <el-form label-position="top">
            <el-form-item label="预设名称">
              <el-input v-model="localEditorState.presetName" placeholder="请输入预设名称" />
            </el-form-item>
            <el-divider content-position="left">生成参数</el-divider>
            <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2 xl:grid-cols-3">
              <el-form-item label="上下文长度（以词符数计）">
                <el-input-number v-model="localEditorState.headerForm.openai_max_context" :min="1"
                  controls-position="right" />
              </el-form-item>
              <el-form-item label="最大回复长度（以词符数计）">
                <el-input-number v-model="localEditorState.headerForm.openai_max_tokens" :min="1"
                  controls-position="right" />
              </el-form-item>
              <el-form-item label="每次生成多个备选回复">
                <el-input-number v-model="localEditorState.headerForm.n" :min="1" controls-position="right" />
              </el-form-item>
              <el-form-item label="种子">
                <el-input-number v-model="localEditorState.headerForm.seed" controls-position="right" />
              </el-form-item>
            </div>

            <el-divider content-position="left">高级（别动，不懂的话）</el-divider>
            <div class="advanced-single">
              <el-form-item label="温度（0 ~ 2）">
                <el-slider v-model="localEditorState.headerForm.temperature" :min="0" :max="2" :step="0.01"
                  :show-input="true" />
              </el-form-item>
              <el-form-item label="频率惩罚（-2 ~ 2）">
                <el-slider v-model="localEditorState.headerForm.frequency_penalty" :min="-2" :max="2" :step="0.01"
                  :show-input="true" />
              </el-form-item>
              <el-form-item label="存在惩罚（-2 ~ 2）">
                <el-slider v-model="localEditorState.headerForm.presence_penalty" :min="-2" :max="2" :step="0.01"
                  :show-input="true" />
              </el-form-item>
              <el-form-item label="Top P（0 ~ 1）">
                <el-slider v-model="localEditorState.headerForm.top_p" :min="0" :max="1" :step="0.01"
                  :show-input="true" />
              </el-form-item>
            </div>

            <el-divider content-position="left">角色名称行为</el-divider>
            <el-form-item label="角色名称行为">
              <el-select v-model="localEditorState.headerForm.names_behavior" placeholder="请选择">
                <el-option label="无" :value="-1" />
                <el-option label="默认" :value="0" />
                <el-option label="补全对象" :value="1" />
                <el-option label="消息内容" :value="2" />
              </el-select>
            </el-form-item>

            <el-divider content-position="left">继续与系统消息</el-divider>
            <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
              <el-form-item label="继续后缀">
                <el-select v-model="localEditorState.headerForm.continue_postfix" placeholder="请选择">
                  <el-option label="无" value="" />
                  <el-option label="空格" value=" " />
                  <el-option label="换行" value="\n" />
                  <el-option label="双换行" value="\n\n" />
                </el-select>
              </el-form-item>
              <el-form-item label="继续预填充">
                <el-switch v-model="localEditorState.headerForm.continue_prefill" />
              </el-form-item>
              <el-form-item label="压缩系统消息">
                <el-switch v-model="localEditorState.headerForm.squash_system_messages" />
              </el-form-item>
            </div>

            <el-divider content-position="left">功能与显示</el-divider>
            <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2 xl:grid-cols-3">
              <el-form-item label="启用函数调用">
                <el-switch v-model="localEditorState.headerForm.function_calling" />
              </el-form-item>
              <el-form-item label="Send inline media">
                <el-switch v-model="localEditorState.headerForm.media_inlining" />
              </el-form-item>
              <el-form-item label="图片画质">
                <el-select v-model="localEditorState.headerForm.inline_image_quality" placeholder="请选择">
                  <el-option label="自动" value="auto" />
                  <el-option label="高" value="high" />
                  <el-option label="低" value="low" />
                </el-select>
              </el-form-item>
              <el-form-item label="请求思维链">
                <el-switch v-model="localEditorState.headerForm.show_thoughts" />
              </el-form-item>
              <el-form-item label="推理强度">
                <el-select v-model="localEditorState.headerForm.reasoning_effort" placeholder="请选择">
                  <el-option label="自动" value="auto" />
                  <el-option label="低" value="low" />
                  <el-option label="中" value="medium" />
                  <el-option label="高" value="high" />
                  <el-option label="极低" value="min" />
                  <el-option label="极高" value="max" />
                </el-select>
              </el-form-item>
              <el-form-item label="Verbosity">
                <el-select v-model="localEditorState.headerForm.verbosity" placeholder="请选择">
                  <el-option label="Auto" value="auto" />
                  <el-option label="Low" value="low" />
                  <el-option label="Medium" value="medium" />
                  <el-option label="High" value="high" />
                </el-select>
              </el-form-item>
            </div>

            <el-divider content-position="left">提示词模板</el-divider>
            <el-form-item label="AI帮答提示词">
              <el-input v-model="localEditorState.headerForm.impersonation_prompt" type="textarea" :rows="3" />
            </el-form-item>
            <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
              <el-form-item label="世界信息格式模板">
                <el-input v-model="localEditorState.headerForm.wi_format" />
              </el-form-item>
              <el-form-item label="场景格式模板">
                <el-input v-model="localEditorState.headerForm.scenario_format" />
              </el-form-item>
              <el-form-item label="角色设定格式模板">
                <el-input v-model="localEditorState.headerForm.personality_format" />
              </el-form-item>
              <el-form-item label="群聊推进提示词模板">
                <el-input v-model="localEditorState.headerForm.group_nudge_prompt" />
              </el-form-item>
              <el-form-item label="新聊天">
                <el-input v-model="localEditorState.headerForm.new_chat_prompt" />
              </el-form-item>
              <el-form-item label="新群聊">
                <el-input v-model="localEditorState.headerForm.new_group_chat_prompt" />
              </el-form-item>
              <el-form-item label="新示例聊天">
                <el-input v-model="localEditorState.headerForm.new_example_chat_prompt" />
              </el-form-item>
              <el-form-item label="继续推进">
                <el-input v-model="localEditorState.headerForm.continue_nudge_prompt" />
              </el-form-item>
              <el-form-item label="替换空消息">
                <el-input v-model="localEditorState.headerForm.send_if_empty" />
              </el-form-item>
            </div>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="条目编辑" name="prompt" :disabled="!hasPromptItems">
          <el-form label-position="top">
            <el-alert v-if="lockedTip" :title="lockedTip" type="info" :closable="false" class="mb-2" />
            <el-form-item label="条目名称">
              <div class="prompt-name-row">
                <el-input v-model="localEditorState.promptName" placeholder="请输入条目名称" :disabled="isFullyLocked" />
                <span>|</span>
                <el-switch v-model="localEditorState.promptEnabled" active-text="激活" :disabled="isFullyLocked" />
                <el-tooltip content="也可以在左侧列表双击条目，快速激活/取消激活" placement="top" :show-arrow="false">
                  <button type="button" class="prompt-hint-trigger" aria-label="激活玩法提示" :disabled="isFullyLocked">
                    <Icon icon="ph:info-duotone" />
                  </button>
                </el-tooltip>
              </div>
            </el-form-item>
            <el-form-item label="提示词内容">
              <el-input v-model="localEditorState.promptContent" type="textarea" :rows="10" :readonly="isContentLocked"
                :placeholder="contentPlaceholder" />
            </el-form-item>
            <el-collapse v-model="promptAdvancedPanels">
              <el-collapse-item title="高级选项" name="advanced">
                <el-form-item label="开关">
                  <div class="switch-row">
                    <el-tag type="info">system_prompt: {{ localEditorState.promptSystem ? 'true' : 'false' }}</el-tag>
                    <el-switch v-model="localEditorState.promptMarker" active-text="marker" :disabled="isFullyLocked" />
                  </div>
                </el-form-item>
                <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2 xl:grid-cols-4">
                  <el-form-item label="Role">
                    <el-select v-model="localEditorState.promptRole" placeholder="角色" :disabled="isFullyLocked">
                      <el-option label="系统（system）" value="system" />
                      <el-option label="用户（user）" value="user" />
                      <el-option label="助手（assistant）" value="assistant" />
                    </el-select>
                  </el-form-item>
                  <el-form-item>
                    <template #label>
                      <span class="inline-flex items-center gap-1.5">
                        注入位置
                        <el-tooltip content="injection_position" placement="top" :show-arrow="false">
                          <span
                            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-(--el-fill-color-light) text-(--el-text-color-secondary) text-xs leading-none">
                            ?
                          </span>
                        </el-tooltip>
                      </span>
                    </template>
                    <el-select v-model="extraFields.injection_position" :disabled="isFullyLocked" placeholder="请选择">
                      <el-option :label="'0（相对）'" :value="0" />
                      <el-option :label="'1（聊天中）'" :value="1" />
                    </el-select>
                  </el-form-item>
                  <el-form-item>
                    <template #label>
                      <span class="inline-flex items-center gap-1.5">
                        注入深度
                        <el-tooltip content="injection_depth" placement="top" :show-arrow="false">
                          <span
                            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-(--el-fill-color-light) text-(--el-text-color-secondary) text-xs leading-none">
                            ?
                          </span>
                        </el-tooltip>
                      </span>
                    </template>
                    <el-input-number v-model="extraFields.injection_depth" :min="0"
                      :disabled="isFullyLocked || extraFields.injection_position !== 1" controls-position="right"
                      placeholder="仅在位置为 1 时生效" />
                  </el-form-item>
                  <el-form-item>
                    <template #label>
                      <span class="inline-flex items-center gap-1.5">
                        注入顺序
                        <el-tooltip content="injection_order" placement="top" :show-arrow="false">
                          <span
                            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-(--el-fill-color-light) text-(--el-text-color-secondary) text-xs leading-none">
                            ?
                          </span>
                        </el-tooltip>
                      </span>
                    </template>
                    <el-input-number v-model="extraFields.injection_order" :min="0"
                      :disabled="isFullyLocked || extraFields.injection_position !== 1" controls-position="right"
                      placeholder="仅在位置为 1 时生效" />
                  </el-form-item>
                  <el-form-item>
                    <template #label>
                      <span class="inline-flex items-center gap-1.5">
                        禁止覆盖
                        <el-tooltip content="forbid_overrides" placement="top" :show-arrow="false">
                          <span
                            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-(--el-fill-color-light) text-(--el-text-color-secondary) text-xs leading-none">
                            ?
                          </span>
                        </el-tooltip>
                      </span>
                    </template>
                    <el-switch v-model="extraFields.forbid_overrides" :disabled="isFullyLocked" />
                  </el-form-item>
                  <el-form-item class="col-span-1 md:col-span-2 xl:col-span-4">
                    <template #label>
                      <span class="inline-flex items-center gap-1.5">
                        触发器列表
                        <el-tooltip content="injection_trigger" placement="top" :show-arrow="false">
                          <span
                            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-(--el-fill-color-light) text-(--el-text-color-secondary) text-xs leading-none">
                            ?
                          </span>
                        </el-tooltip>
                      </span>
                    </template>
                    <el-input v-model="injectionTriggerText" type="textarea" :rows="4" placeholder="每行一个触发词"
                      :readonly="isFullyLocked" />
                  </el-form-item>
                </div>
                <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                  <el-form-item label="排序 order">
                    <el-input-number v-model="localEditorState.promptOrder" :min="0" disabled />
                  </el-form-item>
                  <el-form-item label="Identifier">
                    <el-input v-model="localEditorState.promptIdentifier" placeholder="identifier" disabled />
                  </el-form-item>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="正则编辑" name="regex" :disabled="!activePreset">
          <div class="regex-tab-content">
            <div class="regex-tab-toolbar">
              <el-select :model-value="selectedRegexIndex" placeholder="从侧边栏选择或在此切换" clearable style="width: 100%"
                @update:model-value="handleRegexSelect">
                <el-option v-for="(script, index) in regexScripts" :key="script.id || `regex-${index}`"
                  :label="script.scriptName || `正则脚本 ${index + 1}`" :value="index" />
              </el-select>
              <el-button type="primary" plain @click="emit('add-regex')" :disabled="!activePreset">
                新增脚本
              </el-button>
              <el-button type="danger" plain @click="handleRegexDelete" :disabled="selectedRegexIndex === null">
                删除脚本
              </el-button>
            </div>
            <div v-if="regexScripts.length === 0" class="regex-empty">
              <el-empty description="当前预设没有正则脚本">
                <el-button type="primary" @click="emit('add-regex')">
                  创建第一个脚本
                </el-button>
              </el-empty>
            </div>
            <div v-else-if="!selectedRegexScript" class="regex-empty">
              <el-empty description="请在左侧正则文件夹选择一个脚本" :image-size="100" />
            </div>
            <el-form v-else label-position="top" class="regex-form">
              <RegexEditorCore v-model:script-name="selectedRegexScript.scriptName"
                v-model:find-regex="selectedRegexScript.findRegex"
                v-model:replace-string="selectedRegexScript.replaceString" v-model:trim-strings="trimStringsText"
                v-model:substitute-regex="selectedRegexScript.substituteRegex" />
              <el-divider content-position="left">智能生成</el-divider>
              <SmartRegexGenerator v-model:input-text="regexSmartInputText" @regex-generated="handleRegexGenerated" />
              <RegexAdvancedSettings v-model="selectedRegexScript" />
              <el-divider />
              <RegexSimulatorPanel v-model:test-string="regexTestString" v-model:render-html="regexRenderHtml"
                v-model:user-macro-value="regexUserMacro" v-model:char-macro-value="regexCharMacro"
                :simulated-result="regexSimulatedResult" />
            </el-form>
          </div>
        </el-tab-pane>
        <el-tab-pane name="nav-separator" label="|" disabled />
        <el-tab-pane name="nav-prev" label="上一个" :disabled="!canGoPrevious" />
        <el-tab-pane name="nav-separator" label="·" disabled />
        <el-tab-pane name="nav-next" label="下一个" :disabled="!canGoNext" />
      </el-tabs>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { CopyDocument } from '@element-plus/icons-vue';
import { ElScrollbar, ElTooltip } from 'element-plus';
import { Icon } from '@iconify/vue';
import type { StoredPresetFile } from '@/database/db';
import type { PresetPrompt } from '@/composables/preset/usePresetStore';
import RegexAdvancedSettings from '@/components/regex/RegexAdvancedSettings.vue';
import RegexEditorCore from '@/components/regex/RegexEditorCore.vue';
import RegexSimulatorPanel from '@/components/regex/RegexSimulatorPanel.vue';
import SmartRegexGenerator from '@/components/regex/Selector/SmartRegexGenerator.vue';
import { useRegexSimulator } from '@/composables/regex/useRegexSimulator';
import { SUBSTITUTE_FIND_REGEX, type RegexScript, type SillyTavernRegexScript } from '@/composables/regex/types';

export interface PresetEditorState {
  presetName: string;
  headerForm: PresetHeaderForm;
  promptName: string;
  promptIdentifier: string;
  promptRole: 'system' | 'user' | 'assistant';
  promptContent: string;
  promptSystem: boolean;
  promptMarker: boolean;
  promptEnabled: boolean;
  promptOrder: number | null;
  promptExtraJson: string;
  regexSnapshot: string;
}

export interface PresetHeaderForm {
  openai_max_context: number;
  openai_max_tokens: number;
  n: number;
  temperature: number;
  frequency_penalty: number;
  presence_penalty: number;
  top_p: number;
  impersonation_prompt: string;
  wi_format: string;
  scenario_format: string;
  personality_format: string;
  group_nudge_prompt: string;
  new_chat_prompt: string;
  new_group_chat_prompt: string;
  new_example_chat_prompt: string;
  continue_nudge_prompt: string;
  send_if_empty: string;
  seed: number;
  names_behavior: number;
  continue_postfix: string;
  continue_prefill: boolean;
  squash_system_messages: boolean;
  function_calling: boolean;
  media_inlining: boolean;
  inline_image_quality: string;
  show_thoughts: boolean;
  reasoning_effort: string;
  verbosity: string;
}

interface Props {
  activePreset: StoredPresetFile | null;
  selectedPrompt: PresetPrompt | null;
  hasPreviousPreset?: boolean;
  hasNextPreset?: boolean;
  hasPreviousPrompt?: boolean;
  hasNextPrompt?: boolean;
  selectedRegexIndex: number | null;
  activeTab: 'header' | 'prompt' | 'regex';
  editorState: PresetEditorState;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  autoSaveMode?: 'auto' | 'watch' | 'manual';
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:activeTab', value: 'header' | 'prompt' | 'regex'): void;
  (e: 'update:editorState', value: PresetEditorState): void;
  (e: 'open-first-prompt'): void;
  (e: 'select-regex', presetId: string, regexIndex?: number): void;
  (e: 'add-regex'): void;
  (e: 'delete-regex', regexIndex: number): void;
  (e: 'save'): void;
  (e: 'toggle-mode'): void;
  (e: 'add-clipboard'): void;
  (e: 'go-previous'): void;
  (e: 'go-next'): void;
}>();

const getModeIcon = () => {
  switch (props.autoSaveMode) {
    case 'auto':
      return 'ph:clock-countdown-duotone';
    case 'watch':
      return 'ph:eye-duotone';
    case 'manual':
      return 'ph:hand-duotone';
    default:
      return 'ph:eye-duotone';
  }
};

const getBadgeText = () => {
  if (props.saveStatus === 'saving') return '保存中';
  if (props.saveStatus === 'saved') return '已保存';
  if (props.saveStatus === 'error') return '失败';

  switch (props.autoSaveMode) {
    case 'auto':
      return '自动保存';
    case 'watch':
      return '监听中';
    case 'manual':
      return '已禁用';
    default:
      return '监听中';
  }
};

const getBadgeClass = () => {
  if (props.saveStatus && props.saveStatus !== 'idle') {
    return `status-${props.saveStatus}`;
  }

  switch (props.autoSaveMode) {
    case 'auto':
      return 'status-auto';
    case 'watch':
      return 'status-watch';
    case 'manual':
      return 'status-manual';
    default:
      return 'status-watch';
  }
};

const getTooltipText = () => {
  switch (props.autoSaveMode) {
    case 'auto':
      return '点击切换到监听模式';
    case 'watch':
      return '点击切换到手动模式';
    case 'manual':
      return '点击切换到自动保存模式';
    default:
      return '点击切换保存模式';
  }
};

const panelTitle = computed(() => props.activePreset?.name?.trim() || '主要编辑区');

const localActiveTab = computed({
  get: () => props.activeTab,
  set: (value: 'header' | 'prompt' | 'regex') => emit('update:activeTab', value),
});

const localEditorState = computed({
  get: () => props.editorState,
  set: (value: PresetEditorState) => emit('update:editorState', value),
});
const canGoPrevious = computed(() =>
  localActiveTab.value === 'header'
    ? Boolean(props.hasPreviousPreset)
    : localActiveTab.value === 'prompt'
      ? Boolean(props.hasPreviousPrompt)
      : false
);
const canGoNext = computed(() =>
  localActiveTab.value === 'header'
    ? Boolean(props.hasNextPreset)
    : localActiveTab.value === 'prompt'
      ? Boolean(props.hasNextPrompt)
      : false
);
const hasPromptItems = computed(() => {
  if (!props.activePreset) return false;
  const prompts = (props.activePreset.data as Record<string, any>).prompts;
  return Array.isArray(prompts) && prompts.length > 0;
});

const handleBeforeTabLeave = (nextName: string | number) => {
  if (nextName === 'nav-prev') {
    if (canGoPrevious.value) emit('go-previous');
    return false;
  }
  if (nextName === 'nav-next') {
    if (canGoNext.value) emit('go-next');
    return false;
  }
  if (nextName === 'prompt' && !props.selectedPrompt && hasPromptItems.value) {
    emit('open-first-prompt');
    return false;
  }
  if (nextName === 'nav-separator') return false;
  return true;
};

const lockedSourceMap: Record<string, string> = {
  worldInfoBefore: '来自 World Info (↑Char)',
  worldInfoAfter: '来自 World Info (↓Char)',
  personaDescription: '来自 用户描述设定',
  charDescription: '来自 角色描述',
  charPersonality: '来自 角色性格（角色设定摘要）',
  scenario: '来自 Character Scenario',
};

const fullyLockedIdentifiers = new Set(['dialogueExamples', 'chatHistory']);

const identifier = computed(() => props.selectedPrompt?.identifier || localEditorState.value.promptIdentifier);
const lockedTip = computed(() => {
  const id = identifier.value || '';
  if (lockedSourceMap[id]) return lockedSourceMap[id];
  if (fullyLockedIdentifiers.has(id)) return '此条目已锁定，不能编辑';
  return '';
});

const isContentLocked = computed(() => {
  const id = identifier.value || '';
  return Boolean(lockedSourceMap[id] || fullyLockedIdentifiers.has(id));
});

const isFullyLocked = computed(() => {
  const id = identifier.value || '';
  return Boolean(fullyLockedIdentifiers.has(id));
});

const contentPlaceholder = computed(() => {
  const id = identifier.value || '';
  if (lockedSourceMap[id]) return lockedSourceMap[id];
  if (fullyLockedIdentifiers.has(id)) return '此条目已锁定，不支持编辑';
  return '在此编辑提示词内容';
});

const promptAdvancedPanels = ref<string[]>([]);

const extraFields = reactive({
  injection_position: 0,
  injection_depth: 4,
  injection_order: 100,
  forbid_overrides: false,
  injection_trigger: [] as string[],
});

const otherExtraFields = ref<Record<string, any>>({});
const isSyncingExtraFields = ref(false);
const isSyncingExtraJson = ref(false);

const injectionTriggerText = computed({
  get: () => (extraFields.injection_trigger || []).join('\n'),
  set: (value: string) => {
    const items = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    extraFields.injection_trigger = items;
  },
});

const parseExtraJson = (text: string) => {
  if (!text || !text.trim()) return { fields: null, rest: {} as Record<string, any> };
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { fields: null, rest: {} };
    const { injection_position, injection_depth, injection_order, forbid_overrides, injection_trigger, ...rest } =
      parsed as Record<string, any>;
    return {
      fields: {
        injection_position,
        injection_depth,
        injection_order,
        forbid_overrides,
        injection_trigger,
      },
      rest,
    };
  } catch {
    return { fields: null, rest: {} as Record<string, any> };
  }
};

const buildExtraJson = () => {
  const payload: Record<string, any> = {
    ...otherExtraFields.value,
    injection_position: extraFields.injection_position,
    injection_depth: extraFields.injection_depth,
    injection_order: extraFields.injection_order,
    forbid_overrides: extraFields.forbid_overrides,
    injection_trigger: extraFields.injection_trigger,
  };
  return JSON.stringify(payload, null, 2);
};

watch(
  () => localEditorState.value.promptExtraJson,
  (text) => {
    if (isSyncingExtraJson.value) return;
    const { fields, rest } = parseExtraJson(text || '');
    if (!fields) return;
    isSyncingExtraFields.value = true;
    if (typeof fields.injection_position === 'number') extraFields.injection_position = fields.injection_position;
    if (typeof fields.injection_depth === 'number') extraFields.injection_depth = fields.injection_depth;
    if (typeof fields.injection_order === 'number') extraFields.injection_order = fields.injection_order;
    if (typeof fields.forbid_overrides === 'boolean') extraFields.forbid_overrides = fields.forbid_overrides;
    if (Array.isArray(fields.injection_trigger)) {
      extraFields.injection_trigger = fields.injection_trigger.map((item) => String(item));
    }
    otherExtraFields.value = rest || {};
    isSyncingExtraFields.value = false;
  },
  { immediate: true }
);

watch(
  extraFields,
  () => {
    if (isSyncingExtraFields.value) return;
    isSyncingExtraJson.value = true;
    localEditorState.value = {
      ...localEditorState.value,
      promptExtraJson: buildExtraJson(),
    };
    isSyncingExtraJson.value = false;
  },
  { deep: true }
);

const regexScripts = computed<SillyTavernRegexScript[]>(() => {
  if (!props.activePreset) return [];
  return (props.activePreset.data.extensions as Record<string, any>).regex_scripts as SillyTavernRegexScript[];
});

const selectedRegexScript = computed<SillyTavernRegexScript | null>(() => {
  if (props.selectedRegexIndex === null || props.selectedRegexIndex < 0) return null;
  return regexScripts.value[props.selectedRegexIndex] || null;
});

const trimStringsText = computed({
  get: () => (selectedRegexScript.value?.trimStrings || []).join('\n'),
  set: (value: string) => {
    if (!selectedRegexScript.value) return;
    selectedRegexScript.value.trimStrings = value
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  },
});

const handleRegexSelect = (value: number | null | undefined) => {
  if (!props.activePreset) return;
  emit('select-regex', props.activePreset.id, typeof value === 'number' ? value : undefined);
};

const handleRegexDelete = () => {
  if (props.selectedRegexIndex === null) return;
  emit('delete-regex', props.selectedRegexIndex);
};

const regexRenderHtml = ref(false);
const regexUserMacro = ref('用户');
const regexCharMacro = ref('角色');
const regexSmartInputText = ref('');

const regexSimulatorScript = computed<RegexScript>(() => ({
  findRegex: selectedRegexScript.value?.findRegex || '',
  replaceString: selectedRegexScript.value?.replaceString || '',
  trimStrings: selectedRegexScript.value?.trimStrings || [],
  macros: {
    '{{user}}': regexUserMacro.value,
    '{{char}}': regexCharMacro.value,
  },
  substituteRegex: selectedRegexScript.value?.substituteRegex ?? SUBSTITUTE_FIND_REGEX.NONE,
}));

const { testString: regexTestString, simulatedResult: regexSimulatedResult } = useRegexSimulator(regexSimulatorScript);

const handleRegexGenerated = ({ regex, replaceString }: { regex: string; replaceString: string }) => {
  if (!selectedRegexScript.value) return;
  selectedRegexScript.value.findRegex = regex;
  selectedRegexScript.value.replaceString = replaceString;
  regexTestString.value = regexSmartInputText.value;
};
</script>

<style scoped>
.save-button-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.save-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  user-select: none;
}

.save-status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.save-status-badge:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.save-status-badge.status-auto {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border: 1px solid var(--el-color-primary-light-5);
}

.save-status-badge.status-watch {
  background-color: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color);
}

.save-status-badge.status-manual {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
  border: 1px solid var(--el-color-warning-light-5);
}

.save-status-badge.status-saving {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
  border: 1px solid var(--el-color-info-light-5);
}

.save-status-badge.status-saved {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success-dark-2);
  border: 1px solid var(--el-color-success-light-5);
}

.save-status-badge.status-error {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border: 1px solid var(--el-color-danger-light-5);
}

.badge-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.badge-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.badge-text {
  line-height: 1;
}
</style>

<style scoped>
.editor-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 6px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.panel-scroll {
  padding: 0 12px 12px;
  flex: 1;
  min-height: 0;
}

.editor-content {
  padding: 0 12px 12px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.switch-row {
  display: flex;
  gap: 16px;
}

.prompt-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.prompt-name-row :deep(.el-input) {
  flex: 1;
  min-width: 0;
}

.prompt-name-row :deep(.el-switch) {
  margin-left: auto;
}

.prompt-hint-trigger {
  border: none;
  background: transparent;
  color: var(--el-color-info);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
}

.prompt-hint-trigger:disabled {
  cursor: not-allowed;
  color: var(--el-text-color-disabled);
}

.grid :deep(.el-form-item) {
  margin-bottom: 16px;
}

.advanced-single {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.regex-tab-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.regex-tab-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
}

.regex-empty {
  padding: 12px 0;
}

@media (max-width: 768px) {
  .regex-tab-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
