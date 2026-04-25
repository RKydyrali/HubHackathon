import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const convexMain = path.join(root, "node_modules", "convex", "bin", "main.js");

const scale = Number(process.env.SEED_SCALE ?? "0.2");
const batchId = process.env.SEED_BATCH_ID ?? "mangystau_dev";
const clearFirst = process.env.SEED_CLEAR !== "0";
const pushFirst = process.env.SEED_NO_PUSH !== "1";
const vacancyTargetRaw = process.env.SEED_VACANCIES;
const vacancyTarget =
  vacancyTargetRaw !== undefined && vacancyTargetRaw !== ""
    ? Math.round(Number(vacancyTargetRaw))
    : null;

const scaleClamped = Number.isFinite(scale) ? Math.min(1, Math.max(0, scale)) : 0.2;

/** Convex CLI pretty-prints JSON across multiple lines. */
function extractJsonObjectsWithKeys(text, keys) {
  const out = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const slice = text.slice(start, i + 1);
        if (keys.some((k) => slice.includes(`"${k}"`))) {
          try {
            out.push(JSON.parse(slice));
          } catch {
            /* skip */
          }
        }
        start = -1;
      }
    }
  }
  return out;
}

/** Stay true until server leaves `phase: "clearing"` (paginated wipe). */
let passClear = clearFirst;
let rounds = 0;
const maxRounds = 600;

while (rounds < maxRounds) {
  rounds++;
  const payload = JSON.stringify({
    batchId,
    scale: scaleClamped,
    clearFirst: passClear,
    ...(vacancyTarget !== null && Number.isFinite(vacancyTarget) && vacancyTarget > 0
      ? { vacancyTarget }
      : {}),
  });

  const result = spawnSync(process.execPath, [
    convexMain,
    "run",
    ...(pushFirst && rounds === 1 ? ["--push"] : []),
    "seed/mangystau:run",
    payload,
  ], {
    cwd: root,
    encoding: "utf-8",
    env: process.env,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  let summary;
  try {
    const candidates = extractJsonObjectsWithKeys(result.stdout, ["phase", "needsMore"]);
    summary = candidates.length ? candidates[candidates.length - 1] : null;
    if (!summary) {
      console.error("Could not parse Convex run result JSON from stdout.");
      process.exit(1);
    }
  } catch {
    process.exit(1);
  }

  if (summary.phase === "clearing") {
    continue;
  }
  passClear = false;

  if (!summary.needsMore || summary.phase === "done") {
    break;
  }
}

if (rounds >= maxRounds) {
  console.error("Seed stopped: exceeded max rounds (scheduler may still be running).");
  process.exit(1);
}
