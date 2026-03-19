import React, { useEffect, useReducer, useCallback, useRef } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import type { AppState, AppAction } from "./types.js";
import { scanSessions } from "./services/scanner.js";
import { readConversation } from "./services/conversation.js";
import { setLaunchRequest } from "./launchClaude.js";
import { initFuzzy, fuzzySearch } from "./utils/fuzzy.js";
import { SearchBar } from "./components/SearchBar.js";
import { SessionList } from "./components/SessionList.js";
import { SessionDetail } from "./components/SessionDetail.js";
import { ConversationView } from "./components/ConversationView.js";
import { StatusBar } from "./components/StatusBar.js";

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

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { exit } = useApp();
  const { stdout } = useStdout();
  const termHeight = stdout?.rows ?? 24;
  const visibleRows = Math.max(termHeight - 6, 5);

  useEffect(() => {
    scanSessions().then((sessions) => {
      initFuzzy(sessions);
      dispatch({ type: "SET_SESSIONS", sessions });
    });
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionsRef = useRef(state.sessions);
  sessionsRef.current = state.sessions;

  const handleSearch = useCallback((query: string) => {
    dispatch({ type: "SET_SEARCH", query });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!query.trim()) {
        dispatch({ type: "SET_FILTERED", sessions: sessionsRef.current });
      } else {
        const results = fuzzySearch(query);
        dispatch({ type: "SET_FILTERED", sessions: results });
      }
    }, 1000);
  }, []);

  useInput((input, key) => {
    if (input === "q" && !state.searchQuery && state.view === "list") {
      exit();
      return;
    }

    // Open Claude with this session (works in detail and conversation views)
    if (input === "o" && (state.view === "detail" || state.view === "conversation")) {
      const session = state.filteredSessions[state.selectedIndex];
      if (session) {
        setLaunchRequest({ sessionId: session.id, projectPath: session.projectPath });
        exit();
      }
      return;
    }

    // Conversation view: scroll or go back to detail
    if (state.view === "conversation") {
      if (key.escape || input === "q") {
        dispatch({ type: "SET_VIEW", view: "detail" });
      } else if (key.upArrow) {
        dispatch({ type: "SET_DETAIL_SCROLL", offset: Math.max(0, state.detailScrollOffset - 1) });
      } else if (key.downArrow) {
        dispatch({ type: "SET_DETAIL_SCROLL", offset: state.detailScrollOffset + 1 });
      } else if (key.pageDown) {
        dispatch({ type: "SET_DETAIL_SCROLL", offset: state.detailScrollOffset + visibleRows });
      } else if (key.pageUp) {
        dispatch({ type: "SET_DETAIL_SCROLL", offset: Math.max(0, state.detailScrollOffset - visibleRows) });
      }
      return;
    }

    // Detail view: Enter to view conversation, Esc to go back to list
    if (state.view === "detail") {
      if (key.escape || input === "q") {
        dispatch({ type: "SET_VIEW", view: "list" });
      } else if (key.return) {
        const session = state.filteredSessions[state.selectedIndex];
        if (session) {
          dispatch({ type: "SET_VIEW", view: "conversation" });
          dispatch({ type: "SET_CONVERSATION_LOADING", loading: true });
          readConversation(session.projectPath, session.id).then((messages) => {
            dispatch({ type: "SET_CONVERSATION", messages });
          });
        }
      }
      return;
    }

    // List view navigation
    const maxIndex = state.filteredSessions.length - 1;

    if (key.upArrow) {
      const newIndex = Math.max(0, state.selectedIndex - 1);
      dispatch({ type: "SET_SELECTED", index: newIndex });
      if (newIndex < state.scrollOffset) {
        dispatch({ type: "SET_SCROLL_OFFSET", offset: newIndex });
      }
    } else if (key.downArrow) {
      const newIndex = Math.min(maxIndex, state.selectedIndex + 1);
      dispatch({ type: "SET_SELECTED", index: newIndex });
      if (newIndex >= state.scrollOffset + visibleRows) {
        dispatch({
          type: "SET_SCROLL_OFFSET",
          offset: newIndex - visibleRows + 1,
        });
      }
    } else if (key.return && state.filteredSessions.length > 0) {
      dispatch({ type: "SET_VIEW", view: "detail" });
    } else if (key.escape) {
      if (state.searchQuery) {
        handleSearch("");
      }
    }
  });

  if (state.loading) {
    return (
      <Box padding={1}>
        <Text color="cyan">Scanning sessions...</Text>
      </Box>
    );
  }

  if (state.view === "conversation") {
    const session = state.filteredSessions[state.selectedIndex];
    if (!session) {
      dispatch({ type: "SET_VIEW", view: "list" });
      return null;
    }
    return (
      <ConversationView
        session={session}
        conversation={state.conversation}
        loading={state.conversationLoading}
        scrollOffset={state.detailScrollOffset}
        visibleRows={visibleRows}
      />
    );
  }

  if (state.view === "detail") {
    const session = state.filteredSessions[state.selectedIndex];
    if (!session) {
      dispatch({ type: "SET_VIEW", view: "list" });
      return null;
    }
    return (
      <Box flexDirection="column">
        <SessionDetail session={session} />
        <StatusBar
          filtered={state.filteredSessions.length}
          total={state.sessions.length}
          view="detail"
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SearchBar
        value={state.searchQuery}
        onChange={handleSearch}
        isActive={state.view === "list"}
      />
      <SessionList
        sessions={state.filteredSessions}
        selectedIndex={state.selectedIndex}
        scrollOffset={state.scrollOffset}
        visibleRows={visibleRows}
      />
      <StatusBar
        filtered={state.filteredSessions.length}
        total={state.sessions.length}
        view="list"
      />
    </Box>
  );
}
