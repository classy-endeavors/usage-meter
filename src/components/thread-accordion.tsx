"use client";

import { MarkdownPreview } from "@/components/markdown-preview";
import type { ThreadGroup } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

function formatTokens(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatWhen(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function shortId(value: string) {
  if (!value || value === "unknown") return "unknown";
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

export function ThreadAccordion({
  threads,
  showProject = false,
}: {
  threads: ThreadGroup[];
  showProject?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const listKey = useRef("");

  useEffect(() => {
    const nextKey = threads.map((thread) => thread.thread_id).join("|");
    if (nextKey && nextKey !== listKey.current) {
      listKey.current = nextKey;
      setOpenId(threads[0]?.thread_id ?? null);
    }
  }, [threads]);

  if (threads.length === 0) {
    return <p className="text-sm text-neutral-500">No prompts recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => {
        const open = openId === thread.thread_id;
        return (
          <article
            key={thread.thread_id}
            className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : thread.thread_id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-neutral-50"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 text-neutral-500 transition ${open ? "rotate-90 bg-teal-50 text-teal-700" : ""}`}
              >
                ›
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {thread.prompts[0]?.prompt
                    ? thread.prompts[0].prompt.replace(/\s+/g, " ").slice(0, 90)
                    : `Thread ${shortId(thread.thread_id)}`}
                  {thread.prompts[0]?.prompt && thread.prompts[0].prompt.length > 90 ? "…" : ""}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {formatWhen(thread.latest_at)}
                  {showProject ? ` · ${thread.project_name}` : ""}
                  {" · "}
                  {thread.git_user_email || thread.git_user_name || "unknown user"}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="font-mono text-sm font-medium">{formatTokens(thread.total_tokens)}</p>
                <p className="text-xs text-neutral-500">
                  {thread.prompts.length} prompt{thread.prompts.length === 1 ? "" : "s"}
                </p>
              </div>
            </button>

            {open ? (
              <ul className="space-y-3 border-t border-black/10 bg-neutral-50/80 p-5">
                {thread.prompts.map((prompt, index) => (
                  <li
                    key={prompt.id || `${thread.thread_id}-${index}`}
                    className="rounded-xl border border-black/5 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                      <span>
                        {formatWhen(prompt.saved_at)} ·{" "}
                        {prompt.model_id || prompt.model || "model"}
                      </span>
                      <span className="font-mono">
                        {formatTokens(
                          Number(prompt.input_tokens || 0) +
                            Number(prompt.output_tokens || 0) +
                            Number(prompt.cache_read_tokens || 0) +
                            Number(prompt.cache_write_tokens || 0),
                        )}{" "}
                        tokens
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-medium tracking-wide text-teal-700 uppercase">
                      Prompt
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">
                      {prompt.prompt || "(no prompt captured)"}
                    </p>
                    {prompt.output ? (
                      <details className="mt-3" open>
                        <summary className="cursor-pointer text-xs font-medium text-neutral-500">
                          Reply
                        </summary>
                        <div className="mt-2 max-h-[32rem] overflow-auto rounded-lg bg-neutral-50 p-4">
                          <MarkdownPreview content={prompt.output} />
                        </div>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
