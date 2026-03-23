export type ChatCompletionSource =
  | 'openai'
  | 'claude'
  | 'openrouter'
  | 'ai21'
  | 'makersuite'
  | 'vertexai'
  | 'mistralai'
  | 'custom'
  | 'cohere'
  | 'perplexity'
  | 'groq'
  | 'electronhub'
  | 'chutes'
  | 'nanogpt'
  | 'deepseek'
  | 'aimlapi'
  | 'xai'
  | 'pollinations'
  | 'moonshot'
  | 'fireworks'
  | 'cometapi'
  | 'azure_openai'
  | 'zai'
  | 'siliconflow';

export type CharacterNamesBehavior = -1 | 0 | 1 | 2;
export type ContinuePostfix = '' | ' ' | '\n' | '\n\n';
export type CustomPromptPostProcessing =
  | ''
  | 'claude'
  | 'merge'
  | 'merge_tools'
  | 'semi'
  | 'semi_tools'
  | 'strict'
  | 'strict_tools'
  | 'single';
export type OpenRouterMiddleout = 'auto' | 'on' | 'off';
export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high' | 'min' | 'max';
export type VerbosityLevel = 'auto' | 'low' | 'medium' | 'high';
export type ZaiEndpoint = 'common' | 'coding';
export type VertexAIAuthMode = 'express' | 'full';

export interface PromptOrderItem {
  identifier: string;
  enabled: boolean;
}

export interface PromptOrderEntry {
  character_id: number;
  order: PromptOrderItem[];
}

export interface PromptDefinition {
  identifier: string;
  name?: string;
  system_prompt?: boolean;
  role?: string;
  content?: string;
  marker?: boolean;
}

export const defaultPromptOrder: PromptOrderEntry[] = [
  {
    character_id: 100000,
    order: [
      { identifier: 'main', enabled: true },
      { identifier: 'worldInfoBefore', enabled: true },
      { identifier: 'charDescription', enabled: true },
      { identifier: 'charPersonality', enabled: true },
      { identifier: 'scenario', enabled: true },
      { identifier: 'enhanceDefinitions', enabled: false },
      { identifier: 'nsfw', enabled: true },
      { identifier: 'worldInfoAfter', enabled: true },
      { identifier: 'dialogueExamples', enabled: true },
      { identifier: 'chatHistory', enabled: true },
      { identifier: 'jailbreak', enabled: true },
    ],
  },
  {
    character_id: 100001,
    order: [
      { identifier: 'main', enabled: true },
      { identifier: 'worldInfoBefore', enabled: true },
      { identifier: 'personaDescription', enabled: true },
      { identifier: 'charDescription', enabled: true },
      { identifier: 'charPersonality', enabled: true },
      { identifier: 'scenario', enabled: true },
      { identifier: 'enhanceDefinitions', enabled: false },
      { identifier: 'nsfw', enabled: true },
      { identifier: 'worldInfoAfter', enabled: true },
      { identifier: 'dialogueExamples', enabled: true },
      { identifier: 'chatHistory', enabled: true },
      { identifier: 'jailbreak', enabled: true },
    ],
  },
];

export interface OpenAIChatCompletionPreset {
  chat_completion_source: ChatCompletionSource;
  temperature: number;
  frequency_penalty: number;
  presence_penalty: number;
  top_p: number;
  top_k: number;
  top_a: number;
  min_p: number;
  repetition_penalty: number;
  max_context_unlocked: boolean;
  custom_include_body: string;
  custom_exclude_body: string;
  custom_include_headers: string;
  custom_prompt_post_processing: CustomPromptPostProcessing;
  openai_max_context: number;
  openai_max_tokens: number;
  names_behavior: CharacterNamesBehavior;
  send_if_empty: string;
  impersonation_prompt: string;
  new_chat_prompt: string;
  new_group_chat_prompt: string;
  new_example_chat_prompt: string;
  continue_nudge_prompt: string;
  bias_preset_selected: string;
  wi_format: string;
  scenario_format: string;
  personality_format: string;
  group_nudge_prompt: string;
  prompts: PromptDefinition[];
  prompt_order: PromptOrderEntry[];
  show_external_models: boolean;
  proxy_password: string;
  assistant_prefill: string;
  assistant_impersonation: string;
  use_sysprompt: boolean;
  squash_system_messages: boolean;
  media_inlining: boolean;
  inline_image_quality: string;
  continue_prefill: boolean;
  continue_postfix: ContinuePostfix;
  function_calling: boolean;
  show_thoughts: boolean;
  reasoning_effort: ReasoningEffort;
  verbosity: VerbosityLevel;
  enable_web_search: boolean;
  seed: number;
  n: number;
  bypass_status_check: boolean;
  extensions: Record<string, unknown>;
}

export const defaultOpenAIPreset: OpenAIChatCompletionPreset = {
  chat_completion_source: 'openai',
  temperature: 1.0,
  frequency_penalty: 0,
  presence_penalty: 0,
  top_p: 1.0,
  top_k: 0,
  top_a: 0,
  min_p: 0,
  repetition_penalty: 1,
  max_context_unlocked: false,
  custom_include_body: '',
  custom_exclude_body: '',
  custom_include_headers: '',
  custom_prompt_post_processing: '',
  openai_max_context: 250000,
  openai_max_tokens: 20000,
  names_behavior: 0,
  send_if_empty: '—',
  impersonation_prompt:
    "[Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Don't write as {{char}} or system. Don't describe actions of {{char}}.]",
  new_chat_prompt: '[Start a new Chat]',
  new_group_chat_prompt: '[Start a new group chat. Group members: {{group}}]',
  new_example_chat_prompt: '[Example Chat]',
  continue_nudge_prompt:
    '[Continue the following message. Do not include ANY parts of the original message. Use capitalization and punctuation as if your reply is a part of the original message: {{lastChatMessage}}]',
  bias_preset_selected: 'Default (none)',
  wi_format: '{0}',
  scenario_format: '{{scenario}}',
  personality_format: '{{personality}}',
  group_nudge_prompt: '[Write the next reply only as {{char}}.]',
  prompts: [
    {
      name: 'Main Prompt',
      system_prompt: true,
      role: 'system',
      content: "Write {{char}}'s next reply in a fictional chat between {{charIfNotGroup}} and {{user}}.",
      identifier: 'main',
    },
    {
      name: 'Auxiliary Prompt',
      system_prompt: true,
      role: 'system',
      content: '',
      identifier: 'nsfw',
    },
    {
      identifier: 'dialogueExamples',
      name: 'Chat Examples',
      system_prompt: true,
      marker: true,
    },
    {
      name: 'Post-History Instructions',
      system_prompt: true,
      role: 'system',
      content: '',
      identifier: 'jailbreak',
    },
    {
      identifier: 'chatHistory',
      name: 'Chat History',
      system_prompt: true,
      marker: true,
    },
    {
      identifier: 'worldInfoAfter',
      name: 'World Info (after)',
      system_prompt: true,
      marker: true,
    },
    {
      identifier: 'worldInfoBefore',
      name: 'World Info (before)',
      system_prompt: true,
      marker: true,
    },
    {
      identifier: 'enhanceDefinitions',
      role: 'system',
      name: 'Enhance Definitions',
      content:
        "If you have more knowledge of {{char}}, add to the character's lore and personality to enhance them but keep the Character Sheet's definitions absolute.",
      system_prompt: true,
      marker: false,
    },
    {
      identifier: 'charDescription',
      name: 'Char Description',
      system_prompt: true,
      marker: true,
    },
    {
      identifier: 'charPersonality',
      name: 'Char Personality',
      system_prompt: true,
      marker: true,
    },
    {
      identifier: 'scenario',
      name: 'Scenario',
      system_prompt: true,
      marker: true,
    },
    {
      identifier: 'personaDescription',
      name: 'Persona Description',
      system_prompt: true,
      marker: true,
    },
  ],
  prompt_order: defaultPromptOrder,
  show_external_models: false,
  proxy_password: '',
  assistant_prefill: '',
  assistant_impersonation: '',
  use_sysprompt: false,
  squash_system_messages: false,
  media_inlining: true,
  inline_image_quality: 'high',
  continue_prefill: false,
  continue_postfix: ' ',
  function_calling: false,
  show_thoughts: true,
  reasoning_effort: 'medium',
  verbosity: 'auto',
  enable_web_search: false,
  seed: -1,
  n: 1,
  bypass_status_check: false,
  extensions: {},
};
