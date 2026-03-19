import { homedir } from "node:os";
import { join } from "node:path";

export function getClaudeDir(): string {
  return join(homedir(), ".claude");
}

export function getHistoryPath(): string {
  return join(getClaudeDir(), "history.jsonl");
}

export function getProjectsDir(): string {
  return join(getClaudeDir(), "projects");
}

export function encodePath(absPath: string): string {
  return absPath.replace(/\//g, "-");
}

export function decodePath(encoded: string): string {
  // Encoded format: "-Users-foo-bar" → "/Users/foo/bar"
  // Each "-" was originally a "/"
  return encoded.replace(/-/g, "/");
}

export function getSessionJsonlPath(
  projectEncoded: string,
  sessionId: string
): string {
  return join(getProjectsDir(), projectEncoded, `${sessionId}.jsonl`);
}
