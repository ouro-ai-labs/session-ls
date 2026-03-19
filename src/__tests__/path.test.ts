import { describe, it, expect } from "vitest";
import { encodePath, getSessionJsonlPath, getClaudeDir, getHistoryPath, getProjectsDir } from "../utils/path.js";
import { homedir } from "node:os";
import { join } from "node:path";

describe("getClaudeDir", () => {
  it("returns ~/.claude", () => {
    expect(getClaudeDir()).toBe(join(homedir(), ".claude"));
  });
});

describe("getHistoryPath", () => {
  it("returns ~/.claude/history.jsonl", () => {
    expect(getHistoryPath()).toBe(join(homedir(), ".claude", "history.jsonl"));
  });
});

describe("getProjectsDir", () => {
  it("returns ~/.claude/projects", () => {
    expect(getProjectsDir()).toBe(join(homedir(), ".claude", "projects"));
  });
});

describe("encodePath", () => {
  it("replaces slashes with dashes", () => {
    expect(encodePath("/Users/foo/bar")).toBe("-Users-foo-bar");
  });

  it("handles root path", () => {
    expect(encodePath("/")).toBe("-");
  });

  it("handles path with no slashes", () => {
    expect(encodePath("project")).toBe("project");
  });
});

describe("getSessionJsonlPath", () => {
  it("builds correct path", () => {
    const result = getSessionJsonlPath("-Users-foo-project", "abc123");
    expect(result).toBe(
      join(homedir(), ".claude", "projects", "-Users-foo-project", "abc123.jsonl")
    );
  });
});
