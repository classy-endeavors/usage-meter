import { UsageEvent } from "@/lib/models/usage-event";
import { dbConnect } from "@/lib/mongoose";
import { savedAtFilter, type DateRange } from "@/lib/date-range";
import type { PipelineStage } from "mongoose";
import type {
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
    if (typeof value === "string" && value === "" && key === "generation_id") continue;
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
  const fields = compact(input);

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
}): UsageEventRow {
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
  return UsageEvent.aggregate<UserStat>(
    pipeline(range, [
    {
      $group: {
        _id: userEmailExpr,
        git_user_name: { $last: "$git_user_name" },
        events: { $sum: 1 },
        projects: { $addToSet: "$project_name" },
        total_tokens: { $sum: TOKEN_ADD },
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
      },
    },
    { $sort: { total_tokens: -1, events: -1 } },
    ]),
  );
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
    $or: [{ git_user_email: email }, { cursor_user_email: email }],
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
