import Database from "better-sqlite3";
import { join } from "node:path";
import { mkdirSync, existsSync, statSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { getClaudeDir, getProjectsDir, getSessionJsonlPath } from "../utils/path.js";

const INDEX_DIR = join(getClaudeDir(), "session-ls");
const DB_PATH = join(INDEX_DIR, "index.db");

export interface IndexStatus {
  exists: boolean;
  totalSessions: number;
  totalMessages: number;
  lastIndexedAt: number | null;
}

export interface IndexProgress {
  phase: "scanning" | "indexing" | "done";
  current: number;
  total: number;
  sessionId?: string;
}

type ProgressCallback = (progress: IndexProgress) => void;

function ensureDir(): void {
  if (!existsSync(INDEX_DIR)) {
    mkdirSync(INDEX_DIR, { recursive: true });
  }
}

function openDb(): Database.Database {
  ensureDir();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS index_meta (
      session_id   TEXT PRIMARY KEY,
      project_path TEXT NOT NULL,
      file_mtime   INTEGER NOT NULL,
      indexed_at   INTEGER NOT NULL
    );
  `);

  // FTS5 virtual table for full-text search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      session_id,
      role,
      content,
      tokenize='porter unicode61'
    );
  `);

  return db;
}

/** Check if the full-text index exists and return its status. */
export function getIndexStatus(): IndexStatus {
  if (!existsSync(DB_PATH)) {
    return { exists: false, totalSessions: 0, totalMessages: 0, lastIndexedAt: null };
  }

  try {
    const db = openDb();
    const sessionCount = (db.prepare("SELECT COUNT(*) as c FROM index_meta").get() as { c: number }).c;
    const messageCount = (db.prepare("SELECT COUNT(*) as c FROM messages_fts").get() as { c: number }).c;
    const lastRow = db.prepare("SELECT MAX(indexed_at) as t FROM index_meta").get() as { t: number | null };
    db.close();

    return {
      exists: sessionCount > 0,
      totalSessions: sessionCount,
      totalMessages: messageCount,
      lastIndexedAt: lastRow.t,
    };
  } catch {
    return { exists: false, totalSessions: 0, totalMessages: 0, lastIndexedAt: null };
  }
}

interface SessionFile {
  sessionId: string;
  encodedDir: string;
  filePath: string;
  mtime: number;
}

/** Discover all session JSONL files under ~/.claude/projects/ */
async function discoverSessionFiles(): Promise<SessionFile[]> {
  const projectsDir = getProjectsDir();
  const results: SessionFile[] = [];

  let projectDirs: string[] = [];
  try {
    projectDirs = await readdir(projectsDir);
  } catch {
    return results;
  }

  for (const encodedDir of projectDirs) {
    const dirPath = join(projectsDir, encodedDir);
    try {
      const dirStat = await stat(dirPath);
      if (!dirStat.isDirectory()) continue;

      const files = await readdir(dirPath);
      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue;
        const sessionId = file.replace(/\.jsonl$/, "");
        const filePath = join(dirPath, file);
        const fileStat = await stat(filePath);
        results.push({
          sessionId,
          encodedDir,
          filePath,
          mtime: Math.floor(fileStat.mtimeMs),
        });
      }
    } catch {
      // skip unreadable dirs
    }
  }

  return results;
}

/** Extract text messages from a session JSONL file. */
async function extractMessages(
  filePath: string
): Promise<Array<{ role: string; content: string }>> {
  const messages: Array<{ role: string; content: string }> = [];

  try {
    const stream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type !== "user" && entry.type !== "assistant") continue;

        const role = entry.type as string;
        let text = "";

        if (role === "user") {
          const content = entry.message?.content;
          if (typeof content === "string") {
            text = content;
          } else if (Array.isArray(content)) {
            text = content
              .filter((b: { type: string }) => b.type === "text")
              .map((b: { text: string }) => b.text)
              .join("\n");
          }
        } else {
          const content = entry.message?.content;
          if (Array.isArray(content)) {
            const textParts = content
              .filter((b: { type: string }) => b.type === "text")
              .map((b: { text: string }) => b.text);
            if (textParts.length > 0) {
              text = textParts.join("\n");
            } else {
              continue;
            }
          } else if (typeof content === "string") {
            text = content;
          }
        }

        if (!text.trim()) continue;
        messages.push({ role, content: text });
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // file may not exist
  }

  return messages;
}

/**
 * Build or incrementally update the full-text index.
 * Only re-indexes sessions whose file mtime has changed.
 */
export async function buildIndex(onProgress?: ProgressCallback): Promise<void> {
  onProgress?.({ phase: "scanning", current: 0, total: 0 });

  const sessionFiles = await discoverSessionFiles();
  const db = openDb();

  // Determine which sessions need (re)indexing
  const metaStmt = db.prepare("SELECT file_mtime FROM index_meta WHERE session_id = ?");
  const toIndex: SessionFile[] = [];

  for (const sf of sessionFiles) {
    const existing = metaStmt.get(sf.sessionId) as { file_mtime: number } | undefined;
    if (!existing || existing.file_mtime !== sf.mtime) {
      toIndex.push(sf);
    }
  }

  onProgress?.({ phase: "indexing", current: 0, total: toIndex.length });

  if (toIndex.length === 0) {
    onProgress?.({ phase: "done", current: 0, total: 0 });
    db.close();
    return;
  }

  // Prepare statements
  const deleteFts = db.prepare("DELETE FROM messages_fts WHERE session_id = ?");
  const insertFts = db.prepare("INSERT INTO messages_fts (session_id, role, content) VALUES (?, ?, ?)");
  const upsertMeta = db.prepare(`
    INSERT INTO index_meta (session_id, project_path, file_mtime, indexed_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      project_path = excluded.project_path,
      file_mtime = excluded.file_mtime,
      indexed_at = excluded.indexed_at
  `);

  for (let i = 0; i < toIndex.length; i++) {
    const sf = toIndex[i]!;
    onProgress?.({ phase: "indexing", current: i + 1, total: toIndex.length, sessionId: sf.sessionId });

    const messages = await extractMessages(sf.filePath);

    // Use a transaction per session for atomicity and performance
    const txn = db.transaction(() => {
      deleteFts.run(sf.sessionId);
      for (const msg of messages) {
        insertFts.run(sf.sessionId, msg.role, msg.content);
      }
      upsertMeta.run(sf.sessionId, sf.encodedDir, sf.mtime, Date.now());
    });
    txn();
  }

  onProgress?.({ phase: "done", current: toIndex.length, total: toIndex.length });
  db.close();
}

export interface FtsSearchResult {
  sessionId: string;
  role: string;
  snippet: string;
}

/**
 * Search the full-text index using FTS5 MATCH syntax.
 * Returns matching session IDs with snippets.
 */
export function searchIndex(query: string, limit = 50): FtsSearchResult[] {
  if (!existsSync(DB_PATH)) return [];

  try {
    const db = openDb();

    // Escape special FTS5 characters and build query
    const safeQuery = query
      .replace(/['"]/g, " ")
      .trim();

    if (!safeQuery) {
      db.close();
      return [];
    }

    // Use FTS5 with snippet() for highlighted results
    const rows = db.prepare(`
      SELECT
        session_id AS sessionId,
        role,
        snippet(messages_fts, 2, '>>>', '<<<', '...', 48) AS snippet
      FROM messages_fts
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(safeQuery, limit) as FtsSearchResult[];

    db.close();

    // Deduplicate by sessionId, keeping the best-ranked match
    const seen = new Map<string, FtsSearchResult>();
    for (const r of rows) {
      if (!seen.has(r.sessionId)) {
        seen.set(r.sessionId, r);
      }
    }

    return Array.from(seen.values());
  } catch {
    return [];
  }
}
