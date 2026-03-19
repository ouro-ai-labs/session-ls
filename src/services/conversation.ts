import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { getSessionJsonlPath } from "../utils/path.js";
import type { ConversationMessage } from "../types.js";

export async function readConversation(
  projectPath: string,
  sessionId: string
): Promise<ConversationMessage[]> {
  // Encode project path if it's absolute
  const encodedDir = projectPath.startsWith("/") || projectPath.startsWith("~")
    ? projectPath.replace(/\//g, "-")
    : projectPath;

  const jsonlPath = getSessionJsonlPath(encodedDir, sessionId);
  const messages: ConversationMessage[] = [];

  try {
    const stream = createReadStream(jsonlPath, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type !== "user" && entry.type !== "assistant") continue;

        const role = entry.type as "user" | "assistant";
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
              // Skip assistant entries with only thinking/tool_use blocks
              continue;
            }
          } else if (typeof content === "string") {
            text = content;
          }
        }

        if (!text.trim()) continue;

        messages.push({
          role,
          text,
          timestamp: entry.timestamp || "",
        });
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // file may not exist
  }

  return messages;
}
