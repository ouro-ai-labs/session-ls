import React from "react";
import { Box, Text } from "ink";
import type { Session } from "../types.js";
import { truncateId, formatDate, truncateMessage } from "../utils/format.js";

interface SessionListProps {
  sessions: Session[];
  selectedIndex: number;
  scrollOffset: number;
  visibleRows: number;
}

export function SessionList({
  sessions,
  selectedIndex,
  scrollOffset,
  visibleRows,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <Box paddingY={1}>
        <Text dimColor>No sessions found.</Text>
      </Box>
    );
  }

  const visible = sessions.slice(scrollOffset, scrollOffset + visibleRows);

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>
          <Text color="gray">{"  "}</Text>
          <Text>{pad("Project", 20)}</Text>
          <Text>{pad("ID", 10)}</Text>
          <Text>{pad("Date", 12)}</Text>
          <Text>{pad("Branch", 16)}</Text>
          <Text>Message</Text>
        </Text>
      </Box>
      {visible.map((session, i) => {
        const absoluteIndex = scrollOffset + i;
        const isSelected = absoluteIndex === selectedIndex;
        return (
          <Box key={session.id}>
            <Text
              backgroundColor={isSelected ? "blue" : undefined}
              color={isSelected ? "white" : undefined}
            >
              <Text>{isSelected ? "▸ " : "  "}</Text>
              <Text>{pad(session.projectName || "-", 20)}</Text>
              <Text dimColor={!isSelected}>{pad(truncateId(session.id), 10)}</Text>
              <Text color={isSelected ? "white" : "green"}>
                {pad(formatDate(session.lastTimestamp), 12)}
              </Text>
              <Text color={isSelected ? "white" : "magenta"}>
                {pad(session.gitBranch || "-", 16)}
              </Text>
              <Text dimColor={!isSelected}>
                {truncateMessage(session.displayMessages[0] || session.slug || "-", 50)}
              </Text>
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

function pad(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len - 1) + " ";
  return str + " ".repeat(len - str.length);
}
