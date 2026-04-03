export interface HistoryEntry {
  display: string;
  timestamp: string;
  project: string;
  sessionId: string;
}

export interface Session {
  id: string;
  projectPath: string;
  projectName: string;
  slug: string;
  gitBranch: string;
  displayMessages: string[];
  firstTimestamp: number;
  lastTimestamp: number;
  messageCount: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export type AppView = "list" | "detail" | "conversation";

export type IndexState = "none" | "indexing" | "ready";

export interface SearchResultMeta {
  source: "metadata" | "content" | "both";
  snippet?: string;
}

export interface AppState {
  sessions: Session[];
  filteredSessions: Session[];
  loading: boolean;
  searchQuery: string;
  selectedIndex: number;
  view: AppView;
  scrollOffset: number;
  conversation: ConversationMessage[];
  conversationLoading: boolean;
  detailScrollOffset: number;
  indexState: IndexState;
  indexProgress: string;
  /** Maps session ID to search result metadata (source, snippet) */
  searchMeta: Map<string, SearchResultMeta>;
}

export type AppAction =
  | { type: "SET_SESSIONS"; sessions: Session[] }
  | { type: "SET_FILTERED"; sessions: Session[]; searchMeta?: Map<string, SearchResultMeta> }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_SELECTED"; index: number }
  | { type: "SET_VIEW"; view: AppView }
  | { type: "SET_SCROLL_OFFSET"; offset: number }
  | { type: "SET_CONVERSATION"; messages: ConversationMessage[] }
  | { type: "SET_CONVERSATION_LOADING"; loading: boolean }
  | { type: "SET_DETAIL_SCROLL"; offset: number }
  | { type: "SET_INDEX_STATE"; indexState: IndexState; progress?: string };
