import type { NormalizeSpokenTextOptions } from "./contracts";

const SMALL_NUMBERS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
] as const;

const SCALE_WORDS = [
  [1_000_000_000_000, "trillion"],
  [1_000_000_000, "billion"],
  [1_000_000, "million"],
  [1_000, "thousand"],
] as const;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  copy: "©",
  gt: ">",
  hellip: "…",
  laquo: "“",
  lt: "<",
  mdash: "\u2014",
  nbsp: " ",
  ndash: "\u2013",
  quot: '"',
  raquo: "”",
  reg: "®",
  trade: "™",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntitiesOnce(value: string): string {
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi,
    (entity, body: string) => {
      if (body[0] === "#") {
        const hexadecimal = body[1]?.toLowerCase() === "x";
        const numeric = body.slice(hexadecimal ? 2 : 1);
        const codePoint = Number.parseInt(numeric, hexadecimal ? 16 : 10);

        if (
          Number.isInteger(codePoint) &&
          codePoint >= 0 &&
          codePoint <= 0x10ffff
        ) {
          return String.fromCodePoint(codePoint);
        }

        return entity;
      }

      return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
    },
  );
}

function decodeHtmlEntities(value: string): string {
  let decoded = value;

  for (let pass = 0; pass < 4; pass += 1) {
    const next = decodeHtmlEntitiesOnce(decoded);
    if (next === decoded) {
      break;
    }
    decoded = next;
  }

  return decoded;
}

export function integerToSpokenWords(value: number): string {
  if (!Number.isSafeInteger(value)) {
    return String(value);
  }

  if (value < 0) {
    return `minus ${integerToSpokenWords(Math.abs(value))}`;
  }

  if (value < 20) {
    return SMALL_NUMBERS[value] ?? String(value);
  }

  if (value < 100) {
    const tens = TENS[Math.floor(value / 10)] ?? "";
    const remainder = value % 10;
    return remainder ? `${tens}-${integerToSpokenWords(remainder)}` : tens;
  }

  if (value < 1_000) {
    const hundreds = `${integerToSpokenWords(Math.floor(value / 100))} hundred`;
    const remainder = value % 100;
    return remainder
      ? `${hundreds} ${integerToSpokenWords(remainder)}`
      : hundreds;
  }

  for (const [scale, label] of SCALE_WORDS) {
    if (value >= scale) {
      const major = integerToSpokenWords(Math.floor(value / scale));
      const remainder = value % scale;
      return remainder
        ? `${major} ${label} ${integerToSpokenWords(remainder)}`
        : `${major} ${label}`;
    }
  }

  return String(value);
}

export function integerToOrdinalWords(value: number): string {
  const cardinal = integerToSpokenWords(value);
  const irregular: Readonly<Record<string, string>> = {
    zero: "zeroth",
    one: "first",
    two: "second",
    three: "third",
    four: "fourth",
    five: "fifth",
    eight: "eighth",
    nine: "ninth",
    twelve: "twelfth",
  };
  const direct = irregular[cardinal];
  if (direct) return direct;

  const separator = Math.max(cardinal.lastIndexOf(" "), cardinal.lastIndexOf("-"));
  if (separator >= 0) {
    const prefix = cardinal.slice(0, separator + 1);
    return `${prefix}${integerToOrdinalWords(
      Number.isSafeInteger(value) ? Math.abs(value) % 100 : value,
    )}`;
  }
  if (cardinal.endsWith("y")) {
    return `${cardinal.slice(0, -1)}ieth`;
  }
  return `${cardinal}th`;
}

function numericStringToWords(raw: string): string {
  const normalized = raw.replaceAll(",", "");
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return raw;
  }

  if (!normalized.includes(".")) {
    return integerToSpokenWords(value);
  }

  const [integerPart = "0", decimalPart = ""] = normalized.split(".");
  const decimalWords = [...decimalPart]
    .map((digit) => SMALL_NUMBERS[Number(digit)] ?? digit)
    .join(" ");

  return `${integerToSpokenWords(Number(integerPart))} point ${decimalWords}`.trim();
}

interface CurrencyDefinition {
  majorSingular: string;
  majorPlural: string;
  minorSingular: string;
  minorPlural: string;
}

const CURRENCIES: Readonly<Record<string, CurrencyDefinition>> = {
  $: {
    majorSingular: "dollar",
    majorPlural: "dollars",
    minorSingular: "cent",
    minorPlural: "cents",
  },
  USD: {
    majorSingular: "U S dollar",
    majorPlural: "U S dollars",
    minorSingular: "cent",
    minorPlural: "cents",
  },
  "£": {
    majorSingular: "pound",
    majorPlural: "pounds",
    minorSingular: "penny",
    minorPlural: "pence",
  },
  GBP: {
    majorSingular: "British pound",
    majorPlural: "British pounds",
    minorSingular: "penny",
    minorPlural: "pence",
  },
  "€": {
    majorSingular: "euro",
    majorPlural: "euros",
    minorSingular: "cent",
    minorPlural: "cents",
  },
  EUR: {
    majorSingular: "euro",
    majorPlural: "euros",
    minorSingular: "cent",
    minorPlural: "cents",
  },
};

function currencyToWords(rawAmount: string, currencyKey: string): string {
  const definition = CURRENCIES[currencyKey.toUpperCase()] ?? CURRENCIES[currencyKey];
  if (!definition) {
    return `${currencyKey} ${rawAmount}`;
  }

  const normalized = rawAmount.replaceAll(",", "");
  const [majorRaw = "0", minorRaw = ""] = normalized.split(".");
  const major = Number.parseInt(majorRaw, 10);
  const minor = Number.parseInt(minorRaw.padEnd(2, "0").slice(0, 2), 10);

  if (!Number.isSafeInteger(major) || !Number.isFinite(minor)) {
    return `${currencyKey} ${rawAmount}`;
  }

  const majorLabel =
    Math.abs(major) === 1 ? definition.majorSingular : definition.majorPlural;
  const majorSpoken = `${integerToSpokenWords(major)} ${majorLabel}`;

  if (!minor) {
    return majorSpoken;
  }

  const minorLabel =
    minor === 1 ? definition.minorSingular : definition.minorPlural;
  return `${majorSpoken} and ${integerToSpokenWords(minor)} ${minorLabel}`;
}

function trimTrailingUrlPunctuation(value: string): {
  url: string;
  trailing: string;
} {
  const match = value.match(/^(.*?)([.,!?;:]*)$/);
  return {
    url: match?.[1] ?? value,
    trailing: match?.[2] ?? "",
  };
}

interface ProtectedNetworkToken {
  placeholder: string;
  replacement: string;
}

function approvedNetworkPronunciation(
  raw: string,
  approved?: Readonly<Record<string, string>>,
): string | undefined {
  const normalizedRaw = raw.toLocaleLowerCase();
  return Object.entries(approved ?? {}).find(
    ([source]) => source.trim().toLocaleLowerCase() === normalizedRaw,
  )?.[1]?.trim();
}

function protectNetworkTokens(
  value: string,
  options: NormalizeSpokenTextOptions,
): { value: string; tokens: readonly ProtectedNetworkToken[] } {
  const tokens: ProtectedNetworkToken[] = [];
  const protect = (
    raw: string,
    approved: Readonly<Record<string, string>> | undefined,
  ): string => {
    const placeholder = `NARRATIONPROTECTEDNETWORKTOKEN${String(tokens.length)}`;
    tokens.push({
      placeholder,
      replacement: approvedNetworkPronunciation(raw, approved) ?? raw,
    });
    return placeholder;
  };

  let protectedValue = value.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    (email) => protect(email, options.approvedEmails),
  );
  protectedValue = protectedValue.replace(
    /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi,
    (rawUrl) => {
      const { url, trailing } = trimTrailingUrlPunctuation(rawUrl);
      return `${protect(url, options.approvedUrls)}${trailing}`;
    },
  );
  protectedValue = protectedValue.replace(
    /\b(?:[a-z0-9-]+\.)+[a-z]{2,63}(?![a-z0-9-]|\.[a-z0-9-])(?:\/[^\s<>"']*)?/gi,
    (rawUrl) => {
      const { url, trailing } = trimTrailingUrlPunctuation(rawUrl);
      return `${protect(url, options.approvedUrls)}${trailing}`;
    },
  );

  return { value: protectedValue, tokens };
}

function restoreNetworkTokens(
  value: string,
  tokens: readonly ProtectedNetworkToken[],
): string {
  return tokens.reduce(
    (restored, token) =>
      restored.replaceAll(token.placeholder, token.replacement),
    value,
  );
}

function pronunciationBoundaryPattern(source: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(source)}(?![\\p{L}\\p{N}])`,
    "iu",
  );
}

export function findUnsafePronunciationRules(
  pronunciations?: Readonly<Record<string, string>>,
): readonly string[] {
  if (!pronunciations) {
    return [];
  }

  const entries = Object.entries(pronunciations)
    .map(([source, spoken]) => [source.trim(), spoken.trim()] as const)
    .filter(([source, spoken]) => source && spoken);
  const unsafe = new Set<string>();

  for (const [source, spoken] of entries) {
    if (source.toLocaleLowerCase() === spoken.toLocaleLowerCase()) {
      continue;
    }

    for (const [otherSource] of entries) {
      if (pronunciationBoundaryPattern(otherSource).test(spoken)) {
        unsafe.add(source);
        break;
      }
    }
  }

  return [...unsafe].sort((left, right) => left.localeCompare(right));
}

function applyPronunciations(
  value: string,
  pronunciations?: Readonly<Record<string, string>>,
): string {
  if (!pronunciations) {
    return value;
  }

  const unsafe = new Set(findUnsafePronunciationRules(pronunciations));
  const entries = Object.entries(pronunciations)
    .map(([source, spoken]) => [source.trim(), spoken.trim()] as const)
    .filter(
      ([source, spoken]) =>
        source &&
        spoken &&
        source.toLocaleLowerCase() !== spoken.toLocaleLowerCase() &&
        !unsafe.has(source),
    )
    .sort(
      ([left], [right]) =>
        right.length - left.length || left.localeCompare(right),
    );

  if (!entries.length) {
    return value;
  }

  const replacements = new Map(
    entries.map(([source, spoken]) => [source.toLocaleLowerCase(), spoken]),
  );
  const alternatives = entries.map(([source]) => escapeRegExp(source)).join("|");
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`,
    "giu",
  );

  return value.replace(
    pattern,
    (match) => replacements.get(match.toLocaleLowerCase()) ?? match,
  );
}

function normalizeWhitespaceAndPunctuation(value: string): string {
  return value
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[\u2013\u2014\u2015]+/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/\(\s*/g, ", ")
    .replace(/\s*\)/g, ", ")
    .replace(/[[\]{}]/g, " ")
    .replace(/(?:\.\s*){2,}|…+/g, ". ")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/[!?]{2,}/g, (marks) => (marks.includes("?") ? "?" : "!"))
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/,\s*([;:])/g, "$1")
    .replace(/;\s*:/g, ":")
    .replace(/:\s*;/g, ";")
    .replace(/;\s*;/g, ";")
    .replace(/([.!?])\s*[,;:]/g, "$1")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=[^\s,;:])/g, "$1 ")
    .replace(/([.!?])(?=[\p{L}\p{N}])/gu, "$1 ")
    .replace(/,\s*([.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function addTerminalPunctuation(value: string): string {
  if (!value || /[.!?](?:["')\]]+)?$/u.test(value)) {
    return value;
  }

  return `${value.replace(/[,;:]$/, "")}.`;
}

/**
 * Converts visible English copy into a deterministic TTS-oriented form.
 *
 * The function deliberately returns plain text rather than SSML so the same
 * narration plan can be used with providers that do not support SSML. It is
 * idempotent: normalizing an already-normalized value produces the same text.
 */
export function normalizeSpokenText(
  input: string,
  options: NormalizeSpokenTextOptions = {},
): string {
  let spoken = decodeHtmlEntities(input).normalize("NFKC");
  const protectedNetwork = protectNetworkTokens(spoken, options);
  spoken = protectedNetwork.value;

  spoken = spoken
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(
      /([$£€])\s*(-?\d[\d,]*(?:\.\d{1,2})?)/g,
      (_match, currency: string, amount: string) =>
        currencyToWords(amount, currency),
    )
    .replace(
      /\b(USD|GBP|EUR)\s+(-?\d[\d,]*(?:\.\d{1,2})?)\b/gi,
      (_match, currency: string, amount: string) =>
        currencyToWords(amount, currency.toUpperCase()),
    )
    .replace(
      /\b(-?\d[\d,]*(?:\.\d{1,2})?)\s+(USD|GBP|EUR)\b/gi,
      (_match, amount: string, currency: string) =>
        currencyToWords(amount, currency.toUpperCase()),
    )
    .replace(
      /\b(week|module)\s*(?:#|number|no\.?)?\s*(\d{1,3})\b/gi,
      (_match, label: string, number: string) =>
        `${label} ${integerToSpokenWords(Number(number))}`,
    )
    .replace(
      /\b(-?\d[\d,]*(?:\.\d+)?)\s*%/g,
      (_match, number: string) => `${numericStringToWords(number)} percent`,
    );

  spoken = applyPronunciations(spoken, options.pronunciations);

  spoken = spoken
    .replace(/\b([A-Z])2([A-Z])\b/g, "$1 to $2")
    .replace(/&/g, " and ")
    .replace(/\s+\/\s+/g, " or ")
    .replace(/\//g, " slash ")
    .replace(/\+/g, " plus ")
    .replace(/@/g, " at ")
    .replace(/#(?=\s*\d)/g, " number ")
    .replace(/[•●▪◦‣⁃·]/g, ", ")
    .replace(/[✓✔☑✅✗✘☒❌]/gu, " ")
    .replace(/[→⇒➜➝↦]/g, ". Then ")
    .replace(/[©®™]/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, " ");

  spoken = normalizeWhitespaceAndPunctuation(spoken);
  spoken = restoreNetworkTokens(spoken, protectedNetwork.tokens);

  if (options.ensureTerminalPunctuation !== false) {
    spoken = addTerminalPunctuation(spoken);
  }

  return spoken;
}
