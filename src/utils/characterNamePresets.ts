//! Defines and validates the data contract for character-name presets.

const VALIDATED_NAME_TABLE: unique symbol = Symbol("validated-name-table");

/** A name-preset entry loaded from the preset manifest. */
export interface CharacterNamePreset {
  readonly label: string;
  readonly url: string;
}

/** Controls whether a rolled name places the surname or given name first. */
export type CharacterNameOrder = "surname-first" | "given-first";

/** A validated collection of surname and gender-specific given-name fragments. */
export interface CharacterNameTable {
  readonly surnames: readonly string[];
  readonly maleGivenNames: readonly string[];
  readonly femaleGivenNames: readonly string[];
  readonly blacklist: readonly string[];
  readonly nameOrder: CharacterNameOrder;
  readonly separator: string;
  readonly [VALIDATED_NAME_TABLE]: true;
}

/** Identifies the missing collection that made a name table invalid. */
export type CharacterNameTableErrorCode =
  | "missing_surnames"
  | "missing_male_given_names"
  | "missing_female_given_names";

/** Describes why an untrusted name-table document was rejected. */
export interface CharacterNameTableError {
  readonly code: CharacterNameTableErrorCode;
  readonly message: string;
}

/** Contains either a validated name table or its validation error. */
export type CharacterNameTableResult =
  | { readonly ok: true; readonly value: CharacterNameTable }
  | { readonly ok: false; readonly error: CharacterNameTableError };

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const normalizeStringArray = (input: unknown): readonly string[] => {
  if (!Array.isArray(input)) return [];

  return Object.freeze(
    input
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  );
};

/** Parses an untrusted manifest and discards entries without a usable label or URL. */
export const parseCharacterNamePresetList = (
  input: unknown,
): readonly CharacterNamePreset[] => {
  if (!isRecord(input)) return [];

  return Object.freeze(
    Object.entries(input).flatMap(([rawLabel, rawUrl]) => {
      const label = rawLabel.trim();
      const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
      return label && url ? [{ label, url }] : [];
    }),
  );
};

/** Validates an untrusted name-table document before it can be used for rolling. */
export const parseCharacterNameTable = (
  input: unknown,
): CharacterNameTableResult => {
  const document = isRecord(input) ? input : {};
  const surnames = normalizeStringArray(document.surnames);
  if (surnames.length === 0) {
    return {
      ok: false,
      error: {
        code: "missing_surnames",
        message: "The name table must contain at least one surname.",
      },
    };
  }

  const maleGivenNames = normalizeStringArray(document.maleGivenNames);
  if (maleGivenNames.length === 0) {
    return {
      ok: false,
      error: {
        code: "missing_male_given_names",
        message: "The name table must contain at least one male given name.",
      },
    };
  }

  const femaleGivenNames = normalizeStringArray(document.femaleGivenNames);
  if (femaleGivenNames.length === 0) {
    return {
      ok: false,
      error: {
        code: "missing_female_given_names",
        message: "The name table must contain at least one female given name.",
      },
    };
  }

  const nameOrder: CharacterNameOrder =
    document.nameOrder === "given-first" ? "given-first" : "surname-first";
  const separator =
    typeof document.separator === "string" ? document.separator : "";
  const blacklist = normalizeStringArray(document.blacklist);

  return {
    ok: true,
    value: Object.freeze({
      surnames,
      maleGivenNames,
      femaleGivenNames,
      blacklist,
      nameOrder,
      separator,
      [VALIDATED_NAME_TABLE]: true as const,
    }),
  };
};

const randomIndex = (length: number, random: () => number): number => {
  const sample = random();
  const finiteSample = Number.isFinite(sample) ? sample : 0;
  return Math.min(
    length - 1,
    Math.max(0, Math.floor(finiteSample * length)),
  );
};

const randomItem = <T>(items: readonly T[], random: () => number): T =>
  items[randomIndex(items.length, random)] as T;

const composeName = (
  table: CharacterNameTable,
  surname: string,
  givenName: string,
): string =>
  table.nameOrder === "given-first"
    ? `${givenName}${table.separator}${surname}`
    : `${surname}${table.separator}${givenName}`;

/**
 * Rolls one complete name, using both gender lists for an unrecognized gender.
 *
 * Returns `null` when the preset blacklist excludes every candidate for the
 * selected gender.
 */
export const rollCharacterName = (
  table: CharacterNameTable,
  gender: string,
  random: () => number = Math.random,
): string | null => {
  const givenNames =
    gender === "male"
      ? table.maleGivenNames
      : gender === "female"
        ? table.femaleGivenNames
        : [...table.maleGivenNames, ...table.femaleGivenNames];

  if (table.blacklist.length > 0) {
    const blacklist = new Set(table.blacklist);
    let availableCount = 0;
    for (const surname of table.surnames) {
      for (const givenName of givenNames) {
        if (!blacklist.has(composeName(table, surname, givenName))) {
          availableCount += 1;
        }
      }
    }

    if (availableCount === 0) return null;

    let selectedIndex = randomIndex(availableCount, random);
    for (const surname of table.surnames) {
      for (const givenName of givenNames) {
        const name = composeName(table, surname, givenName);
        if (blacklist.has(name)) continue;
        if (selectedIndex === 0) return name;
        selectedIndex -= 1;
      }
    }

    return null;
  }

  const surname = randomItem(table.surnames, random);
  const givenName = randomItem(givenNames, random);

  return composeName(table, surname, givenName);
};
