"use client";

import { DateFilter, type RangePreset } from "@/components/date-filter";
import { InstallPrompt } from "@/components/install-prompt";
import { Loader, Spinner } from "@/components/loader";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import {
  groupThreadsByProject,
  groupThreadsByUser,
  GroupedAccordion,
} from "@/components/thread-accordion";
import type { ProjectStat, ThreadGroup, ThreadStat, UserStat } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type Tab = "threads" | "projects" | "users" | "setup";

type Stats = {
  totals: {
    events: number;
    total_tokens: number;
    projects: number;
    threads: number;
    users: number;
  };
  projects: ProjectStat[];
  threads: ThreadStat[];
  users: UserStat[];
};

function formatCompact(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const trim = (n: number) => {
    const digits = n >= 10 ? 0 : 1;
    return n.toFixed(digits).replace(/\.0$/, "");
  };

  if (abs >= 1_000_000_000_000) return `${sign}${trim(abs / 1_000_000_000_000)}T`;
  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}K`;
  return String(value);
}

function formatTokens(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function shortId(value: string) {
  if (!value || value === "unknown") return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function rangeParams(range: RangePreset, from: string, to: string) {
  const params = new URLSearchParams({ range });
  if (range === "custom") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return params.toString();
}

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("projects");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [detailThreads, setDetailThreads] = useState<ThreadGroup[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [range, setRange] = useState<RangePreset>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = useMemo(() => rangeParams(range, from, to), [range, from, to]);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/stats?${query}`, { credentials: "include" });
      if (response.status === 401) {
        window.location.href = "/unlock";
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not load usage");
        return;
      }
      setStats(data);
    } catch {
      setError("Could not load usage");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openProject(name: string) {
    setProjectName(name);
    setUserEmail(null);
    setTab("projects");
    setLoadingDetail(true);
    try {
      const response = await fetch(
        `/api/projects?name=${encodeURIComponent(name)}&${query}`,
        { credentials: "include" },
      );
      const data = await response.json();
      setDetailThreads(data.threads || []);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function openUser(email: string) {
    setUserEmail(email);
    setProjectName(null);
    setTab("users");
    setLoadingDetail(true);
    try {
      const response = await fetch(
        `/api/users?email=${encodeURIComponent(email)}&${query}`,
        { credentials: "include" },
      );
      const data = await response.json();
      setDetailThreads(data.threads || []);
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (projectName) void openProject(projectName);
    if (userEmail) void openUser(userEmail);
    // Reload the open detail view when the date range changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function resetDetail() {
    setProjectName(null);
    setUserEmail(null);
    setDetailThreads([]);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "threads", label: "Threads" },
    { id: "projects", label: "Projects" },
    { id: "users", label: "Users" },
    { id: "setup", label: "Setup" },
  ];

  return (
    <div className="flex min-h-full flex-col bg-white">
      <SiteHeader
        right={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium hover:text-teal-600 disabled:opacity-60"
          >
            {loading ? <Spinner /> : null}
            {loading ? (stats ? "Refreshing" : "Loading") : "Refresh"}
          </button>
        }
      />

      <main className="mx-auto w-full max-w-[88rem] flex-1 px-6 pb-16 pt-8 lg:px-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-teal-600">Classy Endeavors</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
              We measure scalable software
            </h1>
            <p className="mt-4 text-neutral-500">
              Token usage across Cursor threads, projects, and git users — built
              for the team at{" "}
              <a href="https://www.classyendeavors.com/" className="font-medium text-neutral-800">
                classyendeavors.com
              </a>
              .
            </p>
          </div>
          <section className="grid w-full gap-4 sm:grid-cols-4 lg:max-w-4xl">
            <StatCard
              label="Projects"
              value={String(stats?.totals.projects ?? 0)}
              loading={loading && !stats}
            />
            <StatCard
              label="Threads"
              value={String(stats?.totals.threads ?? 0)}
              loading={loading && !stats}
            />
            <StatCard
              label="Users"
              value={String(stats?.totals.users ?? 0)}
              loading={loading && !stats}
            />
            <StatCard
              label="Total tokens"
              value={formatCompact(stats?.totals.total_tokens ?? 0)}
              title={formatTokens(stats?.totals.total_tokens ?? 0)}
              loading={loading && !stats}
            />
          </section>
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <nav className="flex flex-wrap gap-2 rounded-full border border-black/10 bg-white p-1 shadow-sm w-fit">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  resetDetail();
                }}
                className={`rounded-full px-5 py-2 text-sm font-medium ${
                  tab === item.id
                    ? "bg-black text-white"
                    : "text-neutral-600 hover:text-teal-600"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {tab !== "setup" ? (
            <DateFilter
              range={range}
              from={from}
              to={to}
              onRange={(value) => {
                setRange(value);
                if (value === "custom" && !from && !to) {
                  const end = new Date();
                  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setFrom(start.toISOString().slice(0, 10));
                  setTo(end.toISOString().slice(0, 10));
                }
              }}
              onFrom={setFrom}
              onTo={setTo}
            />
          ) : null}
        </div>

        <section className="mt-8">
          {tab === "threads" ? (
            <UsageTable
              caption="Highest thread consumption"
              empty="No threads yet."
              loading={loading}
              headers={["Thread", "Project", "User", "Turns", "Tokens"]}
              rows={(stats?.threads || []).map((thread) => [
                shortId(thread.thread_id),
                thread.project_name,
                thread.git_user_email || thread.git_user_name || "—",
                String(thread.events),
                formatTokens(Number(thread.total_tokens)),
              ])}
            />
          ) : null}

          {tab === "projects" && !projectName ? (
            <UsageTable
              caption="Highest project consumption"
              empty="No projects yet. Install the hook from Setup."
              loading={loading}
              headers={["Project", "Git repo", "Turns", "Tokens"]}
              onRowClick={(index) => {
                const project = stats?.projects[index];
                if (project) void openProject(project.project_name);
              }}
              rows={(stats?.projects || []).map((project) => [
                project.project_name,
                project.git_project_name || "—",
                String(project.events),
                formatTokens(Number(project.total_tokens)),
              ])}
            />
          ) : null}

          {tab === "projects" && projectName ? (
            <DetailPane
              backLabel="All projects"
              title={projectName}
              hint="Users are highest first. Click a user to expand their prompts."
              loading={loadingDetail}
              threads={detailThreads}
              groupBy="user"
              onBack={resetDetail}
            />
          ) : null}

          {tab === "users" && !userEmail ? (
            <UsageTable
              caption="Highest user consumption by git email"
              empty="No users yet."
              loading={loading}
              headers={["Git email", "Name", "Projects", "Turns", "Tokens"]}
              onRowClick={(index) => {
                const user = stats?.users[index];
                if (user) void openUser(user.git_user_email);
              }}
              rows={(stats?.users || []).map((user) => [
                user.git_user_email,
                user.git_user_name || "—",
                String(user.projects),
                String(user.events),
                formatTokens(Number(user.total_tokens)),
              ])}
            />
          ) : null}

          {tab === "users" && userEmail ? (
            <DetailPane
              backLabel="All users"
              title={userEmail}
              hint="Projects are highest first. Click a project to expand its prompts."
              loading={loadingDetail}
              threads={detailThreads}
              groupBy="project"
              onBack={resetDetail}
            />
          ) : null}

          {tab === "setup" ? <InstallPrompt /> : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatCard({
  label,
  value,
  title,
  loading,
}: {
  label: string;
  value: string;
  title?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-5 py-6 shadow-sm">
      <p className="text-xs tracking-wide text-neutral-500 uppercase">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded-md bg-neutral-100" />
      ) : (
        <p
          className={`mt-2 text-3xl font-semibold ${title ? "group relative w-fit cursor-help" : ""}`}
        >
          {value}
          {title ? (
            <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 hidden rounded-md bg-neutral-900 px-2 py-1 text-xs font-normal whitespace-nowrap text-white shadow-sm group-hover:block">
              {title}
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}

function UsageTable({
  caption,
  empty,
  headers,
  rows,
  loading,
  onRowClick,
}: {
  caption: string;
  empty: string;
  headers: string[];
  rows: string[][];
  loading?: boolean;
  onRowClick?: (index: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
        <h2 className="text-sm font-semibold">{caption}</h2>
        {onRowClick ? (
          <p className="text-xs text-neutral-500">Click a row for details</p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs tracking-wide text-neutral-500 uppercase">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-6 py-3.5 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? (
              <tr>
                <td colSpan={headers.length}>
                  <Loader label="Loading usage…" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-10 text-neutral-500">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={`${row[0]}-${index}`}
                  className={onRowClick ? "cursor-pointer hover:bg-teal-50/60" : ""}
                  onClick={() => onRowClick?.(index)}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-6 py-4 ${cellIndex === 0 ? "font-medium" : "text-neutral-600"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailPane({
  backLabel,
  title,
  hint,
  loading,
  threads,
  groupBy,
  onBack,
}: {
  backLabel: string;
  title: string;
  hint: string;
  loading: boolean;
  threads: ThreadGroup[];
  groupBy: "user" | "project";
  onBack: () => void;
}) {
  const groups =
    groupBy === "user"
      ? groupThreadsByUser(threads)
      : groupThreadsByProject(threads);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-teal-700 hover:text-teal-500"
          >
            ← {backLabel}
          </button>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{hint}</p>
        </div>
      </div>
      {loading ? (
        <Loader label={groupBy === "user" ? "Loading users…" : "Loading projects…"} />
      ) : (
        <GroupedAccordion groups={groups} />
      )}
    </div>
  );
}
