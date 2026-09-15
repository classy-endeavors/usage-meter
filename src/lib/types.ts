import type { PromptIntent } from "@/lib/prompt-analytics";

export type UsageEventInput = {
  saved_at?: string;
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
  prompt_intent?: PromptIntent;
};

export type UsageEvent = UsageEventInput & {
  id: string;
  saved_at: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
};

export type UsageTotals = {
  events: number;
  total_tokens: number;
};

export type ProjectStat = {
  project_name: string;
  git_project_name: string;
  events: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
};

export type ThreadStat = {
  thread_id: string;
  project_name: string;
  git_user_email: string;
  git_user_name: string;
  events: number;
  total_tokens: number;
};

export type UserStat = {
  git_user_email: string;
  git_user_name: string;
  events: number;
  projects: number;
  total_tokens: number;
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

export type ThreadGroup = {
  thread_id: string;
  project_name: string;
  git_user_email: string;
  git_user_name: string;
  total_tokens: number;
  latest_at: string;
  prompts: UsageEvent[];
};
