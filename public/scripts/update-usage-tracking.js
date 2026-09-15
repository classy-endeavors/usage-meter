const fs = require("fs");
const http = require("http");
const https = require("https");
const os = require("os");
const path = require("path");

const TRACK_USAGE_COMMAND = "node ./hooks/track-usage.js";

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

function isHtml(buffer, contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type.includes("text/html")) return true;
  const start = String(buffer).trimStart().slice(0, 32).toLowerCase();
  return start.startsWith("<!doctype") || start.startsWith("<html");
}

function download(url) {
  return new Promise((resolve, reject) => {
    const request = (target) => {
      let parsed;
      try {
        parsed = new URL(target);
      } catch {
        reject(new Error(`Invalid URL: ${target}`));
        return;
      }

      const client = parsed.protocol === "http:" ? http : https;
      client
        .get(parsed, (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            request(new URL(res.headers.location, parsed).href);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${target}`));
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const body = Buffer.concat(chunks);
            if (isHtml(body, res.headers["content-type"])) {
              reject(
                new Error(
                  `Got an HTML page instead of a file for ${target}. The URL may still be gated.`,
                ),
              );
              return;
            }
            resolve(body);
          });
        })
        .on("error", reject);
    };
    request(url);
  });
}

function isTrackUsage(item) {
  return Boolean(item && item.command === TRACK_USAGE_COMMAND);
}

function isScopeCoach(item) {
  return Boolean(
    item &&
      item.type === "prompt" &&
      /scope-coach/i.test(String(item.prompt || "")),
  );
}

function parseScopeCoach(buffer) {
  let entry;
  try {
    entry = JSON.parse(String(buffer));
  } catch {
    throw new Error("scope-coach.json was not valid JSON.");
  }
  if (!isScopeCoach(entry) || typeof entry.timeout !== "number") {
    throw new Error("scope-coach.json did not contain the expected prompt hook.");
  }
  return {
    type: "prompt",
    prompt: entry.prompt,
    timeout: entry.timeout,
  };
}

function mergeHooks(existing, scopeCoach) {
  const base = existing && typeof existing === "object" ? existing : {};
  const hooks =
    base.hooks && typeof base.hooks === "object" ? { ...base.hooks } : {};

  const wanted = {
    beforeSubmitPrompt: [scopeCoach, { command: TRACK_USAGE_COMMAND }],
    afterAgentResponse: [{ command: TRACK_USAGE_COMMAND }],
  };

  for (const [event, entries] of Object.entries(wanted)) {
    const current = Array.isArray(hooks[event]) ? [...hooks[event]] : [];
    for (const entry of entries) {
      const index = current.findIndex((item) =>
        isScopeCoach(entry) ? isScopeCoach(item) : isTrackUsage(item) && isTrackUsage(entry),
      );
      if (index >= 0) {
        current[index] = entry;
      } else if (isScopeCoach(entry)) {
        current.unshift(entry);
      } else {
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

  fs.mkdirSync(hooksDir, { recursive: true });

  const [trackUsage, scopeCoachRaw] = await Promise.all([
    download(`${ORIGIN}/hooks/track-usage.js`),
    download(`${ORIGIN}/hooks/scope-coach.json`),
  ]);

  const scopeCoach = parseScopeCoach(scopeCoachRaw);

  fs.writeFileSync(path.join(hooksDir, "track-usage.js"), trackUsage);
  fs.writeFileSync(
    path.join(hooksDir, "usage-config.json"),
    `${JSON.stringify({ apiUrl: `${ORIGIN}/api/events` })}\n`,
  );

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
    `${JSON.stringify(mergeHooks(existing, scopeCoach), null, 2)}\n`,
  );

  const legacyReplyHook = path.join(hooksDir, "save-reply.js");
  if (fs.existsSync(legacyReplyHook)) {
    fs.unlinkSync(legacyReplyHook);
    console.log("Removed legacy save-reply.js");
  }

  console.log("Classy Endeavors usage tracking updated:");
  console.log(`  ${path.join(hooksDir, "track-usage.js")}`);
  console.log(`  ${path.join(hooksDir, "usage-config.json")}`);
  console.log(`  ${hooksJsonPath} (merged scope-coach + usage tracking)`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  mergeHooks,
  parseScopeCoach,
  isScopeCoach,
  isTrackUsage,
};
