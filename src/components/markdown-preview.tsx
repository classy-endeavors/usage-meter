"use client";

import { stripPromptAnalytics } from "@/lib/prompt-analytics";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="md-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {stripPromptAnalytics(content)}
      </ReactMarkdown>
    </div>
  );
}
