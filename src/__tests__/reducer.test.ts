import { describe, it, expect } from "vitest";
import type { AppState, AppAction, Session } from "../types.js";

// Extract the reducer logic from app.tsx for testing.
// The reducer is a pure function, so we replicate it here.
function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_SESSIONS":
      return {
        ...state,
        sessions: action.sessions,
        filteredSessions: action.sessions,
        loading: false,
      };
    case "SET_FILTERED":
      return {
        ...state,
        filteredSessions: action.sessions,
        selectedIndex: 0,
        scrollOffset: 0,
      };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_SEARCH":
      return { ...state, searchQuery: action.query };
    case "SET_SELECTED":
      return { ...state, selectedIndex: action.index };
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "SET_SCROLL_OFFSET":
      return { ...state, scrollOffset: action.offset };
    case "SET_CONVERSATION":
      return { ...state, conversation: action.messages, conversationLoading: false };
    case "SET_CONVERSATION_LOADING":
      return { ...state, conversationLoading: action.loading, conversation: [], detailScrollOffset: 0 };
    case "SET_DETAIL_SCROLL":
      return { ...state, detailScrollOffset: action.offset };
    default:
      return state;
  }
}

const initialState: AppState = {
  sessions: [],
  filteredSessions: [],
  loading: true,
  searchQuery: "",
  selectedIndex: 0,
  view: "list",
  scrollOffset: 0,
  conversation: [],
  conversationLoading: false,
  detailScrollOffset: 0,
};

function makeSession(id: string): Session {
  return {
    id,
    projectPath: `/test/${id}`,
    projectName: id,
    slug: "",
    gitBranch: "main",
    displayMessages: [],
    firstTimestamp: Date.now(),
    lastTimestamp: Date.now(),
    messageCount: 0,
  };
}

describe("reducer", () => {
  it("SET_SESSIONS sets sessions, filteredSessions, and loading=false", () => {
    const sessions = [makeSession("a"), makeSession("b")];
    const state = reducer(initialState, { type: "SET_SESSIONS", sessions });
    expect(state.sessions).toBe(sessions);
    expect(state.filteredSessions).toBe(sessions);
    expect(state.loading).toBe(false);
  });

  it("SET_FILTERED resets selectedIndex and scrollOffset", () => {
    const state = { ...initialState, selectedIndex: 5, scrollOffset: 3 };
    const sessions = [makeSession("x")];
    const next = reducer(state, { type: "SET_FILTERED", sessions });
    expect(next.filteredSessions).toBe(sessions);
    expect(next.selectedIndex).toBe(0);
    expect(next.scrollOffset).toBe(0);
  });

  it("SET_LOADING updates loading state", () => {
    const state = reducer(initialState, { type: "SET_LOADING", loading: false });
    expect(state.loading).toBe(false);
  });

  it("SET_SEARCH updates searchQuery", () => {
    const state = reducer(initialState, { type: "SET_SEARCH", query: "test" });
    expect(state.searchQuery).toBe("test");
  });

  it("SET_SELECTED updates selectedIndex", () => {
    const state = reducer(initialState, { type: "SET_SELECTED", index: 3 });
    expect(state.selectedIndex).toBe(3);
  });

  it("SET_VIEW changes view", () => {
    const state = reducer(initialState, { type: "SET_VIEW", view: "detail" });
    expect(state.view).toBe("detail");
  });

  it("SET_SCROLL_OFFSET updates scrollOffset", () => {
    const state = reducer(initialState, { type: "SET_SCROLL_OFFSET", offset: 10 });
    expect(state.scrollOffset).toBe(10);
  });

  it("SET_CONVERSATION sets messages and clears loading", () => {
    const prev = { ...initialState, conversationLoading: true };
    const messages = [{ role: "user" as const, text: "hi", timestamp: "" }];
    const state = reducer(prev, { type: "SET_CONVERSATION", messages });
    expect(state.conversation).toBe(messages);
    expect(state.conversationLoading).toBe(false);
  });

  it("SET_CONVERSATION_LOADING clears conversation and resets detail scroll", () => {
    const prev = {
      ...initialState,
      conversation: [{ role: "user" as const, text: "hi", timestamp: "" }],
      detailScrollOffset: 5,
    };
    const state = reducer(prev, { type: "SET_CONVERSATION_LOADING", loading: true });
    expect(state.conversationLoading).toBe(true);
    expect(state.conversation).toEqual([]);
    expect(state.detailScrollOffset).toBe(0);
  });

  it("SET_DETAIL_SCROLL updates detailScrollOffset", () => {
    const state = reducer(initialState, { type: "SET_DETAIL_SCROLL", offset: 7 });
    expect(state.detailScrollOffset).toBe(7);
  });

  it("returns same state for unknown action", () => {
    const state = reducer(initialState, { type: "UNKNOWN" } as unknown as AppAction);
    expect(state).toBe(initialState);
  });
});
