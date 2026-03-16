import type { Ref } from 'vue';

interface BaseSetting {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
  description: string;
}

interface SwitchSetting extends BaseSetting {
  type: 'switch';
  model: Ref<boolean>;
  handler: (value: boolean) => void;
  disabled?: boolean;
}

interface NumberInputSetting extends BaseSetting {
  type: 'numberInput';
  model: Ref<number>;
  handler: (value: number | undefined) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}

interface PasswordInputSetting extends BaseSetting {
  type: 'passwordInput';
  model: Ref<string>;
  handler: (value: string) => void;
  placeholder?: string;
}

export type SettingOption = SwitchSetting | NumberInputSetting | PasswordInputSetting;

interface AppSettingsModels {
  betaFeaturesEnabled: Ref<boolean>;
  umamiEnabled: Ref<boolean>;
  autoSaveInterval: Ref<number>;
  autoSaveDebounce: Ref<number>;
  imgbbApiKey: Ref<string>;
}
interface AppSettingsHandlers {
  onBetaFeaturesToggle: (value: boolean) => void;
  onUmamiToggle: (value: boolean) => void;
  onAutoSaveIntervalChange: (value: number | undefined) => void;
  onAutoSaveDebounceChange: (value: number | undefined) => void;
  onImgbbApiKeyChange: (value: string) => void;
}

export const getAppSettings = (models: AppSettingsModels, handlers: AppSettingsHandlers): SettingOption[] => {
  return [
    {
      id: 'betaFeaturesEnabled',
      label: '显示测试版功能',
      icon: 'material-symbols:experiment-outline',
      iconColor: 'var(--el-color-warning)',
      description: '开启后将在导航栏显示测试版功能，包括 EJS 模板编辑器和世界书功能 ',
      type: 'switch',
      model: models.betaFeaturesEnabled,
      handler: handlers.onBetaFeaturesToggle,
    },
    {
      id: 'umamiEnabled',
      label: '启用 Umami 远程遥测',
      icon: 'material-symbols:analytics-outline',
      iconColor: 'var(--el-color-primary)',
      description: '开启后会向 Umami 发送匿名访问统计，用于了解页面访问和功能使用趋势',
      type: 'switch',
      model: models.umamiEnabled,
      handler: handlers.onUmamiToggle,
    },
    {
      id: 'imgbbApiKey',
      label: 'ImgBB API Key',
      icon: 'material-symbols:key-outline',
      iconColor: 'var(--el-color-primary)',
      description: '用于上传图片到 ImgBB。你可以点击<a href="https://api.imgbb.com/" target="_blank" style="color: var(--el-color-primary);">这里</a>获取 API Key',
      type: 'passwordInput',
      model: models.imgbbApiKey,
      handler: handlers.onImgbbApiKeyChange,
      placeholder: '请输入 ImgBB API Key',
    },
    {
      id: 'autoSaveInterval',
      label: '自动保存间隔',
      icon: 'material-symbols:save-outline',
      iconColor: 'var(--el-color-success)',
      description: '设置编辑器中内容的自动保存间隔，范围：1-60秒 ',
      type: 'numberInput',
      model: models.autoSaveInterval,
      handler: handlers.onAutoSaveIntervalChange,
      min: 1,
      max: 60,
      step: 1,
      unit: '秒',
    },
    {
      id: 'autoSaveDebounce',
      label: '自动保存防抖',
      icon: 'material-symbols:timer-outline',
      iconColor: 'var(--el-color-warning)',
      description: '监听模式下的防抖时间，范围：0.1-10秒 ',
      type: 'numberInput',
      model: models.autoSaveDebounce,
      handler: handlers.onAutoSaveDebounceChange,
      min: 0.1,
      max: 10,
      step: 0.1,
      unit: '秒',
    },
  ];
};
