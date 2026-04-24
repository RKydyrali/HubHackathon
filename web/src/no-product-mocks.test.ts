import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const forbiddenPatterns = [
  /mock(Vacanc|Application|Notification|Match|Coach|Profile|User)/i,
  /fake(Vacanc|Application|Notification|Match|Coach|Profile|User)/i,
  /sample(Vacanc|Application|Notification|Match|Coach|Profile|User)/i,
  /fixture(Vacanc|Application|Notification|Match|Coach|Profile|User)/i,
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) {
      return [];
    }
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  }).filter((path) => /\.(ts|tsx)$/.test(path));
}

describe("production UI data integrity", () => {
  test("does not name product-critical fixture data in production source", () => {
    const offenders = sourceFiles(join(process.cwd(), "src")).flatMap((path) => {
      const content = readFileSync(path, "utf8");
      return forbiddenPatterns.some((pattern) => pattern.test(content)) ? [path] : [];
    });

    expect(offenders).toEqual([]);
  });
});
