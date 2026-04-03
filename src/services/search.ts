import type { Session } from "../types.js";
import { fuzzySearch } from "../utils/fuzzy.js";
import { searchIndex, getIndexStatus } from "./indexer.js";

export interface SearchResult {
  session: Session;
  /** Where this result came from */
  source: "metadata" | "content" | "both";
  /** FTS snippet if matched from content */
  snippet?: string;
}

/**
 * Unified search: combines Fuse.js metadata search with FTS5 full-text search.
 * If the index doesn't exist, falls back to Fuse.js only.
 */
export function unifiedSearch(
  query: string,
  allSessions: Session[]
): SearchResult[] {
  // 1. Fuse.js metadata search (always available)
  const fuseResults = fuzzySearch(query);
  const fuseSessionIds = new Set(fuseResults.map((s) => s.id));

  // Build a lookup map for all sessions
  const sessionMap = new Map<string, Session>();
  for (const s of allSessions) {
    sessionMap.set(s.id, s);
  }

  // 2. FTS5 full-text search (only if index exists)
  const indexStatus = getIndexStatus();
  const ftsResults = indexStatus.exists ? searchIndex(query) : [];

  // 3. Merge results: fuse first, then FTS-only results
  const resultMap = new Map<string, SearchResult>();

  for (const session of fuseResults) {
    resultMap.set(session.id, { session, source: "metadata" });
  }

  for (const fts of ftsResults) {
    const session = sessionMap.get(fts.sessionId);
    if (!session) continue;

    const existing = resultMap.get(fts.sessionId);
    if (existing) {
      // Found in both metadata and content
      existing.source = "both";
      existing.snippet = fts.snippet;
    } else {
      // Found only in content — this is the key value-add
      resultMap.set(fts.sessionId, {
        session,
        source: "content",
        snippet: fts.snippet,
      });
    }
  }

  return Array.from(resultMap.values());
}
