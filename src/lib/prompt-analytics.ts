export const PROMPT_INTENTS = [
  "question",
  "discussion",
  "implementation",
  "debugging",
  "follow_up",
  "other",
] as const;

export type PromptIntent = (typeof PROMPT_INTENTS)[number];

export type PromptAnalytics = {
  prompt_quality: number;
  prompt_clarity: number;
  prompt_specificity: number;
  prompt_context: number;
  prompt_actionability: number;
  prompt_vagueness: number;
  prompt_intent: PromptIntent;
};

export const SCORE_METRICS = [
  { key: "prompt_quality", avgKey: "avg_quality", label: "Quality", invert: false },
  { key: "prompt_clarity", avgKey: "avg_clarity", label: "Clarity", invert: false },
  { key: "prompt_specificity", avgKey: "avg_specificity", label: "Specificity", invert: false },
  { key: "prompt_context", avgKey: "avg_context", label: "Context", invert: false },
  { key: "prompt_actionability", avgKey: "avg_actionability", label: "Actionable", invert: false },
  { key: "prompt_vagueness", avgKey: "avg_vagueness", label: "Vagueness", invert: true },
] as const;

export type ScoreMetric = (typeof SCORE_METRICS)[number];

export const INTENT_LABELS: Record<PromptIntent, string> = {
  question: "Question",
  discussion: "Discussion",
  implementation: "Implementation",
  debugging: "Debugging",
  follow_up: "Follow-up",
  other: "Other",
};

const ANALYTICS_RE =
  /<!--\s*PROMPT_ANALYTICS\|quality=(\d+)\|clarity=(\d+)\|specificity=(\d+)\|context=(\d+)\|actionability=(\d+)\|vagueness=(\d+)\|intent=([a-z_]+)\s*-->/i;

const INTENT_SET = new Set<string>(PROMPT_INTENTS);

function clampScore(value: string): number | null {
  const next = Number(value);
  if (!Number.isFinite(next)) return null;
  return Math.min(10, Math.max(1, Math.round(next)));
}

export function parsePromptAnalytics(text?: string | null): PromptAnalytics | null {
  if (!text) return null;
  const match = String(text).match(ANALYTICS_RE);
  if (!match) return null;

  const scores = [match[1], match[2], match[3], match[4], match[5], match[6]].map(clampScore);
  if (scores.some((value) => value == null)) return null;

  const intentRaw = String(match[7] || "").toLowerCase();
  const prompt_intent = (INTENT_SET.has(intentRaw) ? intentRaw : "other") as PromptIntent;

  return {
    prompt_quality: scores[0] as number,
    prompt_clarity: scores[1] as number,
    prompt_specificity: scores[2] as number,
    prompt_context: scores[3] as number,
    prompt_actionability: scores[4] as number,
    prompt_vagueness: scores[5] as number,
    prompt_intent,
  };
}

export function stripPromptAnalytics(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/<!--\s*PROMPT_ANALYTICS\|[^>]*-->/gi, "")
    .trim();
}

export function mergePromptAnalytics<T extends Partial<PromptAnalytics> & { output?: string }>(
  input: T,
): T & Partial<PromptAnalytics> {
  const parsed = parsePromptAnalytics(input.output);
  if (!parsed) return input;
  return {
    ...parsed,
    ...input,
    prompt_quality: input.prompt_quality ?? parsed.prompt_quality,
    prompt_clarity: input.prompt_clarity ?? parsed.prompt_clarity,
    prompt_specificity: input.prompt_specificity ?? parsed.prompt_specificity,
    prompt_context: input.prompt_context ?? parsed.prompt_context,
    prompt_actionability: input.prompt_actionability ?? parsed.prompt_actionability,
    prompt_vagueness: input.prompt_vagueness ?? parsed.prompt_vagueness,
    prompt_intent: input.prompt_intent ?? parsed.prompt_intent,
  };
}

export type PromptScoreAverages = {
  scored_prompts: number;
  blocked_prompts: number;
  avg_quality: number | null;
  avg_clarity: number | null;
  avg_specificity: number | null;
  avg_context: number | null;
  avg_actionability: number | null;
  avg_vagueness: number | null;
  intent_counts: Partial<Record<PromptIntent, number>>;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function hasOutputTokens(outputTokens?: number | null): boolean {
  return Number(outputTokens || 0) > 0;
}

export function aggregatePromptScores(
  events: Array<Partial<PromptAnalytics> & { output?: string; output_tokens?: number }>,
): PromptScoreAverages {
  const quality: number[] = [];
  const clarity: number[] = [];
  const specificity: number[] = [];
  const context: number[] = [];
  const actionability: number[] = [];
  const vagueness: number[] = [];
  const intent_counts: Partial<Record<PromptIntent, number>> = {};
  let blocked_prompts = 0;

  for (const event of events) {
    const scores = mergePromptAnalytics(event);
    if (!hasOutputTokens(event.output_tokens)) blocked_prompts += 1;
    if (scores.prompt_quality == null) continue;
    quality.push(scores.prompt_quality);
    clarity.push(scores.prompt_clarity ?? 0);
    specificity.push(scores.prompt_specificity ?? 0);
    context.push(scores.prompt_context ?? 0);
    actionability.push(scores.prompt_actionability ?? 0);
    vagueness.push(scores.prompt_vagueness ?? 0);
    if (scores.prompt_intent) {
      intent_counts[scores.prompt_intent] = (intent_counts[scores.prompt_intent] || 0) + 1;
    }
  }

  return {
    scored_prompts: quality.length,
    blocked_prompts,
    avg_quality: average(quality),
    avg_clarity: average(clarity),
    avg_specificity: average(specificity),
    avg_context: average(context),
    avg_actionability: average(actionability),
    avg_vagueness: average(vagueness),
    intent_counts,
  };
}

export function roundAvg(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

export function countIntents(values: Array<string | null | undefined>): Partial<Record<PromptIntent, number>> {
  const counts: Partial<Record<PromptIntent, number>> = {};
  for (const value of values) {
    if (!value) continue;
    const intent = INTENT_SET.has(value) ? (value as PromptIntent) : "other";
    counts[intent] = (counts[intent] || 0) + 1;
  }
  return counts;
}
