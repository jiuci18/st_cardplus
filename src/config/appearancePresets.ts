/**
 * 外貌特征字段的内置预设词库。
 *
 * - key 使用 `standardFieldsMap` 中的标准字段 key
 * - 同时通过中文标签建立别名，方便自定义字段（key 为中文名）命中同一份预设
 * - 词条只描述外貌本身，不混入体态、神态、行为类描述
 */

export interface AppearancePresetGroup {
  label: string;
  items: string[];
}

export const appearancePresetGroups: Record<string, AppearancePresetGroup[]> = {
  hairColor: [
    {
      label: "自然色",
      items: ["乌黑", "墨黑带蓝调", "深棕", "亚麻棕", "浅栗色", "蜜金色", "沙金色", "红褐色"],
    },
    {
      label: "特殊色",
      items: ["银白", "月白", "雪青", "浅粉", "薰衣草紫", "湖蓝", "薄荷绿", "赤红", "渐变挑染"],
    },
    {
      label: "质感",
      items: ["光泽柔顺", "略显干枯", "细软蓬松", "浓密粗硬"],
    },
  ],
  hairstyle: [
    {
      label: "长度",
      items: ["寸短", "齐耳短发", "及肩", "及腰长发", "长至臀部"],
    },
    {
      label: "造型",
      items: ["长直发", "微卷", "大波浪", "空气刘海", "三七分", "高马尾", "双马尾", "丸子头", "编辫", "半扎发", "狼尾"],
    },
    {
      label: "细节",
      items: ["发尾微微翘起", "刘海遮住一只眼", "别着发夹", "束着发带", "略显凌乱"],
    },
  ],
  eyes: [
    {
      label: "瞳色",
      items: ["漆黑", "深棕", "琥珀色", "金瞳", "灰蓝", "碧绿", "紫罗兰色", "血红", "异色瞳"],
    },
    {
      label: "眼型",
      items: ["杏眼", "桃花眼", "丹凤眼", "圆眼", "狐狸眼", "垂眼", "眼角上扬", "细长眼"],
    },
    {
      label: "附加",
      items: ["长睫毛", "双眼皮", "内双", "眼下有泪痣", "戴眼镜"],
    },
  ],
  nose: [
    {
      label: "形状",
      items: ["小巧挺翘", "笔直挺立", "鼻梁高挺", "鼻梁平缓", "鼻头圆润", "鹰钩状"],
    },
    {
      label: "细节",
      items: ["鼻梁上有淡淡雀斑", "戴着鼻钉"],
    },
  ],
  lips: [
    {
      label: "形状",
      items: ["唇形饱满", "薄唇", "唇角上翘", "唇角下撇", "花瓣唇", "唇线分明"],
    },
    {
      label: "颜色状态",
      items: ["淡粉", "殷红", "血色偏淡", "干燥起皮", "润泽有光", "涂着深色唇膏"],
    },
  ],
  skin: [
    {
      label: "色调",
      items: ["白得近乎透明", "冷白", "象牙白", "小麦色", "蜜色", "深褐", "带着病态的青白"],
    },
    {
      label: "质感",
      items: ["细腻光滑", "触感微凉", "略显粗糙", "有薄薄一层绒毛"],
    },
    {
      label: "痕迹",
      items: ["锁骨处有一道旧疤", "肩背有纹身", "手上有薄茧", "手臂有淡淡雀斑", "身上有烫伤痕迹"],
    },
  ],
  body: [
    {
      label: "整体",
      items: ["纤细窈窕", "娇小玲珑", "高挑修长", "匀称健康", "丰腴柔软", "健硕结实", "肌肉线条分明", "偏瘦削"],
    },
  ],
  breasts: [
    {
      label: "规模",
      items: ["小巧", "适中", "略显丰满", "丰满"],
    },
    {
      label: "形态",
      items: ["形状匀称", "轮廓柔和", "线条紧实"],
    },
  ],
  bust: [
    {
      label: "常用范围",
      items: ["约 78cm", "约 82cm", "约 86cm", "约 90cm", "约 94cm"],
    },
    {
      label: "描述",
      items: ["胸围偏纤细", "胸围适中", "胸围较为丰满"],
    },
  ],
  waist: [
    {
      label: "常用范围",
      items: ["约 54cm", "约 58cm", "约 62cm", "约 66cm", "约 70cm"],
    },
    {
      label: "描述",
      items: ["腰线纤细", "腰腹平坦紧实", "腰身柔软", "有明显腰窝"],
    },
  ],
  hips: [
    {
      label: "常用范围",
      items: ["约 82cm", "约 86cm", "约 90cm", "约 94cm", "约 98cm"],
    },
    {
      label: "描述",
      items: ["臀线圆润", "臀部小巧", "臀腰比明显"],
    },
  ],
  thighs: [
    {
      label: "形态",
      items: ["纤细笔直", "线条柔和", "结实有力", "略显丰满", "肌肉紧实"],
    },
    {
      label: "细节",
      items: ["大腿内侧肤色更浅", "有一处淡疤"],
    },
  ],
  butt: [
    {
      label: "形态",
      items: ["小巧", "圆润上翘", "紧实", "线条饱满"],
    },
  ],
  feet: [
    {
      label: "形态",
      items: ["脚型小巧", "足弓明显", "脚背白净", "脚趾修长"],
    },
    {
      label: "细节",
      items: ["脚踝纤细", "脚踝戴着细链", "涂着趾甲油", "脚底有薄茧"],
    },
  ],
};

/** 中文标签 -> 标准字段 key，让自定义字段也能命中内置词库 */
const labelAliases: Record<string, string> = {
  发色: "hairColor",
  头发颜色: "hairColor",
  发型: "hairstyle",
  眼睛: "eyes",
  眼瞳: "eyes",
  瞳色: "eyes",
  鼻子: "nose",
  嘴唇: "lips",
  皮肤: "skin",
  肤色: "skin",
  身材: "body",
  体型: "body",
  胸部: "breasts",
  胸围: "bust",
  腰围: "waist",
  臀围: "hips",
  大腿: "thighs",
  屁股: "butt",
  臀部: "butt",
  足部: "feet",
  脚: "feet",
};

/**
 * 解析某个外貌字段可用的预设分组。
 * 先按字段 key 精确匹配，再按中文标签别名兜底。
 */
export const resolveAppearancePresets = (
  key: string,
  label?: string,
): AppearancePresetGroup[] => {
  const direct = appearancePresetGroups[key];
  if (direct) return direct;

  const aliasKey = labelAliases[key.trim()] ?? (label ? labelAliases[label.trim()] : undefined);
  if (aliasKey) return appearancePresetGroups[aliasKey] ?? [];
  return [];
};
