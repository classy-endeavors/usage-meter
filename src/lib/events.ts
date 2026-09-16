import { UsageEvent } from "@/lib/models/usage-event";
import { dbConnect } from "@/lib/mongoose";
import { savedAtFilter, type DateRange } from "@/lib/date-range";
import type { PipelineStage } from "mongoose";
import {
  countIntents,
  mergePromptAnalytics,
  roundAvg,
} from "@/lib/prompt-analytics";
import type {
  DailyPoint,
  ProjectStat,
  ThreadGroup,
  ThreadStat,
  UsageEvent as UsageEventRow,
  UsageEventInput,
  UserStat,
} from "@/lib/types";

const TOKEN_ADD = {
  $add: [
    { $ifNull: ["$input_tokens", 0] },
    { $ifNull: ["$output_tokens", 0] },
    { $ifNull: ["$cache_read_tokens", 0] },
    { $ifNull: ["$cache_write_tokens", 0] },
  ],
};

function compact(input: UsageEventInput) {
  const next: Record<string, string | number | Date> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value === "" && (key === "generation_id" || key === "prompt_intent")) continue;
    if (key === "saved_at") {
      next[key] = new Date(value);
      continue;
    }
    next[key] = value as string | number;
  }

  return next;
}

export async function upsertEvent(input: UsageEventInput) {
  await dbConnect();
  const fields = compact(mergePromptAnalytics(input));

  if (input.generation_id) {
    const updateFields = { ...fields };
    delete updateFields.saved_at;
    delete updateFields.generation_id;
    const doc = await UsageEvent.findOneAndUpdate(
      { generation_id: input.generation_id },
      {
        $set: updateFields,
        $setOnInsert: {
          saved_at: fields.saved_at || new Date(),
        },
      },
      { returnDocument: "after", upsert: true, runValidators: true },
    );
    return String(doc._id);
  }

  if (input.conversation_id && input.output) {
    const pending = await UsageEvent.findOne({
      conversation_id: input.conversation_id,
      $or: [{ output: { $exists: false } }, { output: "" }, { output: null }],
    }).sort({ saved_at: -1, createdAt: -1 });

    if (pending) {
      pending.set(fields);
      await pending.save();
      return String(pending._id);
    }
  }

  const created = await UsageEvent.create({
    saved_at: fields.saved_at || new Date(),
    ...fields,
    project_name: input.project_name || "unknown",
  });

  return String(created._id);
}

function toEvent(doc: {
  _id?: { toString(): string };
  saved_at?: Date | string;
  git_user_name?: string;
  git_user_email?: string;
  project_name?: string;
  git_project_name?: string;
  prompt?: string;
  output?: string;
  thread_id?: string;
  conversation_id?: string;
  generation_id?: string;
  session_id?: string;
  model?: string;
  model_id?: string;
  cursor_user_email?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  workspace_roots?: string;
  prompt_quality?: number;
  prompt_clarity?: number;
  prompt_specificity?: number;
  prompt_context?: number;
  prompt_actionability?: number;
  prompt_vagueness?: number;
  prompt_intent?: UsageEventRow["prompt_intent"];
}): UsageEventRow {
  const analytics = mergePromptAnalytics({
    output: doc.output,
    prompt_quality: doc.prompt_quality,
    prompt_clarity: doc.prompt_clarity,
    prompt_specificity: doc.prompt_specificity,
    prompt_context: doc.prompt_context,
    prompt_actionability: doc.prompt_actionability,
    prompt_vagueness: doc.prompt_vagueness,
    prompt_intent: doc.prompt_intent,
  });

  return {
    id: String(doc._id || ""),
    saved_at: doc.saved_at ? new Date(doc.saved_at).toISOString() : "",
    git_user_name: doc.git_user_name || "",
    git_user_email: doc.git_user_email || "",
    project_name: doc.project_name || "unknown",
    git_project_name: doc.git_project_name || "",
    prompt: doc.prompt || "",
    output: doc.output || "",
    thread_id: doc.thread_id || "",
    conversation_id: doc.conversation_id || "",
    generation_id: doc.generation_id || "",
    session_id: doc.session_id || "",
    model: doc.model || "",
    model_id: doc.model_id || "",
    cursor_user_email: doc.cursor_user_email || "",
    input_tokens: Number(doc.input_tokens || 0),
    output_tokens: Number(doc.output_tokens || 0),
    cache_read_tokens: Number(doc.cache_read_tokens || 0),
    cache_write_tokens: Number(doc.cache_write_tokens || 0),
    workspace_roots: doc.workspace_roots || "",
    prompt_quality: analytics.prompt_quality,
    prompt_clarity: analytics.prompt_clarity,
    prompt_specificity: analytics.prompt_specificity,
    prompt_context: analytics.prompt_context,
    prompt_actionability: analytics.prompt_actionability,
    prompt_vagueness: analytics.prompt_vagueness,
    prompt_intent: analytics.prompt_intent,
  };
}

function pipeline(range: DateRange | undefined, stages: PipelineStage[]): PipelineStage[] {
  const filter = savedAtFilter(range);
  return Object.keys(filter).length ? [{ $match: filter }, ...stages] : stages;
}

export async function listEvents(limit = 50, range?: DateRange): Promise<UsageEventRow[]> {
  await dbConnect();
  const docs = await UsageEvent.find(savedAtFilter(range))
    .sort({ saved_at: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return docs.map(toEvent);
}

export async function projectStats(range?: DateRange): Promise<ProjectStat[]> {
  await dbConnect();
  return UsageEvent.aggregate<ProjectStat>(
    pipeline(range, [
    {
      $group: {
        _id: {
          $cond: [
            { $or: [{ $eq: ["$project_name", ""] }, { $eq: ["$project_name", null] }] },
            "unknown",
            "$project_name",
          ],
        },
        git_project_name: { $last: "$git_project_name" },
        events: { $sum: 1 },
        input_tokens: { $sum: { $ifNull: ["$input_tokens", 0] } },
        output_tokens: { $sum: { $ifNull: ["$output_tokens", 0] } },
        cache_read_tokens: { $sum: { $ifNull: ["$cache_read_tokens", 0] } },
        cache_write_tokens: { $sum: { $ifNull: ["$cache_write_tokens", 0] } },
        total_tokens: {
          $sum: TOKEN_ADD,
        },
      },
    },
    {
      $project: {
        _id: 0,
        project_name: "$_id",
        git_project_name: { $ifNull: ["$git_project_name", ""] },
        events: 1,
        input_tokens: 1,
        output_tokens: 1,
        cache_read_tokens: 1,
        cache_write_tokens: 1,
        total_tokens: 1,
      },
    },
    { $sort: { total_tokens: -1, events: -1 } },
    ]),
  );
}

const threadIdExpr = {
  $let: {
    vars: {
      tid: { $ifNull: ["$thread_id", ""] },
      cid: { $ifNull: ["$conversation_id", ""] },
    },
    in: {
      $cond: [
        { $ne: ["$$tid", ""] },
        "$$tid",
        { $cond: [{ $ne: ["$$cid", ""] }, "$$cid", "unknown"] },
      ],
    },
  },
};

const userEmailExpr = {
  $let: {
    vars: {
      git: { $ifNull: ["$git_user_email", ""] },
      cursor: { $ifNull: ["$cursor_user_email", ""] },
    },
    in: {
      $cond: [
        { $ne: ["$$git", ""] },
        "$$git",
        { $cond: [{ $ne: ["$$cursor", ""] }, "$$cursor", "unknown"] },
      ],
    },
  },
};

export async function threadStats(range?: DateRange): Promise<ThreadStat[]> {
  await dbConnect();
  return UsageEvent.aggregate<ThreadStat>(
    pipeline(range, [
    {
      $group: {
        _id: threadIdExpr,
        project_name: { $last: "$project_name" },
        git_user_email: { $last: userEmailExpr },
        git_user_name: { $last: "$git_user_name" },
        events: { $sum: 1 },
        total_tokens: { $sum: TOKEN_ADD },
      },
    },
    {
      $project: {
        _id: 0,
        thread_id: "$_id",
        project_name: { $ifNull: ["$project_name", "unknown"] },
        git_user_email: { $ifNull: ["$git_user_email", ""] },
        git_user_name: { $ifNull: ["$git_user_name", ""] },
        events: 1,
        total_tokens: 1,
      },
    },
    { $sort: { total_tokens: -1, events: -1 } },
    ]),
  );
}

export async function userStats(range?: DateRange): Promise<UserStat[]> {
  await dbConnect();
  const rows = await UsageEvent.aggregate<
    Omit<UserStat, "intent_counts"> & { intents?: Array<string | null> }
  >(
    pipeline(range, [
    {
      $group: {
        _id: userEmailExpr,
        git_user_name: { $last: "$git_user_name" },
        events: { $sum: 1 },
        projects: { $addToSet: "$project_name" },
        total_tokens: { $sum: TOKEN_ADD },
        scored_prompts: {
          $sum: {
            $cond: [{ $gt: [{ $ifNull: ["$prompt_quality", 0] }, 0] }, 1, 0],
          },
        },
        blocked_prompts: {
          $sum: {
            $cond: [{ $lte: [{ $ifNull: ["$output_tokens", 0] }, 0] }, 1, 0],
          },
        },
        avg_quality: {
          $avg: {
            $cond: [
              { $gt: [{ $ifNull: ["$prompt_quality", 0] }, 0] },
              "$prompt_quality",
              null,
            ],
          },
        },
        avg_clarity: {
          $avg: {
            $cond: [
              { $gt: [{ $ifNull: ["$prompt_quality", 0] }, 0] },
              "$prompt_clarity",
              null,
            ],
          },
        },
        avg_specificity: {
          $avg: {
            $cond: [
              { $gt: [{ $ifNull: ["$prompt_quality", 0] }, 0] },
              "$prompt_specificity",
              null,
            ],
          },
        },
        avg_context: {
          $avg: {
            $cond: [
              { $gt: [{ $ifNull: ["$prompt_quality", 0] }, 0] },
              "$prompt_context",
              null,
            ],
          },
        },
        avg_actionability: {
          $avg: {
            $cond: [
              { $gt: [{ $ifNull: ["$prompt_quality", 0] }, 0] },
              "$prompt_actionability",
              null,
            ],
          },
        },
        avg_vagueness: {
          $avg: {
            $cond: [
              { $gt: [{ $ifNull: ["$prompt_quality", 0] }, 0] },
              "$prompt_vagueness",
              null,
            ],
          },
        },
        intents: {
          $push: {
            $cond: [
              { $gt: [{ $ifNull: ["$prompt_quality", 0] }, 0] },
              "$prompt_intent",
              null,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        git_user_email: "$_id",
        git_user_name: { $ifNull: ["$git_user_name", ""] },
        events: 1,
        projects: { $size: "$projects" },
        total_tokens: 1,
        scored_prompts: 1,
        blocked_prompts: 1,
        avg_quality: 1,
        avg_clarity: 1,
        avg_specificity: 1,
        avg_context: 1,
        avg_actionability: 1,
        avg_vagueness: 1,
        intents: 1,
      },
    },
    { $sort: { total_tokens: -1, events: -1 } },
    ]),
  );

  return rows.map((row) => ({
    git_user_email: row.git_user_email,
    git_user_name: row.git_user_name,
    events: row.events,
    projects: row.projects,
    total_tokens: row.total_tokens,
    scored_prompts: Number(row.scored_prompts || 0),
    blocked_prompts: Number(row.blocked_prompts || 0),
    avg_quality: roundAvg(row.avg_quality),
    avg_clarity: roundAvg(row.avg_clarity),
    avg_specificity: roundAvg(row.avg_specificity),
    avg_context: roundAvg(row.avg_context),
    avg_actionability: roundAvg(row.avg_actionability),
    avg_vagueness: roundAvg(row.avg_vagueness),
    intent_counts: countIntents(row.intents || []),
  }));
}

function utcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function fillDailyPoints(
  rows: Array<{ date: string; tokens: number; events: number }>,
  range?: DateRange,
): DailyPoint[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const to = utcDay(range?.to || new Date());
  const from = range?.from
    ? utcDay(range.from)
    : rows[0]
      ? new Date(`${rows[0].date}T00:00:00.000Z`)
      : to;

  const points: DailyPoint[] = [];
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    const date = cursor.toISOString().slice(0, 10);
    const hit = byDate.get(date);
    points.push({
      date,
      tokens: Number(hit?.tokens || 0),
      events: Number(hit?.events || 0),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

function trendMatch(range?: DateRange, filter?: { project?: string; user?: string }) {
  const clauses: Record<string, unknown>[] = [];
  const saved = savedAtFilter(range);
  if (Object.keys(saved).length) clauses.push(saved);

  const project = filter?.project?.trim();
  if (project) {
    clauses.push({
      $or: [{ project_name: project }, { git_project_name: project }],
    });
  }

  const user = filter?.user?.trim();
  if (user) {
    clauses.push({ $expr: { $eq: [userEmailExpr, user] } });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

export async function dailyTrend(
  range?: DateRange,
  filter?: { project?: string; user?: string },
): Promise<DailyPoint[]> {
  await dbConnect();
  const match = trendMatch(range, filter);
  const rows = await UsageEvent.aggregate<DailyPoint>([
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$saved_at" },
        },
        tokens: { $sum: TOKEN_ADD },
        events: { $sum: 1 },
      },
    },
    { $project: { _id: 0, date: "$_id", tokens: 1, events: 1 } },
    { $sort: { date: 1 } },
  ]);

  return fillDailyPoints(rows, range);
}

export async function projectDetail(
  projectName: string,
  range?: DateRange,
): Promise<ThreadGroup[]> {
  await dbConnect();
  const docs = await UsageEvent.find({
    $or: [{ project_name: projectName }, { git_project_name: projectName }],
    ...savedAtFilter(range),
  })
    .sort({ saved_at: -1, createdAt: -1 })
    .lean();

  return groupThreads(docs);
}

export async function userDetail(
  email: string,
  range?: DateRange,
): Promise<ThreadGroup[]> {
  await dbConnect();
  const docs = await UsageEvent.find({
    $expr: { $eq: [userEmailExpr, email] },
    ...savedAtFilter(range),
  })
    .sort({ saved_at: -1, createdAt: -1 })
    .lean();

  return groupThreads(docs);
}

function groupThreads(
  docs: Array<Parameters<typeof toEvent>[0]>,
): ThreadGroup[] {
  const threads = new Map<string, ThreadGroup>();

  for (const doc of docs) {
    const event = toEvent(doc);
    const key = event.thread_id || event.conversation_id || "unknown";
    const tokens =
      event.input_tokens +
      event.output_tokens +
      event.cache_read_tokens +
      event.cache_write_tokens;
    const current = threads.get(key) ?? {
      thread_id: key,
      project_name: event.project_name || "unknown",
      git_user_email: event.git_user_email || event.cursor_user_email || "",
      git_user_name: event.git_user_name || "",
      total_tokens: 0,
      latest_at: event.saved_at || "",
      prompts: [],
    };
    current.total_tokens += tokens;
    current.prompts.push(event);
    if (event.saved_at && event.saved_at > current.latest_at) {
      current.latest_at = event.saved_at;
    }
    threads.set(key, current);
  }

  return [...threads.values()]
    .map((thread) => ({
      ...thread,
      prompts: [...thread.prompts].sort((a, b) =>
        (b.saved_at || "").localeCompare(a.saved_at || ""),
      ),
    }))
    .sort((a, b) => (b.latest_at || "").localeCompare(a.latest_at || ""));
}
