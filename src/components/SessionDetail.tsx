import React from "react";
import { Box, Text } from "ink";
import type { Session } from "../types.js";
import { formatDate } from "../utils/format.js";

interface SessionDetailProps {
  session: Session;
}

export function SessionDetail({ session }: SessionDetailProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Session Detail
        </Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Box>
          <Text bold>ID:        </Text>
          <Text>{session.id}</Text>
        </Box>
        <Box>
          <Text bold>Project:   </Text>
          <Text>{session.projectName || "-"}</Text>
        </Box>
        <Box>
          <Text bold>Path:      </Text>
          <Text dimColor>{session.projectPath || "-"}</Text>
        </Box>
        <Box>
          <Text bold>Branch:    </Text>
          <Text color="magenta">{session.gitBranch || "-"}</Text>
        </Box>
        <Box>
          <Text bold>Slug:      </Text>
          <Text>{session.slug || "-"}</Text>
        </Box>
        <Box>
          <Text bold>First:     </Text>
          <Text color="green">{formatDate(session.firstTimestamp)}</Text>
          <Text dimColor>  ({new Date(session.firstTimestamp).toLocaleString()})</Text>
        </Box>
        <Box>
          <Text bold>Last:      </Text>
          <Text color="green">{formatDate(session.lastTimestamp)}</Text>
          <Text dimColor>  ({new Date(session.lastTimestamp).toLocaleString()})</Text>
        </Box>
        <Box>
          <Text bold>Messages:  </Text>
          <Text>{session.messageCount}</Text>
        </Box>
      </Box>

      {session.displayMessages.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline>
            Conversation Preview
          </Text>
          {session.displayMessages.slice(0, 10).map((msg, i) => (
            <Box key={i} marginTop={i === 0 ? 1 : 0}>
              <Text dimColor>{`${i + 1}. `}</Text>
              <Text>{msg.length > 120 ? msg.slice(0, 119) + "…" : msg}</Text>
            </Box>
          ))}
          {session.displayMessages.length > 10 && (
            <Text dimColor>
              ... and {session.displayMessages.length - 10} more messages
            </Text>
          )}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Enter view full conversation | o open in Claude | Esc back to list</Text>
      </Box>
    </Box>
  );
}
