import React from "react";
import { Box, Text } from "ink";
import type { Session, ConversationMessage } from "../types.js";
import { formatDate } from "../utils/format.js";

interface ConversationViewProps {
  session: Session;
  conversation: ConversationMessage[];
  loading: boolean;
  scrollOffset: number;
  visibleRows: number;
}

const HEADER_LINES = 4;

export function ConversationView({
  session,
  conversation,
  loading,
  scrollOffset,
  visibleRows,
}: ConversationViewProps) {
  const contentRows = Math.max(visibleRows - HEADER_LINES, 5);

  // Build rendered lines from conversation
  const lines: { role: "user" | "assistant"; text: string }[] = [];
  for (const msg of conversation) {
    const prefix = msg.role === "user" ? "You" : "Claude";
    lines.push({ role: msg.role, text: `── ${prefix} ──` });
    for (const l of msg.text.split("\n")) {
      lines.push({ role: msg.role, text: l });
    }
    lines.push({ role: msg.role, text: "" });
  }

  const totalLines = lines.length;
  const clampedOffset = Math.min(scrollOffset, Math.max(0, totalLines - contentRows));
  const visible = lines.slice(clampedOffset, clampedOffset + contentRows);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold color="cyan">Conversation: </Text>
        <Text>{session.projectName || "-"}</Text>
        <Text dimColor> | </Text>
        <Text color="magenta">{session.gitBranch || "-"}</Text>
        <Text dimColor> | </Text>
        <Text color="green">{formatDate(session.lastTimestamp)}</Text>
      </Box>
      <Box>
        <Text dimColor>
          Esc back | ↑↓ scroll | {conversation.length} messages | lines {clampedOffset + 1}-{Math.min(clampedOffset + contentRows, totalLines)}/{totalLines}
        </Text>
      </Box>
      <Text dimColor>{"─".repeat(80)}</Text>

      {loading ? (
        <Box paddingY={1}>
          <Text color="cyan">Loading conversation...</Text>
        </Box>
      ) : conversation.length === 0 ? (
        <Box paddingY={1}>
          <Text dimColor>No conversation data found.</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {visible.map((line, i) => {
            if (line.text.startsWith("── ") && line.text.endsWith(" ──")) {
              return (
                <Text key={clampedOffset + i} bold color={line.role === "user" ? "yellow" : "cyan"}>
                  {line.text}
                </Text>
              );
            }
            return (
              <Text key={clampedOffset + i} wrap="truncate">
                {line.text}
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
