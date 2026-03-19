import { readFile, readdir, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { HistoryEntry, Session } from "../types.js";
import { getHistoryPath, getProjectsDir, getSessionJsonlPath } from "../utils/path.js";

const CONCURRENCY_LIMIT = 20;

async function limitConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
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
    runNext()
  );
  await Promise.all(workers);
  return results;
}

async function readFirstLines(
  filePath: string,
  maxLines: number
): Promise<string[]> {
  const lines: string[] = [];
  try {
    const stream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      lines.push(line);
      if (lines.length >= maxLines) {
        rl.close();
        break;
      }
    }
  } catch {
    // file may not exist or be unreadable
  }
  return lines;
}

interface SessionMetadata {
  slug: string;
  gitBranch: string;
}

async function extractSessionMetadata(
  sessionJsonlPath: string
): Promise<SessionMetadata> {
  const lines = await readFirstLines(sessionJsonlPath, 30);
  let slug = "";
  let gitBranch = "";

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === "summary") {
        if (entry.slug) slug = entry.slug;
        if (entry.gitBranch) gitBranch = entry.gitBranch;
        break;
      }
      if (!slug && entry.slug) slug = entry.slug;
      if (!gitBranch && entry.gitBranch) gitBranch = entry.gitBranch;
    } catch {
      // skip malformed lines
    }
  }

  return { slug, gitBranch };
}

async function readHistoryEntries(): Promise<HistoryEntry[]> {
  const historyPath = getHistoryPath();
  const entries: HistoryEntry[] = [];

  try {
    const content = await readFile(historyPath, "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as HistoryEntry;
        if (entry.sessionId) {
          entries.push(entry);
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // history.jsonl may not exist
  }

  return entries;
}

function projectNameFromPath(projectPath: string): string {
  // projectPath looks like /Users/foo/bar/myproject
  const parts = projectPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || projectPath;
}

function projectNameFromEncoded(encoded: string): string {
  // encoded looks like -Users-foo-bar-myproject
  const parts = encoded.split("-").filter(Boolean);
  return parts[parts.length - 1] || encoded;
}

export async function scanSessions(): Promise<Session[]> {
  const historyEntries = await readHistoryEntries();

  // Group history entries by sessionId
  const sessionMap = new Map<
    string,
    {
      id: string;
      projectPath: string;
      displayMessages: string[];
      timestamps: number[];
    }
  >();

  for (const entry of historyEntries) {
    const ts = new Date(entry.timestamp).getTime();
    const existing = sessionMap.get(entry.sessionId);
    if (existing) {
      if (entry.display) existing.displayMessages.push(entry.display);
      existing.timestamps.push(ts);
    } else {
      sessionMap.set(entry.sessionId, {
        id: entry.sessionId,
        projectPath: entry.project || "",
        displayMessages: entry.display ? [entry.display] : [],
        timestamps: [ts],
      });
    }
  }

  // Scan project dirs for sessions not in history
  const projectsDir = getProjectsDir();
  let projectDirs: string[] = [];
  try {
    projectDirs = await readdir(projectsDir);
  } catch {
    // projects dir may not exist
  }

  const discoveredFromDirs = new Set<string>();
  for (const encodedDir of projectDirs) {
    const dirPath = join(projectsDir, encodedDir);
    try {
      const dirStat = await stat(dirPath);
      if (!dirStat.isDirectory()) continue;

      const files = await readdir(dirPath);
      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue;
        const sessionId = basename(file, ".jsonl");
        if (!sessionMap.has(sessionId)) {
          discoveredFromDirs.add(sessionId);
          const fileStat = await stat(join(dirPath, file));
          sessionMap.set(sessionId, {
            id: sessionId,
            projectPath: encodedDir,
            displayMessages: [],
            timestamps: [fileStat.mtimeMs],
          });
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  // Build sessions with metadata (concurrency-limited)
  const sessionEntries = Array.from(sessionMap.values());
  const tasks = sessionEntries.map((entry) => async (): Promise<Session | null> => {
    // Find the encoded project dir for this session
    let encodedDir = "";
    let projName = "";

    if (entry.projectPath.startsWith("/") || entry.projectPath.startsWith("~")) {
      // Absolute path from history - encode it
      const encoded = entry.projectPath.replace(/\//g, "-");
      encodedDir = encoded;
      projName = projectNameFromPath(entry.projectPath);
    } else if (entry.projectPath) {
      // Already encoded or a dir name from scanning
      encodedDir = entry.projectPath;
      projName = projectNameFromEncoded(entry.projectPath);
    }

    // Try to extract metadata from session JSONL
    let metadata: SessionMetadata = { slug: "", gitBranch: "" };
    if (encodedDir) {
      const jsonlPath = getSessionJsonlPath(encodedDir, entry.id);
      metadata = await extractSessionMetadata(jsonlPath);
    }

    const timestamps = entry.timestamps.sort((a, b) => a - b);
    return {
      id: entry.id,
      projectPath: entry.projectPath,
      projectName: projName,
      slug: metadata.slug,
      gitBranch: metadata.gitBranch,
      displayMessages: entry.displayMessages,
      firstTimestamp: timestamps[0]!,
      lastTimestamp: timestamps[timestamps.length - 1]!,
      messageCount: entry.displayMessages.length,
    };
  });

  const results = await limitConcurrency(tasks, CONCURRENCY_LIMIT);
  const sessions = results.filter((s): s is Session => s !== null);

  // Sort by most recent first
  sessions.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  return sessions;
}
