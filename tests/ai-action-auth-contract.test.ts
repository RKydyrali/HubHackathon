import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function actionBody(source: string, name: string) {
  const start = source.indexOf(`export const ${name} = action({`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\nexport const ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

describe("public AI actions auth contract", () => {
  test.each([
    ["improveElevatorPitch"],
    ["scoreInterviewAnswer"],
    ["generateEmbedding"],
  ])("%s requires an initialized Convex user", (name) => {
    const body = actionBody(readSource("convex/ai.ts"), name);

    expect(body).toContain("requireActionUser(ctx)");
  });

  test.each([
    ["extractCriteria"],
    ["findMatches"],
    ["sendMessage"],
  ])("%s requires an assistant user", (name) => {
    const body = actionBody(readSource("convex/aiJobAssistant.ts"), name);

    expect(body).toContain("requireAssistantActionUser(ctx)");
  });
});
