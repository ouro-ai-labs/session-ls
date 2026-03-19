import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Readable } from "node:stream";

// Mock fs before importing the module under test
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    createReadStream: vi.fn(),
  };
});

import { readConversation } from "../services/conversation.js";
import { createReadStream } from "node:fs";

const mockedCreateReadStream = vi.mocked(createReadStream);

function mockFileContent(content: string) {
  const stream = Readable.from([content]);
  mockedCreateReadStream.mockReturnValue(stream as unknown as ReturnType<typeof createReadStream>);
}

function jsonl(...lines: object[]): string {
  return lines.map((l) => JSON.stringify(l)).join("\n");
}

describe("readConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses user messages with string content", async () => {
    mockFileContent(
      jsonl(
        { type: "user", message: { content: "Hello" }, timestamp: "2026-01-01T00:00:00Z" },
      )
    );
    const messages = await readConversation("-test-project", "session1");
    expect(messages).toEqual([
      { role: "user", text: "Hello", timestamp: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("parses user messages with array content (text blocks)", async () => {
    mockFileContent(
      jsonl({
        type: "user",
        message: {
          content: [
            { type: "text", text: "Part 1" },
            { type: "image", data: "..." },
            { type: "text", text: "Part 2" },
          ],
        },
        timestamp: "t1",
      })
    );
    const messages = await readConversation("-test", "s1");
    expect(messages).toHaveLength(1);
    expect(messages[0]!.text).toBe("Part 1\nPart 2");
  });

  it("parses assistant messages with text blocks", async () => {
    mockFileContent(
      jsonl({
        type: "assistant",
        message: {
          content: [{ type: "text", text: "Here is the answer" }],
        },
        timestamp: "t1",
      })
    );
    const messages = await readConversation("-test", "s1");
    expect(messages).toEqual([
      { role: "assistant", text: "Here is the answer", timestamp: "t1" },
    ]);
  });

  it("skips assistant messages with only tool_use blocks", async () => {
    mockFileContent(
      jsonl({
        type: "assistant",
        message: {
          content: [{ type: "tool_use", id: "t1", name: "read", input: {} }],
        },
        timestamp: "t1",
      })
    );
    const messages = await readConversation("-test", "s1");
    expect(messages).toEqual([]);
  });

  it("skips non-user/assistant entries", async () => {
    mockFileContent(
      jsonl(
        { type: "summary", slug: "test" },
        { type: "user", message: { content: "hi" }, timestamp: "t1" },
      )
    );
    const messages = await readConversation("-test", "s1");
    expect(messages).toHaveLength(1);
    expect(messages[0]!.role).toBe("user");
  });

  it("skips empty lines and malformed JSON", async () => {
    const content = [
      "",
      "not valid json",
      JSON.stringify({ type: "user", message: { content: "valid" }, timestamp: "t1" }),
      "",
    ].join("\n");
    mockFileContent(content);
    const messages = await readConversation("-test", "s1");
    expect(messages).toHaveLength(1);
  });

  it("skips messages with empty text", async () => {
    mockFileContent(
      jsonl({ type: "user", message: { content: "   " }, timestamp: "t1" })
    );
    const messages = await readConversation("-test", "s1");
    expect(messages).toEqual([]);
  });

  it("encodes absolute project paths", async () => {
    mockFileContent(jsonl({ type: "user", message: { content: "hi" }, timestamp: "t1" }));
    await readConversation("/Users/foo/project", "s1");
    expect(mockedCreateReadStream).toHaveBeenCalledWith(
      expect.stringContaining("-Users-foo-project"),
      expect.any(Object)
    );
  });

  it("returns empty array when file does not exist", async () => {
    mockedCreateReadStream.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const messages = await readConversation("-test", "s1");
    expect(messages).toEqual([]);
  });

  it("handles assistant messages with string content", async () => {
    mockFileContent(
      jsonl({
        type: "assistant",
        message: { content: "Plain string response" },
        timestamp: "t1",
      })
    );
    const messages = await readConversation("-test", "s1");
    expect(messages).toEqual([
      { role: "assistant", text: "Plain string response", timestamp: "t1" },
    ]);
  });
});
