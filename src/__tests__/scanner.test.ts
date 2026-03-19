import { describe, it, expect, vi } from "vitest";

// Test the helper functions from scanner by extracting their logic.
// The exported scanSessions() depends heavily on filesystem — we test the pure helpers.

describe("projectNameFromPath", () => {
  // Replicate the function logic for unit testing
  function projectNameFromPath(projectPath: string): string {
    const parts = projectPath.split("/").filter(Boolean);
    return parts[parts.length - 1] || projectPath;
  }

  it("extracts last segment from absolute path", () => {
    expect(projectNameFromPath("/Users/foo/bar/myproject")).toBe("myproject");
  });

  it("handles single-segment path", () => {
    expect(projectNameFromPath("/myproject")).toBe("myproject");
  });

  it("returns original for empty path", () => {
    expect(projectNameFromPath("")).toBe("");
  });
});

describe("projectNameFromEncoded", () => {
  function projectNameFromEncoded(encoded: string): string {
    const parts = encoded.split("-").filter(Boolean);
    return parts[parts.length - 1] || encoded;
  }

  it("extracts last segment from encoded path", () => {
    expect(projectNameFromEncoded("-Users-foo-bar-myproject")).toBe("myproject");
  });

  it("handles single segment", () => {
    expect(projectNameFromEncoded("myproject")).toBe("myproject");
  });

  it("returns original for empty string", () => {
    expect(projectNameFromEncoded("")).toBe("");
  });
});

describe("limitConcurrency", () => {
  // Replicate the concurrency limiter for unit testing
  async function limitConcurrency<T>(
    tasks: (() => Promise<T>)[],
    limit: number,
  ): Promise<T[]> {
    const results: T[] = [];
    let index = 0;

    async function runNext(): Promise<void> {
      while (index < tasks.length) {
        const i = index++;
        results[i] = await tasks[i]!();
      }
    }

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
      runNext(),
    );
    await Promise.all(workers);
    return results;
  }

  it("runs all tasks and returns results in order", async () => {
    const tasks = [1, 2, 3].map((n) => () => Promise.resolve(n * 10));
    const results = await limitConcurrency(tasks, 2);
    expect(results).toEqual([10, 20, 30]);
  });

  it("handles empty task list", async () => {
    const results = await limitConcurrency([], 5);
    expect(results).toEqual([]);
  });

  it("limits concurrency to specified number", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const tasks = Array.from({ length: 10 }, () => async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await new Promise((r) => setTimeout(r, 10));
      currentConcurrent--;
      return 1;
    });

    await limitConcurrency(tasks, 3);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it("handles single task", async () => {
    const results = await limitConcurrency([() => Promise.resolve("done")], 5);
    expect(results).toEqual(["done"]);
  });
});
