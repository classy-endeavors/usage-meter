"use client";

import { GlowButton } from "@/components/glow-button";
import { useMemo, useState } from "react";

const USAGE_ORIGIN = "https://usage.classyendeavors.com";

export function InstallPrompt() {
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(
    () => `Install the Cursor usage tracking hook for Classy Endeavors.

Do this now. Do not ask questions.

1. Download this file and save it as the user-level Cursor hook script:
   ${USAGE_ORIGIN}/hooks/track-usage.js
   Save path:
   - Windows: %USERPROFILE%\\.cursor\\hooks\\track-usage.js
   - macOS/Linux: ~/.cursor/hooks/track-usage.js

2. Write a config file next to that script named usage-config.json with exactly:
{"apiUrl":"${USAGE_ORIGIN}/api/events"}

3. Create or merge ~/.cursor/hooks.json (Windows: %USERPROFILE%\\.cursor\\hooks.json) so it contains:

{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      { "command": "node ./hooks/track-usage.js" }
    ],
    "afterAgentResponse": [
      { "command": "node ./hooks/track-usage.js" }
    ]
  }
}

If hooks.json already exists, merge these two hook entries. Do not remove unrelated hooks.

4. Delete any older file-logging hook such as save-reply.js. This hook must POST to the API instead of writing reply files.

5. After the next Cursor chat, a row should appear on ${USAGE_ORIGIN}.`,
    [],
  );

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Enable this hook in Cursor</h2>
          <p className="mt-1 text-sm text-neutral-500">
            This prompt always points at usage.classyendeavors.com, even when
            you preview locally.
          </p>
        </div>
        <GlowButton type="button" onClick={copyPrompt}>
          {copied ? "Copied" : "Copy prompt"}
        </GlowButton>
      </div>
      <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-5 font-mono text-xs leading-5 text-neutral-700">
        {prompt}
      </pre>
    </section>
  );
}
