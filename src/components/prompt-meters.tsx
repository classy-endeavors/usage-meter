"use client";

import {
  INTENT_LABELS,
  SCORE_METRICS,
  aggregatePromptScores,
  type PromptIntent,
  type PromptScoreAverages,
  type ScoreMetric,
} from "@/lib/prompt-analytics";
import type { ThreadGroup, UsageEvent, UserStat } from "@/lib/types";
import { Loader } from "@/components/loader";

function formatTokens(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function meterTone(
  value: number | null,
  invert?: boolean,
): "empty" | "good" | "mid" | "poor" {
  if (value == null) return "empty";
  const rank = invert ? 11 - value : value;
  if (rank >= 7) return "good";
  if (rank >= 4) return "mid";
  return "poor";
}

const TONE_COLOR = {
  empty: "#e5e5e5",
  good: "#14b8a6",
  mid: "#f59e0b",
  poor: "#e11d48",
};

function ScoreMeter({
  label,
  value,
  invert,
  size = "md",
}: {
  label: string;
  value: number | null;
  invert?: boolean;
  size?: "sm" | "md";
}) {
  const tone = meterTone(value, invert);
  const pct = value == null ? 0 : (value / 10) * 100;
  const dim = size === "sm" ? "h-14 w-14" : "h-[4.5rem] w-[4.5rem]";
  const inner = size === "sm" ? "inset-1.5 text-sm" : "inset-2 text-base";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`relative ${dim} rounded-full`}
        style={{
          background: `conic-gradient(${TONE_COLOR[tone]} ${pct}%, #ececec 0)`,
        }}
        title={invert ? `${label}: higher means more vague` : label}
      >
        <div
          className={`absolute ${inner} flex items-center justify-center rounded-full bg-white font-semibold`}
        >
          {value == null ? "—" : value}
        </div>
      </div>
      <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
        {label}
      </p>
    </div>
  );
}

function ScoreBar({
  metric,
  value,
}: {
  metric: ScoreMetric;
  value: number | null;
}) {
  const tone = meterTone(value, metric.invert);
  const pct = value == null ? 0 : (value / 10) * 100;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-neutral-500">{metric.label}</span>
        <span className="font-mono text-neutral-700">
          {value == null ? "—" : value}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: TONE_COLOR[tone] }}
        />
      </div>
    </div>
  );
}

function IntentPills({
  counts,
}: {
  counts: Partial<Record<PromptIntent, number>>;
}) {
  const entries = (Object.entries(counts) as Array<[PromptIntent, number]>).filter(
    ([, count]) => count > 0,
  );
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries
        .sort((a, b) => b[1] - a[1])
        .map(([intent, count]) => (
          <span
            key={intent}
            className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
          >
            {INTENT_LABELS[intent]} · {count}
          </span>
        ))}
    </div>
  );
}

export function PromptScoreBars({ event }: { event: UsageEvent }) {
  if (event.prompt_quality == null) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-teal-700 uppercase">
          Prompt scores
        </p>
        {event.prompt_intent ? (
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
            {INTENT_LABELS[event.prompt_intent]}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {SCORE_METRICS.map((metric) => (
          <ScoreBar key={metric.key} metric={metric} value={event[metric.key] ?? null} />
        ))}
      </div>
    </div>
  );
}

export function UserScoreMeters({
  averages,
  compact,
}: {
  averages: PromptScoreAverages | UserStat;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className={`grid grid-cols-3 gap-3 ${compact ? "" : "sm:grid-cols-6"}`}>
        {SCORE_METRICS.map((metric) => (
          <ScoreMeter
            key={metric.key}
            label={metric.label}
            value={averages[metric.avgKey]}
            invert={metric.invert}
            size={compact ? "sm" : "md"}
          />
        ))}
      </div>
      <IntentPills counts={averages.intent_counts} />
    </div>
  );
}

export function UserAnalyticsPanel({
  threads,
  title = "Prompt quality",
}: {
  threads: ThreadGroup[];
  title?: string;
}) {
  const averages = aggregatePromptScores(threads.flatMap((thread) => thread.prompts));

  return (
    <section className="mb-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-neutral-500">
            {averages.scored_prompts} scored prompt
            {averages.scored_prompts === 1 ? "" : "s"}
            {averages.blocked_prompts
              ? ` · ${averages.blocked_prompts} with no output tokens`
              : ""}
          </p>
        </div>
      </div>
      {averages.scored_prompts === 0 ? (
        <p className="text-sm text-neutral-500">
          No prompt scores yet. Scores appear after the agent replies with the
          analytics line.
        </p>
      ) : (
        <UserScoreMeters averages={averages} />
      )}
    </section>
  );
}

export function UserAnalyticsGrid({
  users,
  loading,
  onSelect,
}: {
  users: UserStat[];
  loading?: boolean;
  onSelect: (email: string) => void;
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <Loader label="Loading users…" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white px-6 py-10 text-sm text-neutral-500 shadow-sm">
        No users yet.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Prompt quality by user</h2>
        <p className="text-xs text-neutral-500">Click a card for details</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {users.map((user) => (
          <button
            key={user.git_user_email}
            type="button"
            onClick={() => onSelect(user.git_user_email)}
            className="rounded-2xl border border-black/10 bg-white p-5 text-left shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {user.git_user_email || "unknown"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {user.git_user_name || "—"} · {user.projects} project
                  {user.projects === 1 ? "" : "s"} · {user.events} turn
                  {user.events === 1 ? "" : "s"}
                </p>
              </div>
              <p className="shrink-0 font-mono text-sm font-medium">
                {formatTokens(Number(user.total_tokens))}
              </p>
            </div>
            <div className="mt-4">
              {user.scored_prompts > 0 ? (
                <UserScoreMeters averages={user} compact />
              ) : (
                <p className="text-xs text-neutral-500">No prompt scores yet.</p>
              )}
            </div>
            {user.blocked_prompts > 0 ? (
              <p className="mt-3 text-[11px] font-medium text-amber-700">
                {user.blocked_prompts} turn{user.blocked_prompts === 1 ? "" : "s"}{" "}
                with no output tokens
              </p>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
