/**
 * 角色卡V3导出格式的接口定义 (SillyTavern format)
 * 这个文件定义了用于导入/导出的角色卡数据结构
 */
export interface CharacterCardV3 {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creatorcomment: string;

  // Stored in extensions in V2, but top-level in V3
  avatar: 'none' | string;
  talkativeness: number;
  fav: boolean;
  tags: string[];

  // The main data payload
  data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    alternate_greetings: string[];
    tags: string[];
    creator: string;
    character_version: string;

    // World Info, inline or linked
    // Based on observation, this can be an object with 'entries' when embedded,
    // or an empty array when not.
    character_book?:
      | {
          name?: string;
          entries?: any[];
          [key: string]: any;
        }
      | [];

    extensions?: {
      world?: string; // Linked world book name
      [key: string]: any;
    };
    [key: string]: any;
  };

  // Not in spec, but used for local management in this app
  id?: string;
  chineseName?: string; // Alias for name, used in this app

  [key: string]: any; // Allow other top-level fields for compatibility
}
