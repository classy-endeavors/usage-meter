const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");

const TRACK_USAGE_COMMAND = "node ./hooks/track-usage.js";

const HOOK_ENTRIES = {
  beforeSubmitPrompt: [{ command: TRACK_USAGE_COMMAND }],
  afterAgentResponse: [{ command: TRACK_USAGE_COMMAND }],
};

function cursorDir() {
  return path.join(os.homedir(), ".cursor");
}

function getOrigin() {
  if (process.env.USAGE_ORIGIN?.trim()) {
    return process.env.USAGE_ORIGIN.trim().replace(/\/+$/, "");
  }

  const configPath = path.join(cursorDir(), "hooks", "usage-config.json");
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (config.apiUrl) {
      return new URL(config.apiUrl).origin;
    }
  } catch {
    // fall through
  }

  throw new Error(
    "Set USAGE_ORIGIN or configure ~/.cursor/hooks/usage-config.json with apiUrl.",
  );
}

function download(url) {
  return new Promise((resolve, reject) => {
    const request = (target) => {
      https
        .get(target, (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            request(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${target}`));
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        })
        .on("error", reject);
    };
    request(url);
  });
}

function mergeHooks(existing) {
  const base = existing && typeof existing === "object" ? existing : {};
  const hooks =
    base.hooks && typeof base.hooks === "object" ? { ...base.hooks } : {};

  for (const [event, entries] of Object.entries(HOOK_ENTRIES)) {
    const current = Array.isArray(hooks[event]) ? [...hooks[event]] : [];
    for (const entry of entries) {
      const exists = current.some(
        (item) => item && item.command === entry.command,
      );
      if (!exists) {
        current.push(entry);
      }
    }
    hooks[event] = current;
  }

  return { ...base, version: base.version ?? 1, hooks };
}

async function main() {
  const ORIGIN = getOrigin();
  const root = cursorDir();
  const hooksDir = path.join(root, "hooks");
  const rulesDir = path.join(root, "rules");

  fs.mkdirSync(hooksDir, { recursive: true });
  fs.mkdirSync(rulesDir, { recursive: true });

  const [trackUsage, rule] = await Promise.all([
    download(`${ORIGIN}/hooks/track-usage.js`),
    download(`${ORIGIN}/rules/prompt-analytics.mdc`),
  ]);

  fs.writeFileSync(path.join(hooksDir, "track-usage.js"), trackUsage);
  fs.writeFileSync(
    path.join(hooksDir, "usage-config.json"),
    `${JSON.stringify({ apiUrl: `${ORIGIN}/api/events` })}\n`,
  );
  fs.writeFileSync(path.join(rulesDir, "prompt-analytics.mdc"), rule);

  const hooksJsonPath = path.join(root, "hooks.json");
  let existing = {};
  if (fs.existsSync(hooksJsonPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(hooksJsonPath, "utf8"));
    } catch {
      console.warn("Could not parse hooks.json; merging into a fresh object.");
    }
  }
  fs.writeFileSync(
    hooksJsonPath,
    `${JSON.stringify(mergeHooks(existing), null, 2)}\n`,
  );

  const legacyReplyHook = path.join(hooksDir, "save-reply.js");
  if (fs.existsSync(legacyReplyHook)) {
    fs.unlinkSync(legacyReplyHook);
    console.log("Removed legacy save-reply.js");
  }

  console.log("Classy Endeavors usage tracking updated:");
  console.log(`  ${path.join(hooksDir, "track-usage.js")}`);
  console.log(`  ${path.join(hooksDir, "usage-config.json")}`);
  console.log(`  ${path.join(rulesDir, "prompt-analytics.mdc")}`);
  console.log(`  ${hooksJsonPath} (merged)`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
