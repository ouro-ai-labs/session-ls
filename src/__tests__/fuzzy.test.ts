import { describe, it, expect, beforeEach } from "vitest";
import { initFuzzy, fuzzySearch } from "../utils/fuzzy.js";
import type { Session } from "../types.js";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "test-id",
    projectPath: "/test/path",
    projectName: "test-project",
    slug: "test-slug",
    gitBranch: "main",
    displayMessages: ["hello world"],
    firstTimestamp: Date.now(),
    lastTimestamp: Date.now(),
    messageCount: 1,
    ...overrides,
  };
}

describe("fuzzySearch", () => {
  it("returns empty array when not initialized", () => {
    // fuzzy module starts uninitialized — search should be safe
    expect(fuzzySearch("anything")).toEqual([]);
  });

  describe("after initialization", () => {
    const sessions = [
      makeSession({ id: "1", projectName: "my-api-server", slug: "fix login bug" }),
      makeSession({ id: "2", projectName: "frontend-app", slug: "add dark mode" }),
      makeSession({ id: "3", projectName: "data-pipeline", slug: "optimize queries", gitBranch: "feature/perf" }),
    ];

    beforeEach(() => {
      initFuzzy(sessions);
    });

    it("finds sessions by project name", () => {
      const results = fuzzySearch("api-server");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.id).toBe("1");
    });

    it("finds sessions by slug", () => {
      const results = fuzzySearch("dark mode");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.id).toBe("2");
    });

    it("finds sessions by git branch", () => {
      const results = fuzzySearch("feature/perf");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.id).toBe("3");
    });

    it("returns empty for no match", () => {
      const results = fuzzySearch("zzzznonexistent");
      expect(results).toEqual([]);
    });

    it("handles empty query gracefully", () => {
      // fuse.js returns empty for empty query
      const results = fuzzySearch("");
      expect(results).toEqual([]);
    });
  });
});
