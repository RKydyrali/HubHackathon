import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

describe("application query contracts", () => {
  test("seeker application list returns newest applications first", () => {
    const source = readFileSync(join(process.cwd(), "convex/applications.ts"), "utf8");
    const start = source.indexOf("export const listBySeeker = query({");
    expect(start).toBeGreaterThanOrEqual(0);
    const next = source.indexOf("\nexport const ", start + 1);
    const body = source.slice(start, next === -1 ? source.length : next);

    expect(body).toContain('.order("desc")');
  });
});
