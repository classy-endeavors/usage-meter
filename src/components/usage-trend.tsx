"use client";

import { Loader } from "@/components/loader";
import type { DailyPoint, ProjectStat, UserStat } from "@/lib/types";
import { useEffect, useId, useMemo, useRef, useState } from "react";

function formatCompact(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const trim = (n: number) => {
    const digits = n >= 10 ? 0 : 1;
    return n.toFixed(digits).replace(/\.0$/, "");
  };

  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}K`;
  return String(value);
}

function formatTokens(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const PAD = { top: 20, right: 24, bottom: 36, left: 52 };
const CHART_HEIGHT = 288;

export function UsageTrendCard({
  points,
  loading,
  projects,
  users,
  project,
  user,
  onProject,
  onUser,
}: {
  points: DailyPoint[];
  loading?: boolean;
  projects: ProjectStat[];
  users: UserStat[];
  project: string;
  user: string;
  onProject: (value: string) => void;
  onUser: (value: string) => void;
}) {
  const gradientId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setHover(null);
  }, [points]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, [loading]);

  const height = CHART_HEIGHT;
  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = height - PAD.top - PAD.bottom;
  const maxTokens = Math.max(0, ...points.map((point) => point.tokens));
  const yMax = maxTokens === 0 ? 1 : maxTokens;
  const hasUsage = points.some((point) => point.tokens > 0 || point.events > 0);

  const coords = useMemo(() => {
    if (points.length === 0 || width === 0) return [];
    return points.map((point, index) => {
      const x =
        points.length === 1
          ? PAD.left + innerW / 2
          : PAD.left + (index / (points.length - 1)) * innerW;
      const y = PAD.top + innerH - (point.tokens / yMax) * innerH;
      return { x, y, ...point };
    });
  }, [innerH, innerW, points, width, yMax]);

  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area =
    coords.length === 0
      ? ""
      : `${line} L ${coords[coords.length - 1].x} ${PAD.top + innerH} L ${coords[0].x} ${PAD.top + innerH} Z`;

  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(6, Math.floor(innerW / 72))));
  const active = hover != null ? coords[hover] : null;
  const totalTokens = points.reduce((sum, point) => sum + point.tokens, 0);
  const tooltipLeft = active ? active.x > width * 0.62 : false;

  return (
    <section className="rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-black/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Daily usage</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Token trend by day
            {totalTokens ? ` · ${formatTokens(totalTokens)} tokens in range` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="trend-project">
            Project
          </label>
          <select
            id="trend-project"
            value={project}
            onChange={(event) => onProject(event.target.value)}
            className="max-w-56 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700"
          >
            <option value="">All projects</option>
            {project && !projects.some((item) => item.project_name === project) ? (
              <option value={project}>{project}</option>
            ) : null}
            {projects.map((item) => (
              <option key={item.project_name} value={item.project_name}>
                {item.project_name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="trend-user">
            User
          </label>
          <select
            id="trend-user"
            value={user}
            onChange={(event) => onUser(event.target.value)}
            className="max-w-64 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700"
          >
            <option value="">All users</option>
            {user && !users.some((item) => item.git_user_email === user) ? (
              <option value={user}>{user}</option>
            ) : null}
            {users.map((item) => (
              <option key={item.git_user_email} value={item.git_user_email}>
                {item.git_user_email || item.git_user_name || "unknown"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={wrapRef} className="relative w-full">
        {loading ? (
          <Loader label="Loading trend…" />
        ) : !hasUsage ? (
          <p className="px-4 py-16 text-center text-sm text-neutral-500">
            No daily usage in this range.
          </p>
        ) : (
          <>
            <svg
              width={Math.max(width, 1)}
              height={height}
              viewBox={`0 0 ${Math.max(width, 1)} ${height}`}
              className="block w-full"
              role="img"
              aria-label="Daily token usage trend"
              onMouseLeave={() => setHover(null)}
              onMouseMove={(event) => {
                const svg = event.currentTarget;
                const rect = svg.getBoundingClientRect();
                if (rect.width === 0) return;
                const x = ((event.clientX - rect.left) / rect.width) * Math.max(width, 1);
                let nearest = 0;
                let best = Infinity;
                coords.forEach((point, index) => {
                  const dist = Math.abs(point.x - x);
                  if (dist < best) {
                    best = dist;
                    nearest = index;
                  }
                });
                setHover(nearest);
              }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((frac) => {
                const y = PAD.top + innerH * (1 - frac);
                const label = formatCompact(Math.round(yMax * frac));
                return (
                  <g key={frac}>
                    <line
                      x1={PAD.left}
                      x2={Math.max(width, 1) - PAD.right}
                      y1={y}
                      y2={y}
                      stroke="#e5e5e5"
                      strokeWidth="1"
                    />
                    <text
                      x={PAD.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-neutral-400"
                      fontSize="11"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
              {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
              {line ? (
                <path
                  d={line}
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              ) : null}
              {coords.map((point, index) =>
                index % labelEvery === 0 || index === coords.length - 1 ? (
                  <text
                    key={point.date}
                    x={point.x}
                    y={height - 12}
                    textAnchor="middle"
                    className="fill-neutral-400"
                    fontSize="11"
                  >
                    {formatDay(point.date)}
                  </text>
                ) : null,
              )}
              {active ? (
                <g>
                  <line
                    x1={active.x}
                    x2={active.x}
                    y1={PAD.top}
                    y2={PAD.top + innerH}
                    stroke="#14b8a6"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <circle cx={active.x} cy={active.y} r="5" fill="#14b8a6" />
                  <circle cx={active.x} cy={active.y} r="2.5" fill="white" />
                </g>
              ) : null}
            </svg>
            {active ? (
              <div
                className="pointer-events-none absolute z-10 w-max rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm"
                style={{
                  left: active.x,
                  top: Math.max(8, active.y - 12),
                  transform: tooltipLeft
                    ? "translate(-12px, -100%)"
                    : "translate(12px, -100%)",
                }}
              >
                <p className="font-medium text-neutral-800">{formatDay(active.date)}</p>
                <p className="mt-1 text-neutral-600">{formatTokens(active.tokens)} tokens</p>
                <p className="text-neutral-500">
                  {active.events} turn{active.events === 1 ? "" : "s"}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
