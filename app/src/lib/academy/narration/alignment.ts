import type {
  NarrationBlock,
  NarrationDocument,
  NarrationFormFieldBlock,
  NarrationLessonScopedPronunciation,
  NarrationListItemBlock,
  NormalizeSpokenTextOptions,
} from "./contracts";
import {
  integerToOrdinalWords,
  integerToSpokenWords,
  normalizeSpokenText,
} from "./normalization";
import {
  ownerReviewPronunciationsIn,
  resolveOrderedListStyle,
  type NarrationOrderedListStyle,
  type PronunciationOwnerReviewItem,
} from "./policy";
import {
  applyLessonScopedPronunciationsToText,
  createNarrationScopedPronunciationState,
  type NarrationScopedPronunciationState,
} from "./scoped-pronunciation";

export const NARRATION_ALIGNMENT_CLASSIFICATIONS = Object.freeze([
  "ALLOWED_SPEECH_TRANSFORMATION",
  "REQUIRES_OWNER_REVIEW",
  "INVALID_SEMANTIC_DRIFT",
] as const);

export type NarrationAlignmentClassification =
  (typeof NARRATION_ALIGNMENT_CLASSIFICATIONS)[number];

export const NARRATION_PROTECTED_FEATURES = Object.freeze([
  "PRONOUNS_AND_RESPONSIBLE_ACTORS",
  "MODALITY",
  "NEGATION",
  "NUMBERS_PERCENT_CURRENCY",
  "CONDITIONS_AND_TEMPORAL_ORDER",
  "COMPARATIVES",
  "OBLIGATION_AND_PERMISSION",
  "ELIGIBILITY",
  "ASSESSMENT",
  "COMMISSION",
  "GOVERNANCE",
  "TENSE",
] as const);

export type NarrationProtectedFeature =
  (typeof NARRATION_PROTECTED_FEATURES)[number];

export type NarrationAlignmentChangeKind =
  | "EXACT"
  | "DETERMINISTIC_SPEECH_NORMALIZATION"
  | "PUNCTUATION_OR_SPACING_ONLY"
  | "EXACT_DUPLICATE_LABEL_SUPPRESSION"
  | "RESIDUAL_LEXICAL_DIFFERENCE";

export type NarrationAlignmentIssueCode =
  | "PROTECTED_FEATURE_DRIFT"
  | "RESIDUAL_LEXICAL_DIFFERENCE"
  | "PRONUNCIATION_REQUIRES_OWNER_REVIEW"
  | "INVALID_DUPLICATE_LABEL_SUPPRESSION"
  | "LIST_MARKER_POLICY_MISMATCH";

export interface ProtectedNarrationFeatureDrift {
  feature: NarrationProtectedFeature;
  expected: readonly string[];
  actual: readonly string[];
  missing: readonly string[];
  added: readonly string[];
}

export interface NarrationAlignmentIssue {
  code: NarrationAlignmentIssueCode;
  classification: NarrationAlignmentClassification;
  message: string;
  feature?: NarrationProtectedFeature;
  ownerReviewItemId?: string;
  occurrenceCount?: number;
  expected?: string;
  actual?: string;
}

export interface NarrationAlignmentContext {
  slug?: string;
  pronunciations?: Readonly<Record<string, string>>;
  lessonScopedPronunciations?: Readonly<
    Record<string, NarrationLessonScopedPronunciation>
  >;
  approvedUrls?: Readonly<Record<string, string>>;
  approvedEmails?: Readonly<Record<string, string>>;
  orderedListStyles?: Readonly<
    Record<string, NarrationOrderedListStyle>
  >;
  /**
   * A pronunciation choice is considered resolved only when both an exact
   * mapping and a non-empty owner approval reference are present.
   */
  ownerApprovalReference?: string;
}

export interface NarrationAlignmentFieldInput {
  blockId: string;
  blockType: NarrationBlock["type"];
  field: string;
  visibleText: string;
  spokenText: string;
  expectedSpokenText?: string;
  ensureTerminalPunctuation?: boolean;
  context?: NarrationAlignmentContext;
  changeKindOverride?: NarrationAlignmentChangeKind;
}

export interface NarrationAlignmentFieldAudit {
  blockId: string;
  blockType: NarrationBlock["type"];
  field: string;
  visibleText: string;
  spokenText: string;
  expectedSpokenText: string;
  classification: NarrationAlignmentClassification;
  changeKind: NarrationAlignmentChangeKind;
  issues: readonly NarrationAlignmentIssue[];
  protectedFeatureDrifts: readonly ProtectedNarrationFeatureDrift[];
  pendingOwnerReviewItemIds: readonly string[];
  pendingOwnerReviewOccurrenceCount: number;
}

export interface NarrationAlignmentBlockAudit {
  blockId: string;
  blockType: NarrationBlock["type"];
  sourcePath?: string;
  classification: NarrationAlignmentClassification;
  fields: readonly NarrationAlignmentFieldAudit[];
  issues: readonly NarrationAlignmentIssue[];
  protectedFeatureDrifts: readonly ProtectedNarrationFeatureDrift[];
  pendingOwnerReviewItemIds: readonly string[];
  pendingOwnerReviewOccurrenceCount: number;
}

export interface NarrationAlignmentSummary {
  totalBlocks: number;
  totalFields: number;
  exactFields: number;
  transformedFields: number;
  blocksByClassification: Readonly<
    Record<NarrationAlignmentClassification, number>
  >;
  fieldsByClassification: Readonly<
    Record<NarrationAlignmentClassification, number>
  >;
  protectedFeatureDriftCount: number;
  pendingOwnerReviewOccurrenceCount: number;
}

export interface NarrationAlignmentDocumentAudit {
  slug: string;
  classification: NarrationAlignmentClassification;
  blocks: readonly NarrationAlignmentBlockAudit[];
  summary: NarrationAlignmentSummary;
}

interface SemanticToken {
  raw: string;
  value: string;
  start: number;
  end: number;
}

type FeatureVector = Readonly<Record<NarrationProtectedFeature, string[]>>;

const CLASSIFICATION_RANK: Readonly<
  Record<NarrationAlignmentClassification, number>
> = {
  ALLOWED_SPEECH_TRANSFORMATION: 0,
  REQUIRES_OWNER_REVIEW: 1,
  INVALID_SEMANTIC_DRIFT: 2,
};

const PRONOUNS = new Set([
  "he",
  "her",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "i",
  "it",
  "its",
  "itself",
  "me",
  "mine",
  "my",
  "myself",
  "our",
  "ours",
  "ourselves",
  "she",
  "their",
  "theirs",
  "them",
  "themselves",
  "they",
  "us",
  "we",
  "who",
  "whom",
  "whose",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
]);

const RESPONSIBLE_ACTORS = new Set([
  "administrator",
  "administrators",
  "advisor",
  "advisors",
  "buyer",
  "buyers",
  "client",
  "clients",
  "coach",
  "coaches",
  "company",
  "companies",
  "customer",
  "customers",
  "employee",
  "employees",
  "employer",
  "employers",
  "leader",
  "leaders",
  "leadership",
  "manager",
  "managers",
  "member",
  "members",
  "owner",
  "owners",
  "partner",
  "partners",
  "prospect",
  "prospects",
  "representative",
  "representatives",
  "seller",
  "sellers",
  "team",
  "teams",
  "tenant",
  "tenants",
]);

const RESPONSIBILITY_TERMS = new Set([
  "accountable",
  "accountability",
  "assigned",
  "assigns",
  "owns",
  "responsibility",
  "responsible",
]);

const RESPONSIBLE_ACTOR_PHRASES = [
  "account executive",
  "account executives",
  "sales representative",
  "sales representatives",
] as const;

const MODALS = new Set([
  "can",
  "can't",
  "cannot",
  "could",
  "couldn't",
  "may",
  "might",
  "must",
  "mustn't",
  "shall",
  "should",
  "shouldn't",
  "will",
  "won't",
  "would",
  "wouldn't",
]);

const NEGATIONS = new Set([
  "aren't",
  "can't",
  "cannot",
  "didn't",
  "doesn't",
  "don't",
  "hadn't",
  "hasn't",
  "haven't",
  "isn't",
  "mustn't",
  "neither",
  "never",
  "no",
  "nor",
  "not",
  "shouldn't",
  "wasn't",
  "weren't",
  "without",
  "won't",
  "wouldn't",
]);

const CONDITION_TERMS = new Set([
  "after",
  "assuming",
  "before",
  "during",
  "except",
  "following",
  "if",
  "once",
  "otherwise",
  "provided",
  "providing",
  "then",
  "unless",
  "until",
  "when",
  "whenever",
  "where",
  "wherever",
  "whether",
  "while",
]);

const CONDITION_PHRASES = [
  "as long as",
  "even if",
  "only if",
  "prior to",
  "subject to",
] as const;

const COMPARATIVE_TERMS = new Set([
  "best",
  "better",
  "earlier",
  "faster",
  "fewer",
  "greater",
  "higher",
  "increase",
  "increased",
  "increases",
  "larger",
  "later",
  "less",
  "lower",
  "maximum",
  "minimum",
  "more",
  "slower",
  "smaller",
  "worse",
  "worst",
]);

const COMPARATIVE_PHRASES = [
  "at least",
  "at most",
  "greater than",
  "less than",
  "more than",
  "no less than",
  "no more than",
] as const;

const OBLIGATION_PERMISSION_TERMS = new Set([
  "allow",
  "allowed",
  "allows",
  "can",
  "can't",
  "cannot",
  "forbidden",
  "mandatory",
  "may",
  "must",
  "need",
  "needed",
  "needs",
  "obligated",
  "obligation",
  "permission",
  "permitted",
  "prohibited",
  "require",
  "required",
  "requires",
  "shall",
  "should",
]);

const ELIGIBILITY_TERMS = new Set([
  "criteria",
  "eligible",
  "eligibility",
  "entitled",
  "entitlement",
  "ineligible",
  "qualification",
  "qualifications",
  "qualified",
  "qualifies",
  "qualify",
  "requirement",
  "requirements",
  "threshold",
  "thresholds",
]);

const ASSESSMENT_TERMS = new Set([
  "assess",
  "assessed",
  "assessment",
  "assessments",
  "evaluate",
  "evaluated",
  "evaluation",
  "exam",
  "exams",
  "fail",
  "failed",
  "fails",
  "grade",
  "graded",
  "pass",
  "passed",
  "passes",
  "quiz",
  "quizzes",
  "review",
  "reviewed",
  "score",
  "scored",
  "scoring",
  "test",
  "tested",
  "tests",
]);

const COMMISSION_TERMS = new Set([
  "bonus",
  "bonuses",
  "commission",
  "commissions",
  "compensation",
  "earn",
  "earned",
  "earning",
  "earnings",
  "fee",
  "fees",
  "income",
  "paid",
  "pay",
  "payment",
  "payments",
  "payout",
  "payouts",
  "percentage",
  "percentages",
  "rate",
  "rates",
  "refund",
  "refunds",
  "revenue",
  "split",
  "splits",
]);

const GOVERNANCE_TERMS = new Set([
  "agreement",
  "agreements",
  "amend",
  "amended",
  "approval",
  "approvals",
  "approve",
  "approved",
  "approves",
  "authority",
  "authorization",
  "authorize",
  "authorized",
  "board",
  "boards",
  "compliance",
  "condition",
  "conditions",
  "contract",
  "contracts",
  "decision",
  "decisions",
  "discretion",
  "governance",
  "guideline",
  "guidelines",
  "management",
  "policy",
  "policies",
  "rule",
  "rules",
  "term",
  "terms",
]);

const NUMBER_WORDS = new Set([
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
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
  "hundred",
  "thousand",
  "million",
  "billion",
  "trillion",
  "zeroth",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
  "twentieth",
  "thirtieth",
  "fortieth",
  "fiftieth",
  "sixtieth",
  "seventieth",
  "eightieth",
  "ninetieth",
  "point",
  "minus",
]);

const QUANTITY_TERMS = new Set([
  "percent",
  "percentage",
  "percentages",
  "cent",
  "cents",
  "dollar",
  "dollars",
  "euro",
  "euros",
  "pence",
  "penny",
  "pound",
  "pounds",
]);

const TENSE_AUXILIARIES = new Set([
  "am",
  "are",
  "did",
  "do",
  "does",
  "had",
  "has",
  "have",
  "is",
  "was",
  "were",
]);

const TENSE_FORMS: Readonly<Record<string, string>> = Object.freeze({
  allow: "allow:base",
  allowed: "allow:past",
  allowing: "allow:progressive",
  allows: "allow:present-third",
  approve: "approve:base",
  approved: "approve:past",
  approves: "approve:present-third",
  approving: "approve:progressive",
  assess: "assess:base",
  assessed: "assess:past",
  assesses: "assess:present-third",
  assessing: "assess:progressive",
  authorize: "authorize:base",
  authorized: "authorize:past",
  authorizes: "authorize:present-third",
  authorizing: "authorize:progressive",
  complete: "complete:base",
  completed: "complete:past",
  completes: "complete:present-third",
  completing: "complete:progressive",
  earn: "earn:base",
  earned: "earn:past",
  earning: "earn:progressive",
  earns: "earn:present-third",
  evaluate: "evaluate:base",
  evaluated: "evaluate:past",
  evaluates: "evaluate:present-third",
  evaluating: "evaluate:progressive",
  fail: "fail:base",
  failed: "fail:past",
  failing: "fail:progressive",
  fails: "fail:present-third",
  pay: "pay:base",
  paid: "pay:past",
  paying: "pay:progressive",
  pays: "pay:present-third",
  qualify: "qualify:base",
  qualified: "qualify:past",
  qualifies: "qualify:present-third",
  qualifying: "qualify:progressive",
  receive: "receive:base",
  received: "receive:past",
  receives: "receive:present-third",
  receiving: "receive:progressive",
  require: "require:base",
  required: "require:past",
  requires: "require:present-third",
  requiring: "require:progressive",
  submit: "submit:base",
  submits: "submit:present-third",
  submitted: "submit:past",
  submitting: "submit:progressive",
});

function normalizeApostrophes(value: string): string {
  return value.normalize("NFKC").replace(/[‘’‚‛]/g, "'");
}

function semanticTokens(value: string): SemanticToken[] {
  const normalized = normalizeApostrophes(value);
  const pattern =
    /[\p{L}\p{M}]+(?:'[\p{L}\p{M}]+)*|\d+(?:[.,]\d+)*/gu;
  const tokens: SemanticToken[] = [];

  for (const match of normalized.matchAll(pattern)) {
    const raw = match[0];
    const start = match.index ?? 0;
    tokens.push({
      raw,
      value: raw.toLocaleLowerCase(),
      start,
      end: start + raw.length,
    });
  }

  return tokens;
}

function spelledInitialIndexes(
  value: string,
  tokens: readonly SemanticToken[],
): ReadonlySet<number> {
  const ignored = new Set<number>();
  let runStart = 0;

  while (runStart < tokens.length) {
    if (!/^[A-Z]$/.test(tokens[runStart]?.raw ?? "")) {
      runStart += 1;
      continue;
    }

    let runEnd = runStart;
    while (
      runEnd + 1 < tokens.length &&
      /^[A-Z]$/.test(tokens[runEnd + 1]?.raw ?? "") &&
      /^[\s.\-\u00b7]*$/.test(
        value.slice(tokens[runEnd]?.end, tokens[runEnd + 1]?.start),
      )
    ) {
      runEnd += 1;
    }

    if (runEnd > runStart) {
      for (let index = runStart; index <= runEnd; index += 1) {
        ignored.add(index);
      }
    }
    runStart = runEnd + 1;
  }

  return ignored;
}

function addTerms(
  target: string[],
  tokens: readonly SemanticToken[],
  terms: ReadonlySet<string>,
  prefix: string,
): void {
  for (const token of tokens) {
    if (terms.has(token.value)) {
      target.push(`${prefix}:${token.value}`);
    }
  }
}

function addPhrases(
  target: string[],
  tokens: readonly SemanticToken[],
  phrases: readonly string[],
  prefix: string,
): void {
  const values = tokens.map((token) => token.value);
  for (const phrase of phrases) {
    const phraseTokens = phrase.split(" ");
    for (
      let start = 0;
      start <= values.length - phraseTokens.length;
      start += 1
    ) {
      if (
        phraseTokens.every(
          (phraseToken, offset) => values[start + offset] === phraseToken,
        )
      ) {
        target.push(`${prefix}:${phrase}`);
      }
    }
  }
}

function emptyFeatureVector(): Record<NarrationProtectedFeature, string[]> {
  return {
    PRONOUNS_AND_RESPONSIBLE_ACTORS: [],
    MODALITY: [],
    NEGATION: [],
    NUMBERS_PERCENT_CURRENCY: [],
    CONDITIONS_AND_TEMPORAL_ORDER: [],
    COMPARATIVES: [],
    OBLIGATION_AND_PERMISSION: [],
    ELIGIBILITY: [],
    ASSESSMENT: [],
    COMMISSION: [],
    GOVERNANCE: [],
    TENSE: [],
  };
}

function extractProtectedFeatureVector(value: string): FeatureVector {
  /*
   * Normalize symbols and numeric contexts before comparing them. This makes
   * "$10" equivalent to "ten dollars" while keeping "$10" vs "$12" distinct.
   */
  const normalized = normalizeSpokenText(value, {
    ensureTerminalPunctuation: false,
  });
  const tokens = semanticTokens(normalized);
  const vector = emptyFeatureVector();
  const spelledInitials = spelledInitialIndexes(normalized, tokens);

  tokens.forEach((token, index) => {
    if (PRONOUNS.has(token.value) && !spelledInitials.has(index)) {
      vector.PRONOUNS_AND_RESPONSIBLE_ACTORS.push(
        `pronoun:${token.value}`,
      );
    }
    if (RESPONSIBLE_ACTORS.has(token.value)) {
      vector.PRONOUNS_AND_RESPONSIBLE_ACTORS.push(`actor:${token.value}`);
    }
    if (RESPONSIBILITY_TERMS.has(token.value)) {
      vector.PRONOUNS_AND_RESPONSIBLE_ACTORS.push(
        `responsibility:${token.value}`,
      );
    }
    if (
      NUMBER_WORDS.has(token.value) ||
      QUANTITY_TERMS.has(token.value) ||
      /^\d+(?:[.,]\d+)*$/.test(token.value)
    ) {
      vector.NUMBERS_PERCENT_CURRENCY.push(`quantity:${token.value}`);
    }
    if (TENSE_AUXILIARIES.has(token.value)) {
      vector.TENSE.push(`auxiliary:${token.value}`);
    }
    const tenseForm = TENSE_FORMS[token.value];
    if (tenseForm) {
      vector.TENSE.push(`verb:${tenseForm}`);
    }
  });

  addPhrases(
    vector.PRONOUNS_AND_RESPONSIBLE_ACTORS,
    tokens,
    RESPONSIBLE_ACTOR_PHRASES,
    "actor",
  );
  addTerms(vector.MODALITY, tokens, MODALS, "modal");
  addTerms(vector.NEGATION, tokens, NEGATIONS, "negation");
  addTerms(
    vector.CONDITIONS_AND_TEMPORAL_ORDER,
    tokens,
    CONDITION_TERMS,
    "condition",
  );
  addPhrases(
    vector.CONDITIONS_AND_TEMPORAL_ORDER,
    tokens,
    CONDITION_PHRASES,
    "condition",
  );
  addTerms(vector.COMPARATIVES, tokens, COMPARATIVE_TERMS, "comparative");
  addPhrases(
    vector.COMPARATIVES,
    tokens,
    COMPARATIVE_PHRASES,
    "comparative",
  );
  addTerms(
    vector.OBLIGATION_AND_PERMISSION,
    tokens,
    OBLIGATION_PERMISSION_TERMS,
    "obligation-permission",
  );
  addTerms(vector.ELIGIBILITY, tokens, ELIGIBILITY_TERMS, "eligibility");
  addTerms(vector.ASSESSMENT, tokens, ASSESSMENT_TERMS, "assessment");
  addTerms(vector.COMMISSION, tokens, COMMISSION_TERMS, "commission");
  addTerms(vector.GOVERNANCE, tokens, GOVERNANCE_TERMS, "governance");

  for (const feature of NARRATION_PROTECTED_FEATURES) {
    vector[feature].sort((left, right) => left.localeCompare(right));
  }

  return vector;
}

function multisetDifference(
  left: readonly string[],
  right: readonly string[],
): string[] {
  const available = new Map<string, number>();
  for (const value of right) {
    available.set(value, (available.get(value) ?? 0) + 1);
  }

  const difference: string[] = [];
  for (const value of left) {
    const count = available.get(value) ?? 0;
    if (count > 0) {
      available.set(value, count - 1);
    } else {
      difference.push(value);
    }
  }
  return difference;
}

export function detectProtectedNarrationDrift(
  expectedSpokenText: string,
  actualSpokenText: string,
): readonly ProtectedNarrationFeatureDrift[] {
  const expected = extractProtectedFeatureVector(expectedSpokenText);
  const actual = extractProtectedFeatureVector(actualSpokenText);
  const drifts: ProtectedNarrationFeatureDrift[] = [];

  for (const feature of NARRATION_PROTECTED_FEATURES) {
    const missing = multisetDifference(expected[feature], actual[feature]);
    const added = multisetDifference(actual[feature], expected[feature]);
    if (missing.length || added.length) {
      drifts.push({
        feature,
        expected: expected[feature],
        actual: actual[feature],
        missing,
        added,
      });
    }
  }

  return drifts;
}

function highestClassification(
  classifications: readonly NarrationAlignmentClassification[],
): NarrationAlignmentClassification {
  return classifications.reduce<NarrationAlignmentClassification>(
    (highest, classification) =>
      CLASSIFICATION_RANK[classification] > CLASSIFICATION_RANK[highest]
        ? classification
        : highest,
    "ALLOWED_SPEECH_TRANSFORMATION",
  );
}

function lexicalSequence(value: string): string {
  return semanticTokens(value)
    .map((token) => token.value)
    .join(" ");
}

function isPunctuationOrSpacingOnlyDifference(
  expected: string,
  actual: string,
): boolean {
  return lexicalSequence(expected) === lexicalSequence(actual);
}

function normalizationOptions(
  context: NarrationAlignmentContext,
  ensureTerminalPunctuation: boolean,
): NormalizeSpokenTextOptions {
  return {
    pronunciations: context.pronunciations,
    approvedUrls: context.approvedUrls,
    approvedEmails: context.approvedEmails,
    ensureTerminalPunctuation,
  };
}

function mappingContainsOwnerItem(
  mappings: Readonly<Record<string, string>> | undefined,
  item: PronunciationOwnerReviewItem,
): boolean {
  return Object.entries(mappings ?? {}).some(
    ([source, spoken]) =>
      source.trim() &&
      spoken.trim() &&
      item.matching.test(source),
  );
}

function scopedMappingContainsOwnerItem(
  mappings:
    | Readonly<
        Record<string, NarrationLessonScopedPronunciation>
      >
    | undefined,
  item: PronunciationOwnerReviewItem,
): boolean {
  return Object.entries(mappings ?? {}).some(
    ([source, rule]) =>
      source.trim() &&
      rule.firstOccurrence.trim() &&
      rule.subsequentOccurrences.trim() &&
      item.matching.test(source),
  );
}

function isOwnerReviewItemResolved(
  item: PronunciationOwnerReviewItem,
  context: NarrationAlignmentContext,
): boolean {
  if (!context.ownerApprovalReference?.trim()) return false;

  if (item.kind === "term") {
    return (
      mappingContainsOwnerItem(context.pronunciations, item) ||
      scopedMappingContainsOwnerItem(
        context.lessonScopedPronunciations,
        item,
      )
    );
  }

  return (
    mappingContainsOwnerItem(context.approvedUrls, item) ||
    mappingContainsOwnerItem(context.approvedEmails, item)
  );
}

function pendingOwnerReviewItems(
  visibleText: string,
  context: NarrationAlignmentContext,
): readonly {
  item: PronunciationOwnerReviewItem;
  occurrenceCount: number;
}[] {
  return ownerReviewPronunciationsIn(visibleText)
    .filter((item) => !isOwnerReviewItemResolved(item, context))
    .map((item) => {
      const flags = item.matching.flags.includes("g")
        ? item.matching.flags
        : `${item.matching.flags}g`;
      const matching = new RegExp(item.matching.source, flags);
      return {
        item,
        occurrenceCount: [...visibleText.matchAll(matching)].length,
      };
    })
    .filter(({ occurrenceCount }) => occurrenceCount > 0);
}

export function auditNarrationFieldAlignment(
  input: NarrationAlignmentFieldInput,
): NarrationAlignmentFieldAudit {
  const context = input.context ?? {};
  const deterministicExpectedSpokenText =
    input.expectedSpokenText ??
    normalizeSpokenText(
      input.visibleText,
      normalizationOptions(
        context,
        input.ensureTerminalPunctuation !== false,
      ),
    );
  const expectedSpokenText =
    input.expectedSpokenText ??
    applyLessonScopedPronunciationsToText(
      deterministicExpectedSpokenText,
      context.lessonScopedPronunciations,
      createNarrationScopedPronunciationState(),
    );
  const protectedFeatureDrifts = detectProtectedNarrationDrift(
    expectedSpokenText,
    input.spokenText,
  );
  const ownerItems = pendingOwnerReviewItems(input.visibleText, context);
  const issues: NarrationAlignmentIssue[] = [];

  for (const drift of protectedFeatureDrifts) {
    issues.push({
      code: "PROTECTED_FEATURE_DRIFT",
      classification: "INVALID_SEMANTIC_DRIFT",
      feature: drift.feature,
      message: `${drift.feature} differs between deterministic expected speech and actual speech.`,
      expected: drift.expected.join(", "),
      actual: drift.actual.join(", "),
    });
  }

  for (const { item, occurrenceCount } of ownerItems) {
    issues.push({
      code: "PRONUNCIATION_REQUIRES_OWNER_REVIEW",
      classification: "REQUIRES_OWNER_REVIEW",
      ownerReviewItemId: item.id,
      occurrenceCount,
      message: `${item.visible} requires an owner-approved pronunciation choice (${String(occurrenceCount)} occurrence${occurrenceCount === 1 ? "" : "s"}).`,
    });
  }

  let changeKind: NarrationAlignmentChangeKind;
  if (input.changeKindOverride) {
    changeKind = input.changeKindOverride;
  } else if (input.spokenText === input.visibleText) {
    changeKind = "EXACT";
  } else if (input.spokenText === expectedSpokenText) {
    changeKind = "DETERMINISTIC_SPEECH_NORMALIZATION";
  } else if (
    isPunctuationOrSpacingOnlyDifference(
      expectedSpokenText,
      input.spokenText,
    )
  ) {
    changeKind = "PUNCTUATION_OR_SPACING_ONLY";
  } else {
    changeKind = "RESIDUAL_LEXICAL_DIFFERENCE";
    if (!protectedFeatureDrifts.length) {
      issues.push({
        code: "RESIDUAL_LEXICAL_DIFFERENCE",
        classification: "REQUIRES_OWNER_REVIEW",
        message:
          "Actual speech contains a lexical difference outside deterministic normalization.",
        expected: expectedSpokenText,
        actual: input.spokenText,
      });
    }
  }

  const classification = highestClassification(
    issues.map((issue) => issue.classification),
  );

  return {
    blockId: input.blockId,
    blockType: input.blockType,
    field: input.field,
    visibleText: input.visibleText,
    spokenText: input.spokenText,
    expectedSpokenText,
    classification,
    changeKind,
    issues,
    protectedFeatureDrifts,
    pendingOwnerReviewItemIds: ownerItems.map(({ item }) => item.id),
    pendingOwnerReviewOccurrenceCount: ownerItems.reduce(
      (count, ownerItem) => count + ownerItem.occurrenceCount,
      0,
    ),
  };
}

function listPath(block: NarrationListItemBlock): string | undefined {
  const path = block.source?.path ?? block.id;
  const match = path.match(/^(.*)\/li\[\d+\](?:#.*)?$/u);
  return match?.[1];
}

function listStyle(
  block: NarrationListItemBlock,
  context: NarrationAlignmentContext,
): {
  style: NarrationOrderedListStyle;
  policyStyle?: NarrationOrderedListStyle;
} {
  if (block.index === undefined) return { style: "plain" };

  const path = listPath(block);
  if (context.slug && path) {
    const policyStyle = resolveOrderedListStyle(
      context.slug,
      path,
      context.orderedListStyles,
    );
    return { style: policyStyle, policyStyle };
  }

  return { style: block.markerStyle ?? "ordinal" };
}

function capitalized(value: string): string {
  return value
    ? `${value[0]?.toLocaleUpperCase() ?? ""}${value.slice(1)}`
    : value;
}

function listSpokenSource(
  block: NarrationListItemBlock,
  style: NarrationOrderedListStyle,
): string {
  if (block.index === undefined || style === "plain") {
    return block.visibleText;
  }
  if (style === "step") {
    return `Step ${integerToSpokenWords(block.index)}: ${block.visibleText}`;
  }
  return `${capitalized(integerToOrdinalWords(block.index))}: ${block.visibleText}`;
}

function formDescriptionStartsWithExactLabel(
  block: NarrationFormFieldBlock,
): boolean {
  const label = block.visibleLabel.trim().replace(/[.:;,!?]+$/u, "");
  const description = block.visibleDescription?.trim() ?? "";
  if (!label || !description) return false;

  const prefix = description.slice(0, label.length);
  const boundary = description[label.length] ?? "";
  return (
    prefix.localeCompare(label, undefined, { sensitivity: "accent" }) === 0 &&
    (!boundary || /[\s.:;,!?\-\u2013\u2014]/u.test(boundary))
  );
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right),
  );
}

function scopedExpectedSpokenText(
  source: string,
  ensureTerminalPunctuation: boolean,
  context: NarrationAlignmentContext,
  state: NarrationScopedPronunciationState,
): string {
  return applyLessonScopedPronunciationsToText(
    normalizeSpokenText(
      source,
      normalizationOptions(context, ensureTerminalPunctuation),
    ),
    context.lessonScopedPronunciations,
    state,
  );
}

function auditNarrationBlockAlignmentWithState(
  block: NarrationBlock,
  context: NarrationAlignmentContext,
  scopedState: NarrationScopedPronunciationState,
): NarrationAlignmentBlockAudit {
  const fields: NarrationAlignmentFieldAudit[] = [];
  const blockIssues: NarrationAlignmentIssue[] = [];

  switch (block.type) {
    case "heading":
    case "paragraph":
    case "callout":
      fields.push(
        auditNarrationFieldAlignment({
          blockId: block.id,
          blockType: block.type,
          field: "text",
          visibleText: block.visibleText,
          spokenText: block.spokenText,
          expectedSpokenText: scopedExpectedSpokenText(
            block.visibleText,
            true,
            context,
            scopedState,
          ),
          context,
        }),
      );
      break;
    case "listItem": {
      const resolved = listStyle(block, context);
      const expected = scopedExpectedSpokenText(
        listSpokenSource(block, resolved.style),
        true,
        context,
        scopedState,
      );
      fields.push(
        auditNarrationFieldAlignment({
          blockId: block.id,
          blockType: block.type,
          field: "text",
          visibleText: block.visibleText,
          spokenText: block.spokenText,
          expectedSpokenText: expected,
          context,
        }),
      );
      if (
        resolved.policyStyle &&
        block.markerStyle &&
        block.markerStyle !== resolved.policyStyle
      ) {
        blockIssues.push({
          code: "LIST_MARKER_POLICY_MISMATCH",
          classification: "INVALID_SEMANTIC_DRIFT",
          message: `List marker ${block.markerStyle} conflicts with policy marker ${resolved.policyStyle}.`,
          expected: resolved.policyStyle,
          actual: block.markerStyle,
        });
      }
      break;
    }
    case "tableRow":
      block.cells.forEach((cell, index) => {
        const deterministicValueSource =
          /^(?:week|module)$/iu.test(cell.visibleLabel.trim()) &&
          /^\d{1,3}$/u.test(cell.visibleValue.trim())
            ? `${integerToSpokenWords(Number(cell.visibleValue.trim()))}.`
            : cell.visibleValue;
        const expectedLabel = scopedExpectedSpokenText(
          cell.visibleLabel,
          false,
          context,
          scopedState,
        );
        const expectedValue =
          deterministicValueSource === cell.visibleValue
            ? scopedExpectedSpokenText(
                cell.visibleValue,
                true,
                context,
                scopedState,
              )
            : applyLessonScopedPronunciationsToText(
                deterministicValueSource,
                context.lessonScopedPronunciations,
                scopedState,
              );
        fields.push(
          auditNarrationFieldAlignment({
            blockId: block.id,
            blockType: block.type,
            field: `cells[${String(index)}].label`,
            visibleText: cell.visibleLabel,
            spokenText: cell.spokenLabel,
            expectedSpokenText: expectedLabel,
            ensureTerminalPunctuation: false,
            context,
          }),
          auditNarrationFieldAlignment({
            blockId: block.id,
            blockType: block.type,
            field: `cells[${String(index)}].value`,
            visibleText: cell.visibleValue,
            spokenText: cell.spokenValue,
            expectedSpokenText: expectedValue,
            context,
          }),
        );
      });
      break;
    case "formField": {
      const expectedLabel = block.suppressDuplicateLabelInSpeech
        ? normalizeSpokenText(
            block.visibleLabel,
            normalizationOptions(context, false),
          )
        : scopedExpectedSpokenText(
            block.visibleLabel,
            false,
            context,
            scopedState,
          );
      fields.push(
        auditNarrationFieldAlignment({
          blockId: block.id,
          blockType: block.type,
          field: "label",
          visibleText: block.visibleLabel,
          spokenText: block.spokenLabel,
          expectedSpokenText: expectedLabel,
          ensureTerminalPunctuation: false,
          context,
          ...(block.suppressDuplicateLabelInSpeech
            ? { changeKindOverride: "EXACT_DUPLICATE_LABEL_SUPPRESSION" }
            : {}),
        }),
      );
      if (block.visibleDescription !== undefined) {
        const expectedDescription = scopedExpectedSpokenText(
          block.visibleDescription,
          true,
          context,
          scopedState,
        );
        fields.push(
          auditNarrationFieldAlignment({
            blockId: block.id,
            blockType: block.type,
            field: "description",
            visibleText: block.visibleDescription,
            spokenText: block.spokenDescription ?? "",
            expectedSpokenText: expectedDescription,
            context,
          }),
        );
      }
      if (
        block.suppressDuplicateLabelInSpeech &&
        !formDescriptionStartsWithExactLabel(block)
      ) {
        blockIssues.push({
          code: "INVALID_DUPLICATE_LABEL_SUPPRESSION",
          classification: "INVALID_SEMANTIC_DRIFT",
          message:
            "Form-label suppression is allowed only when the description starts with the exact visible label.",
          expected: block.visibleLabel,
          actual: block.visibleDescription ?? "",
        });
      }
      break;
    }
    case "sectionBreak":
      break;
  }

  const fieldIssues = fields.flatMap((field) => field.issues);
  const issues = [...fieldIssues, ...blockIssues];
  const protectedFeatureDrifts = fields.flatMap(
    (field) => field.protectedFeatureDrifts,
  );
  const pendingOwnerReviewItemIds = uniqueSorted(
    fields.flatMap((field) => field.pendingOwnerReviewItemIds),
  );
  const pendingOwnerReviewOccurrenceCount = fields.reduce(
    (count, field) => count + field.pendingOwnerReviewOccurrenceCount,
    0,
  );
  const classification = highestClassification([
    ...fields.map((field) => field.classification),
    ...blockIssues.map((issue) => issue.classification),
  ]);

  return {
    blockId: block.id,
    blockType: block.type,
    ...(block.source?.path ? { sourcePath: block.source.path } : {}),
    classification,
    fields,
    issues,
    protectedFeatureDrifts,
    pendingOwnerReviewItemIds,
    pendingOwnerReviewOccurrenceCount,
  };
}

export function auditNarrationBlockAlignment(
  block: NarrationBlock,
  context: NarrationAlignmentContext = {},
): NarrationAlignmentBlockAudit {
  return auditNarrationBlockAlignmentWithState(
    block,
    context,
    createNarrationScopedPronunciationState(),
  );
}

export function auditNarrationBlocksAlignment(
  blocks: readonly NarrationBlock[],
  context: NarrationAlignmentContext = {},
): NarrationAlignmentBlockAudit[] {
  const scopedState = createNarrationScopedPronunciationState();
  return blocks.map((block) =>
    auditNarrationBlockAlignmentWithState(
      block,
      context,
      scopedState,
    ),
  );
}

function emptyClassificationCounts(): Record<
  NarrationAlignmentClassification,
  number
> {
  return {
    ALLOWED_SPEECH_TRANSFORMATION: 0,
    REQUIRES_OWNER_REVIEW: 0,
    INVALID_SEMANTIC_DRIFT: 0,
  };
}

export function auditNarrationDocumentAlignment(
  document: NarrationDocument,
): NarrationAlignmentDocumentAudit {
  const context: NarrationAlignmentContext = {
    slug: document.slug,
    pronunciations: document.recipe.pronunciations,
    lessonScopedPronunciations:
      document.recipe.lessonScopedPronunciations,
    approvedUrls: document.recipe.approvedUrls,
    approvedEmails: document.recipe.approvedEmails,
    orderedListStyles: document.recipe.orderedListStyles,
    ownerApprovalReference: document.recipe.ownerApprovalReference,
  };
  const blocks = auditNarrationBlocksAlignment(
    document.blocks,
    context,
  );
  const fields = blocks.flatMap((block) => block.fields);
  const blocksByClassification = emptyClassificationCounts();
  const fieldsByClassification = emptyClassificationCounts();

  for (const block of blocks) {
    blocksByClassification[block.classification] += 1;
  }
  for (const field of fields) {
    fieldsByClassification[field.classification] += 1;
  }

  return {
    slug: document.slug,
    classification: highestClassification(
      blocks.map((block) => block.classification),
    ),
    blocks,
    summary: {
      totalBlocks: blocks.length,
      totalFields: fields.length,
      exactFields: fields.filter((field) => field.changeKind === "EXACT").length,
      transformedFields: fields.filter(
        (field) => field.changeKind !== "EXACT",
      ).length,
      blocksByClassification,
      fieldsByClassification,
      protectedFeatureDriftCount: fields.reduce(
        (count, field) => count + field.protectedFeatureDrifts.length,
        0,
      ),
      pendingOwnerReviewOccurrenceCount: fields.reduce(
        (count, field) =>
          count + field.pendingOwnerReviewOccurrenceCount,
        0,
      ),
    },
  };
}
