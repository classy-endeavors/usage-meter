"use client";

import { MarkdownPreview } from "@/components/markdown-preview";
import { PromptScoreBars } from "@/components/prompt-meters";
import { hasOutputTokens } from "@/lib/prompt-analytics";
import type { ThreadGroup, UsageEvent } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

export type PromptGroup = {
  id: string;
  title: string;
  subtitle?: string;
  total_tokens: number;
  latest_at: string;
  prompts: UsageEvent[];
};

function formatTokens(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatWhen(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function sortGroups(map: Map<string, PromptGroup>): PromptGroup[] {
  return [...map.values()]
    .map((group) => ({
      ...group,
      prompts: [...group.prompts].sort((a, b) =>
        (b.saved_at || "").localeCompare(a.saved_at || ""),
      ),
    }))
    .sort(
      (a, b) =>
        b.total_tokens - a.total_tokens ||
        (b.latest_at || "").localeCompare(a.latest_at || ""),
    );
}

function addThread(map: Map<string, PromptGroup>, group: Omit<PromptGroup, "prompts" | "total_tokens" | "latest_at">, thread: ThreadGroup) {
  const current = map.get(group.id) ?? {
    ...group,
    total_tokens: 0,
    latest_at: "",
    prompts: [],
  };
  current.total_tokens += thread.total_tokens;
  current.prompts.push(...thread.prompts);
  if (thread.latest_at && thread.latest_at > current.latest_at) {
    current.latest_at = thread.latest_at;
  }
  if (!current.subtitle && group.subtitle) {
    current.subtitle = group.subtitle;
  }
  map.set(group.id, current);
}

export function groupThreadsByUser(threads: ThreadGroup[]): PromptGroup[] {
  const map = new Map<string, PromptGroup>();
  for (const thread of threads) {
    const email = thread.git_user_email?.trim();
    const name = thread.git_user_name?.trim();
    const id = email || name || "unknown";
    addThread(
      map,
      {
        id,
        title: email || name || "unknown user",
        subtitle: email && name ? name : undefined,
      },
      thread,
    );
  }
  return sortGroups(map);
}

export function groupThreadsByProject(threads: ThreadGroup[]): PromptGroup[] {
  const map = new Map<string, PromptGroup>();
  for (const thread of threads) {
    const id = thread.project_name?.trim() || "unknown";
    addThread(map, { id, title: id }, thread);
  }
  return sortGroups(map);
}

function PromptList({
  prompts,
  groupId,
}: {
  prompts: UsageEvent[];
  groupId: string;
}) {
  return (
    <ul className="space-y-3 border-t border-black/10 bg-neutral-50/80 p-5">
      {prompts.map((prompt, index) => {
        const noOutputTokens = !hasOutputTokens(prompt.output_tokens);
        const noReply = !prompt.output;

        return (
          <li
            key={prompt.id || `${groupId}-${index}`}
            className={
              noOutputTokens
                ? "rounded-xl border border-amber-200 bg-amber-50/80 p-4"
                : "rounded-xl border border-black/5 bg-white p-4"
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-neutral-500">
              <span>
                {formatWhen(prompt.saved_at)} · {prompt.model_id || prompt.model || "model"}
              </span>
              {noOutputTokens ? (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">
                  {noReply ? "No reply · blocked or pending" : "Output tokens not reported"}
                </span>
              ) : (
                <span className="font-mono">
                  {formatTokens(
                    Number(prompt.input_tokens || 0) +
                      Number(prompt.output_tokens || 0) +
                      Number(prompt.cache_read_tokens || 0) +
                      Number(prompt.cache_write_tokens || 0),
                  )}{" "}
                  tokens
                </span>
              )}
            </div>
            {noOutputTokens ? (
              <p className="mt-2 font-mono text-[11px] text-amber-800">
                {formatTokens(Number(prompt.input_tokens || 0))} in · — out
              </p>
            ) : null}
            <p className="mt-3 text-xs font-medium tracking-wide text-teal-700 uppercase">
              Prompt
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">
              {prompt.prompt || "(no prompt captured)"}
            </p>
            <PromptScoreBars event={prompt} />
            {prompt.output ? (
              <details className="mt-3" open={!noOutputTokens}>
                <summary className="cursor-pointer text-xs font-medium text-neutral-500">
                  Reply
                </summary>
                <div className="mt-2 max-h-[32rem] overflow-auto rounded-lg bg-neutral-50 p-4">
                  <MarkdownPreview content={prompt.output} />
                </div>
              </details>
            ) : noOutputTokens ? (
              <p className="mt-3 text-sm text-amber-800">
                The agent never replied, so there are no output tokens to count.
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function GroupedAccordion({ groups }: { groups: PromptGroup[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const listKey = useRef("");

  useEffect(() => {
    const nextKey = groups.map((group) => group.id).join("|");
    if (nextKey && nextKey !== listKey.current) {
      listKey.current = nextKey;
      setOpenId(groups[0]?.id ?? null);
    }
  }, [groups]);

  if (groups.length === 0) {
    return <p className="text-sm text-neutral-500">No prompts recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const open = openId === group.id;
        return (
          <article
            key={group.id}
            className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : group.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-neutral-50"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 text-neutral-500 transition ${open ? "rotate-90 bg-teal-50 text-teal-700" : ""}`}
              >
                ›
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{group.title}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {group.subtitle ? `${group.subtitle} · ` : ""}
                  {formatWhen(group.latest_at)}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="font-mono text-sm font-medium">
                  {formatTokens(group.total_tokens)}
                </p>
                <p className="text-xs text-neutral-500">
                  {group.prompts.length} prompt{group.prompts.length === 1 ? "" : "s"}
                </p>
              </div>
            </button>
            {open ? <PromptList prompts={group.prompts} groupId={group.id} /> : null}
          </article>
        );
      })}
    </div>
  );
}
