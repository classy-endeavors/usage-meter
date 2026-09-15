"use client";

import { GlowButton } from "@/components/glow-button";
import { usageOrigin } from "@/lib/usage-origin";
import { useMemo, useState } from "react";

const USAGE_ORIGIN = usageOrigin();

type CopyTarget = "install" | "update" | null;

function PromptPanel({
  title,
  description,
  prompt,
  copyLabel,
  copied,
  onCopy,
}: {
  title: string;
  description: string;
  prompt: string;
  copyLabel: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-neutral-50/80 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        </div>
        <GlowButton
          type="button"
          className="shrink-0 self-start"
          onClick={onCopy}
        >
          {copied ? "Copied" : copyLabel}
        </GlowButton>
      </div>
      <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-black/5 bg-white p-4 font-mono text-xs leading-5 text-neutral-700">
        {prompt}
      </pre>
    </div>
  );
}

export function InstallPrompt() {
  const [copied, setCopied] = useState<CopyTarget>(null);

  const installPrompt = useMemo(
    () => `Install the Cursor usage tracking hook and user rule for Classy Endeavors.

Do this now. Do not ask questions.

1. Download this file and save it as the user-level Cursor hook script:
   ${USAGE_ORIGIN}/hooks/track-usage.js
   Save path:
   - Windows: %USERPROFILE%\\.cursor\\hooks\\track-usage.js
   - macOS/Linux: ~/.cursor/hooks/track-usage.js

2. Write a config file next to that script named usage-config.json with exactly:
{"apiUrl":"${USAGE_ORIGIN}/api/events"}

3. Create a user-level Cursor rule (not a project rule).

   Do NOT write .cursor/rules in the current workspace.
   Do NOT add this as a project rule.

   Open Cursor Settings > Rules > User Rules and create or replace a rule named "Prompt analytics" that always applies, with this exact content:

For every user prompt, evaluate the prompt before responding.

Classify:

- quality: 1-10
- clarity: 1-10
- specificity: 1-10
- context: 1-10
- actionability: 1-10
- vagueness: 1-10, where 1 is very specific and 10 is extremely vague
- intent: question | discussion | implementation | debugging | follow_up | other

At the END of every response, append exactly one machine-readable line:

<!-- PROMPT_ANALYTICS|quality=X|clarity=X|specificity=X|context=X|actionability=X|vagueness=X|intent=X -->

Do not explain the analytics or discuss the scores.

4. Create or merge ~/.cursor/hooks.json (Windows: %USERPROFILE%\\.cursor\\hooks.json) so beforeSubmitPrompt contains:
   - the scope-coach prompt hook from ${USAGE_ORIGIN}/hooks/scope-coach.json
   - { "command": "node ./hooks/track-usage.js" }
   and afterAgentResponse contains:
   - { "command": "node ./hooks/track-usage.js" }

If hooks.json already exists, merge these entries. Do not remove unrelated hooks.

5. Delete any older file-logging hook such as save-reply.js. This hook must POST to the API instead of writing reply files.

6. After the next Cursor chat, a row should appear on ${USAGE_ORIGIN}.

To refresh an existing install later, download and run:
${USAGE_ORIGIN}/scripts/update-usage-tracking.js`,
    [USAGE_ORIGIN],
  );

  const updatePrompt = useMemo(
    () => `Update Classy Endeavors Cursor usage tracking for an existing install.

Do this now. Do not ask questions.

1. Download the update script:
   ${USAGE_ORIGIN}/scripts/update-usage-tracking.js
   Save path:
   - Windows: %USERPROFILE%\\.cursor\\hooks\\update-usage-tracking.js
   - macOS/Linux: ~/.cursor/hooks/update-usage-tracking.js

2. Run it with Node (same Node you use for Cursor hooks):

   Windows (PowerShell):
   node $env:USERPROFILE\\.cursor\\hooks\\update-usage-tracking.js

   macOS/Linux:
   node ~/.cursor/hooks/update-usage-tracking.js

The script refreshes track-usage.js, usage-config.json, merges the scope-coach prompt into beforeSubmitPrompt, keeps the usage-tracking commands, does not remove unrelated hooks, and removes legacy save-reply.js if present. It does not add a project rule.

3. Create a user-level Cursor rule (not a project rule).

   Do NOT write .cursor/rules in the current workspace.
   Do NOT add this as a project rule.

   Open Cursor Settings > Rules > User Rules and create or replace a rule named "Prompt analytics" that always applies, with this exact content:

For every user prompt, evaluate the prompt before responding.

Classify:

- quality: 1-10
- clarity: 1-10
- specificity: 1-10
- context: 1-10
- actionability: 1-10
- vagueness: 1-10, where 1 is very specific and 10 is extremely vague
- intent: question | discussion | implementation | debugging | follow_up | other

At the END of every response, append exactly one machine-readable line:

<!-- PROMPT_ANALYTICS|quality=X|clarity=X|specificity=X|context=X|actionability=X|vagueness=X|intent=X -->

Do not explain the analytics or discuss the scores.

4. Send another Cursor chat message to confirm events still appear on ${USAGE_ORIGIN}.`,
    [USAGE_ORIGIN],
  );

  async function copyPrompt(target: "install" | "update") {
    const text = target === "install" ? installPrompt : updatePrompt;
    await navigator.clipboard.writeText(text);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold">Enable hooks and rules in Cursor</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Copy a prompt into Cursor to install or refresh tracking. Base URL:{" "}
          <span className="font-mono text-neutral-700">{USAGE_ORIGIN}</span>
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <PromptPanel
          title="First-time install"
          description="Hook script, config, user-level Prompt analytics rule, scope-coach, and hooks.json merge."
          prompt={installPrompt}
          copyLabel="Copy install prompt"
          copied={copied === "install"}
          onCopy={() => copyPrompt("install")}
        />
        <PromptPanel
          title="Update existing install"
          description="Re-download assets, merge hooks, and create a user-level Prompt analytics rule."
          prompt={updatePrompt}
          copyLabel="Copy update prompt"
          copied={copied === "update"}
          onCopy={() => copyPrompt("update")}
        />
      </div>
    </section>
  );
}
