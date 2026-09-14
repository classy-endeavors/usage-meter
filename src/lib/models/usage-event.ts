import mongoose, { Schema } from "mongoose";

const usageEventSchema = new Schema(
  {
    saved_at: { type: Date, default: Date.now, index: true },
    git_user_name: { type: String, default: "" },
    git_user_email: { type: String, default: "" },
    project_name: { type: String, default: "unknown", index: true },
    git_project_name: { type: String, default: "" },
    prompt: { type: String, default: "" },
    output: { type: String, default: "" },
    thread_id: { type: String, default: "", index: true },
    conversation_id: { type: String, default: "" },
    generation_id: { type: String, index: true, sparse: true, unique: true },
    session_id: { type: String, default: "" },
    model: { type: String, default: "" },
    model_id: { type: String, default: "" },
    cursor_user_email: { type: String, default: "" },
    input_tokens: { type: Number, default: 0 },
    output_tokens: { type: Number, default: 0 },
    cache_read_tokens: { type: Number, default: 0 },
    cache_write_tokens: { type: Number, default: 0 },
    workspace_roots: { type: String, default: "" },
  },
  { timestamps: true },
);

export const UsageEvent =
  mongoose.models.UsageEvent ||
  mongoose.model("UsageEvent", usageEventSchema);
