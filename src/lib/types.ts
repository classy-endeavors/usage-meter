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
