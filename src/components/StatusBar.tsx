import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  filtered: number;
  total: number;
  view: "list" | "detail" | "conversation";
}

export function StatusBar({ filtered, total, view }: StatusBarProps) {
  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
      <Text>
        <Text color="yellow">{filtered}/{total} sessions</Text>
        <Text dimColor>
          {view === "list"
            ? "  |  ↑↓ navigate  Enter detail  q quit"
            : view === "detail"
            ? "  |  Enter conversation  Esc back  q back"
            : "  |  ↑↓ scroll  Esc back  q back"}
        </Text>
      </Text>
    </Box>
  );
}
