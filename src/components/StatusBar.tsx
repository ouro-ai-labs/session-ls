import React from "react";
import { Box, Text } from "ink";
import type { IndexState } from "../types.js";

interface StatusBarProps {
  filtered: number;
  total: number;
  view: "list" | "detail" | "conversation";
  indexState?: IndexState;
  indexProgress?: string;
}

export function StatusBar({ filtered, total, view, indexState, indexProgress }: StatusBarProps) {
  let indexLabel = "";
  if (indexState === "indexing") {
    indexLabel = `  [${indexProgress || "Indexing..."}]`;
  } else if (indexState === "ready") {
    indexLabel = "  [FTS]";
  } else if (indexState === "none" && view === "list") {
    indexLabel = "  [I: build full-text search index]";
  }

  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
      <Text>
        <Text color="yellow">{filtered}/{total} sessions</Text>
        {indexState === "indexing" ? (
          <Text color="cyan">{indexLabel}</Text>
        ) : indexState === "ready" ? (
          <Text color="green">{indexLabel}</Text>
        ) : (
          <Text dimColor>{indexLabel}</Text>
        )}
        <Text dimColor>
          {view === "list"
            ? "  |  ↑↓ navigate  Enter detail  q quit"
            : view === "detail"
            ? "  |  Enter conversation  o open Claude  Esc back  q back"
            : "  |  ↑↓ scroll  o open Claude  Esc back  q back"}
        </Text>
      </Text>
    </Box>
  );
}
