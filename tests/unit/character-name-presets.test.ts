import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  parseCharacterNamePresetList,
  parseCharacterNameTable,
  rollCharacterName,
  type CharacterNameTable,
} from "../../src/utils/characterNamePresets.ts";

const validDocument = {
  surnames: ["顾", "沈"],
  maleGivenNames: ["云舟", "怀瑾"],
  femaleGivenNames: ["清漪", "令仪"],
};

const parseValidTable = (): CharacterNameTable => {
  const result = parseCharacterNameTable(validDocument);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected the test name table to be valid.");
  return result.value;
};

const sequenceRandom = (...samples: number[]): (() => number) => {
  let index = 0;
  return () => samples[index++] ?? 0;
};

test("keeps_only_usable_manifest_entries", () => {
  const presets = parseCharacterNamePresetList({
    " 国风名称 ": " /classic.json ",
    "": "/missing-label.json",
    空路径: "   ",
    错误类型: 42,
  });

  assert.deepEqual(presets, [{ label: "国风名称", url: "/classic.json" }]);
});

test("normalizes_name_table_entries_and_defaults_to_chinese_name_order", () => {
  const result = parseCharacterNameTable({
    surnames: [" 顾 ", "", 42],
    maleGivenNames: [" 云舟 "],
    femaleGivenNames: [" 清漪 ", "   "],
  });

  assert.equal(result.ok, true);
  if (!result.ok)
    throw new Error("Expected the normalized name table to be valid.");
  assert.deepEqual(result.value.surnames, ["顾"]);
  assert.deepEqual(result.value.maleGivenNames, ["云舟"]);
  assert.deepEqual(result.value.femaleGivenNames, ["清漪"]);
  assert.equal(result.value.nameOrder, "surname-first");
  assert.equal(result.value.separator, "");
});

test("rejects_name_table_without_surnames", () => {
  const result = parseCharacterNameTable({
    ...validDocument,
    surnames: [],
  });

  assert.deepEqual(result, {
    ok: false,
    error: {
      code: "missing_surnames",
      message: "The name table must contain at least one surname.",
    },
  });
});

test("rejects_name_table_without_male_given_names", () => {
  const result = parseCharacterNameTable({
    ...validDocument,
    maleGivenNames: [],
  });

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected the name table to be rejected.");
  assert.equal(result.error.code, "missing_male_given_names");
});

test("rejects_name_table_without_female_given_names", () => {
  const result = parseCharacterNameTable({
    ...validDocument,
    femaleGivenNames: [],
  });

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected the name table to be rejected.");
  assert.equal(result.error.code, "missing_female_given_names");
});

test("rolls_from_the_male_given_name_list", () => {
  const name = rollCharacterName(
    parseValidTable(),
    "male",
    sequenceRandom(0.75, 0),
  );

  assert.equal(name, "沈云舟");
});

test("rolls_from_the_female_given_name_list", () => {
  const name = rollCharacterName(
    parseValidTable(),
    "female",
    sequenceRandom(0, 0.75),
  );

  assert.equal(name, "顾令仪");
});

test("rolls_given_name_first_with_a_configured_separator", () => {
  const result = parseCharacterNameTable({
    ...validDocument,
    nameOrder: "given-first",
    separator: " ",
  });

  assert.equal(result.ok, true);
  if (!result.ok)
    throw new Error("Expected the western-style table to be valid.");
  assert.equal(
    rollCharacterName(result.value, "male", sequenceRandom(0.75, 0)),
    "云舟 沈",
  );
});

test("combines_gendered_given_names_for_other_genders", () => {
  const name = rollCharacterName(
    parseValidTable(),
    "other",
    sequenceRandom(0, 0.75),
  );

  assert.equal(name, "顾令仪");
});

test("clamps_out_of_range_random_samples", () => {
  const name = rollCharacterName(
    parseValidTable(),
    "male",
    sequenceRandom(1, -1),
  );

  assert.equal(name, "沈云舟");
});

test("production_manifest_references_valid_unique_name_tables", async () => {
  const publicDirectory = new URL("../../public/", import.meta.url);
  const manifestDocument = JSON.parse(
    await readFile(new URL("name_list.json", publicDirectory), "utf8"),
  ) as unknown;
  const presets = parseCharacterNamePresetList(manifestDocument);
  const blockedGivenNames = new Set([
    "沐宸",
    "浩宇",
    "沐辰",
    "茗泽",
    "奕辰",
    "宇泽",
    "浩然",
    "奕泽",
    "宇轩",
    "沐阳",
    "一诺",
    "艺涵",
    "依诺",
    "梓涵",
    "苡沫",
    "雨桐",
    "欣怡",
    "语桐",
    "语汐",
    "昭仪",
  ]);
  const blockedFullNames = new Set([
    "甄嬛",
    "魏璎珞",
    "盛明兰",
    "谢危",
    "顾九思",
    "白浅",
    "花千骨",
    "东方青苍",
    "凤九",
    "楚乔",
    "林黛玉",
    "薛宝钗",
    "黄蓉",
    "令狐冲",
    "郭靖",
    "杨过",
    "小龙女",
    "任我行",
    "乔峰",
    "段誉",
    "虚竹",
    "张无忌",
    "赵敏",
    "周芷若",
    "韦小宝",
    "楚留香",
    "陆小凤",
    "花满楼",
    "西门吹雪",
    "李寻欢",
    "叶孤城",
    "宁缺",
    "桑桑",
    "韩立",
    "王林",
    "叶凡",
    "石昊",
    "萧炎",
    "林动",
    "牧尘",
    "唐三",
    "小舞",
    "魏无羡",
    "蓝忘机",
    "洛冰河",
    "沈清秋",
  ]);

  assert.equal(presets.length, 5);

  for (const preset of presets) {
    assert.match(preset.url, /^\/character-name-presets\/[a-z-]+\.json$/);
    const tableDocument = JSON.parse(
      await readFile(new URL(preset.url.slice(1), publicDirectory), "utf8"),
    ) as unknown;
    const result = parseCharacterNameTable(tableDocument);
    assert.equal(
      result.ok,
      true,
      `${preset.label} should contain a valid table`,
    );
    if (!result.ok) continue;

    for (const entries of [
      result.value.surnames,
      result.value.maleGivenNames,
      result.value.femaleGivenNames,
    ]) {
      assert.equal(
        new Set(entries).size,
        entries.length,
        `${preset.label} should not contain duplicate entries`,
      );
    }

    for (const givenName of [
      ...result.value.maleGivenNames,
      ...result.value.femaleGivenNames,
    ]) {
      assert.equal(
        blockedGivenNames.has(givenName),
        false,
        `${preset.label} should not contain blocked given name ${givenName}`,
      );
    }

    if (result.value.nameOrder === "surname-first") {
      for (const surname of result.value.surnames) {
        for (const givenName of [
          ...result.value.maleGivenNames,
          ...result.value.femaleGivenNames,
        ]) {
          assert.equal(
            blockedFullNames.has(`${surname}${givenName}`),
            false,
            `${preset.label} can generate blocked full name ${surname}${givenName}`,
          );
        }
      }
    }
  }

  const westernPreset = presets.find((preset) => preset.label === "西幻");
  assert.ok(westernPreset);
  const westernDocument = JSON.parse(
    await readFile(
      new URL(westernPreset.url.slice(1), publicDirectory),
      "utf8",
    ),
  ) as unknown;
  const westernResult = parseCharacterNameTable(westernDocument);
  assert.equal(westernResult.ok, true);
  if (!westernResult.ok) return;
  assert.equal(westernResult.value.nameOrder, "given-first");
  assert.equal(westernResult.value.separator, " ");
  assert.equal(
    rollCharacterName(westernResult.value, "male", sequenceRandom(0, 0)),
    "Aldric Alderidge",
  );

  const translatedWesternPreset = presets.find(
    (preset) => preset.label === "西幻（中文）",
  );
  assert.ok(translatedWesternPreset);
  const translatedWesternDocument = JSON.parse(
    await readFile(
      new URL(translatedWesternPreset.url.slice(1), publicDirectory),
      "utf8",
    ),
  ) as unknown;
  const translatedWesternResult = parseCharacterNameTable(
    translatedWesternDocument,
  );
  assert.equal(translatedWesternResult.ok, true);
  if (!translatedWesternResult.ok) return;
  assert.equal(translatedWesternResult.value.nameOrder, "given-first");
  assert.equal(translatedWesternResult.value.separator, "·");
  assert.equal(
    rollCharacterName(
      translatedWesternResult.value,
      "male",
      sequenceRandom(0, 0),
    ),
    "奥德里克·奥尔德里奇",
  );
});
