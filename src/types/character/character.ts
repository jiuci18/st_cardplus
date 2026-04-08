/**
 * 外观特征接口定义
 * 包含角色的所有外观相关属性
 */
export interface Appearance {
  height: string; // 身高
  hairColor: string; // 发色
  hairstyle: string; // 发型
  eyes: string; // 眼睛
  nose: string; // 鼻子
  lips: string; // 嘴唇
  skin: string; // 肤色
  body: string; // 体型
  bust: string; // 胸围
  waist: string; // 腰围
  hips: string; // 臀围
  breasts: string; // 胸部
  genitals: string; // 生殖器
  anus: string; // 肛门
  pubes: string; // 阴毛
  thighs: string; // 大腿
  butt: string; // 臀部
  feet: string; // 脚
  [key: string]: string; // 支持动态属性
}

/**
 * 服装套装接口定义
 */
export interface Attire {
  name: string; // 套装名称
  description: string; // 套装描述
  tops: string; // 上衣
  bottoms: string; // 下装
  shoes: string; // 鞋子
  socks: string; // 袜子
  underwears: string; // 内衣
  accessories: string; // 配饰，可以是多行文本
}

/**
 * 性格特质接口定义
 */
export interface Trait {
  name: string; // 特质名称
  description: string; // 特质描述
  dialogueExamples: string[]; // 对话示例
  behaviorExamples: string[]; // 行为示例
}

/**
 * 人际关系接口定义
 */
export interface Relationship {
  name: string; // 关系人名称
  description: string; // 关系描述
  features: string; // 关系特点
  dialogueExamples: string[]; // 对话示例
}

/**
 * 技能接口定义
 */
export interface Skill {
  name: string; // 技能名称
  type: string; // 技能类型
  description: string; // 技能描述
  dialogExample: string; // 对话示例
  behaviorExample: string; // 行为示例
}

/**
 * 角色备注接口定义
 */
export interface Note {
  id: number; // 4位数字ID (1000-9999)
  name: string; // 备注名称
  data: string[]; // 备注数据
}

/**
 * 角色元数据接口定义
 * 用于本地管理与排序
 */
export interface CharacterMetadata {
  id?: string; // 唯一标识符，用于本地管理
  order?: number; // 列表排序值
  starred?: boolean; // 星标置顶
  projectId?: string; // 所属项目ID，为空表示未分组
}

/**
 * 角色项目接口定义
 * 用于在侧边栏中对角色进行分组管理
 */
export interface CharacterProject {
  id: string;
  name: string;
  order: number;
}

/**
 * 角色核心数据接口定义
 * 包含角色的业务数据（不含元数据）
 */
export interface CharacterData {
  chineseName: string; // 中文名
  japaneseName: string; // 日文名
  gender: string; // 性别
  customGender: string; // 自定义性别
  age: number; // 年龄
  identity: string; // 身份
  background: string; // 背景故事
  appearance: Appearance; // 外观特征
  attires: Attire[]; // 服装套装
  mbti: string; // MBTI性格
  traits: Trait[]; // 性格特质
  relationships: Relationship[]; // 人际关系
  likes: string; // 喜好
  dislikes: string; // 厌恶
  dailyRoutine: { [key: string]: string }; // 日常作息
  skills: Skill[]; // 技能
  notes: Note[]; // 角色备注
}

/**
 * 角色卡主接口定义
 * 顶层分离元数据与业务数据，便于后续扩展
 */
export interface CharacterCard {
  meta: CharacterMetadata;
  data: CharacterData;
}
