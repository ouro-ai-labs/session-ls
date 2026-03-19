import { describe, it, expect, vi, afterEach } from "vitest";
import { truncateId, formatDate, truncateMessage } from "../utils/format.js";

describe("truncateId", () => {
  it("truncates to 8 characters by default", () => {
    expect(truncateId("abcdef1234567890")).toBe("abcdef12");
  });

  it("truncates to custom length", () => {
    expect(truncateId("abcdef1234567890", 4)).toBe("abcd");
  });

  it("returns full string if shorter than limit", () => {
    expect(truncateId("abc")).toBe("abc");
  });

  it("handles empty string", () => {
    expect(truncateId("")).toBe("");
  });
});

describe("formatDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for timestamps less than 60 seconds ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T12:00:30Z"));
    expect(formatDate(new Date("2026-03-19T12:00:00Z").getTime())).toBe("just now");
  });

  it("returns minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T12:05:00Z"));
    expect(formatDate(new Date("2026-03-19T12:00:00Z").getTime())).toBe("5m ago");
  });

  it("returns hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T15:00:00Z"));
    expect(formatDate(new Date("2026-03-19T12:00:00Z").getTime())).toBe("3h ago");
  });

  it("returns days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T12:00:00Z"));
    expect(formatDate(new Date("2026-03-19T12:00:00Z").getTime())).toBe("3d ago");
  });

  it("returns weeks ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"));
    expect(formatDate(new Date("2026-03-19T12:00:00Z").getTime())).toBe("2w ago");
  });

  it("returns formatted date for old timestamps in same year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const result = formatDate(new Date("2026-01-15T12:00:00Z").getTime());
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });

  it("includes year for timestamps from a different year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const result = formatDate(new Date("2025-01-15T12:00:00Z").getTime());
    expect(result).toContain("2025");
  });
});

describe("truncateMessage", () => {
  it("returns short messages unchanged", () => {
    expect(truncateMessage("hello world")).toBe("hello world");
  });

  it("truncates long messages with ellipsis", () => {
    const long = "a".repeat(100);
    const result = truncateMessage(long);
    expect(result.length).toBe(60);
    expect(result.endsWith("…")).toBe(true);
  });

  it("replaces newlines with spaces", () => {
    expect(truncateMessage("hello\nworld")).toBe("hello world");
  });

  it("trims whitespace", () => {
    expect(truncateMessage("  hello  ")).toBe("hello");
  });

  it("respects custom maxLength", () => {
    const result = truncateMessage("hello world, this is a test", 10);
    expect(result.length).toBe(10);
    expect(result.endsWith("…")).toBe(true);
  });

  it("handles exact length without truncation", () => {
    const msg = "a".repeat(60);
    expect(truncateMessage(msg)).toBe(msg);
  });
});
