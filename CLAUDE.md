# ContextMaster (session-ls) — Agent Instructions

This file defines the **operational workflow** for making changes in this repo (how to set up, run, test, build). Keep it short, specific, and executable.

Note: `AGENTS.md` is a symlink to this file (`CLAUDE.md`) for compatibility with multiple agent/rules systems.

Prerequisites: Node.js 20+.

## Project Overview

ContextMaster (`session-ls`) is a **Terminal User Interface (TUI) for browsing and searching Claude Code sessions**. It discovers sessions from `~/.claude/history.jsonl` and project directories, providing fuzzy search, session preview, and full conversation viewing through an interactive terminal interface.

Built with React + [ink](https://github.com/vadimdemedes/ink) for terminal rendering.

## Core Workflow (Verify -> Explore -> Plan -> Implement -> Ship)

- **Verify**: always define how correctness will be checked (manual TUI smoke test, expected output).
- **Explore**: read/grep before editing; confirm where the behavior lives.
- **Plan**: for multi-file or unfamiliar areas, write a short step plan before changing code.
- **Implement**: make the smallest change that satisfies acceptance criteria; keep diffs reviewable.
- **Ship**: run checks + update PR summary/checklist.

Skip the explicit plan only when the change is truly tiny and local (e.g., typo, small refactor in one file).

## Quickstart (Local Dev)

```bash
npm install
npm run build
npm start

# Or for development with hot reload:
npm run dev
```

After `npm link`, the `session-ls` command is available globally.

## Project Structure

```
src/
├── index.tsx              # CLI entry point (renders App with ink)
├── app.tsx                # Main app state machine (useReducer pattern)
├── types.ts               # All TypeScript interfaces
├── components/
│   ├── SearchBar.tsx      # Search input
│   ├── SessionList.tsx    # Scrollable session table
│   ├── SessionDetail.tsx  # Session metadata & preview
│   ├── ConversationView.tsx # Full conversation viewer
│   └── StatusBar.tsx      # Navigation help bar
├── services/
│   ├── scanner.ts         # Discovers & indexes sessions from ~/.claude/
│   └── conversation.ts   # Reads session JSONL files
└── utils/
    ├── fuzzy.ts           # Fuse.js wrapper for fuzzy search
    ├── path.ts            # Claude dir resolution, path encoding
    └── format.ts          # Date formatting, string truncation
```

## Language

All code, comments, commit messages, PR descriptions, and documentation must be written in **English**. No exceptions.

## TypeScript Conventions

- Strict mode enabled (`"strict": true` in tsconfig).
- ESM modules (`"type": "module"` in package.json, `"module": "NodeNext"` in tsconfig).
- JSX runtime: `react-jsx` (no manual `import React`).
- Prefer `interface` over `type` for object shapes.
- No `any` — use `unknown` and narrow, or define proper types in `types.ts`.
- Use named exports; avoid default exports.
- All shared types live in `src/types.ts`.

## Component Patterns

- Functional components with React hooks (`useState`, `useReducer`, `useEffect`, `useRef`).
- State management via `useReducer` with discriminated union actions.
- Props interfaces defined alongside each component.
- Keyboard-driven navigation (vim-style keys supported).

## Branching Workflow (Mandatory — No Exceptions)

**CRITICAL**: You MUST NOT commit or push directly to `main`. Every code change — no matter how small — must go through a git worktree + pull request workflow:

1. **Create a worktree** with a new branch: `git worktree add ../ContextMaster-<branch-name> -b <branch-name>`
2. **Switch to the worktree directory** (`cd ../ContextMaster-<branch-name>`) and do ALL development there.
3. Commit and push the branch, then **open a PR** to merge into `main`.
4. After the PR is merged, clean up: `git worktree remove ../ContextMaster-<branch-name>`

**Prohibited actions on `main`**:
- `git commit` directly on `main`
- `git push` to `main` (including `git push origin main`)
- `git merge` into local `main`

If you find yourself on `main`, **stop and create a worktree first**.

## Testing

- Before committing, **always** run: `npm run build` to verify the project compiles.
- Smoke test the TUI manually: `npm run dev` and verify navigation works.
- When a test framework is added, run the full suite before committing.

## Checkpoint Commits

Prefer small, reviewable commits:
- Before committing, run `npm run build`.
- Keep mechanical changes (formatting, renames) in their own commit when possible.
- **Human-in-the-loop**: at key checkpoints, the agent should *ask* whether to `git commit` and/or `git push` (do not do it automatically).
- Before asking to commit, show a short change summary (e.g. `git diff --stat`).

## Permissions / Approval Boundaries

Allowed without prompting:
- Read files, list directories, search.
- Run `npm run build` or `npm run dev`.

Require explicit confirmation first:
- Publishing or release actions (`npm publish`).
- Git operations that change remote history (`git push`, opening PRs).
- Deleting large amounts of files or doing broad refactors/renames.

## Ship Checklist

- [ ] `npm run build` passes
- [ ] TUI smoke test passes (`npm run dev`)
- [ ] PR description follows template

## PR Title Format (Required)

```
<type>(<scope>): <short description>
```

**Types** (pick one):

| Type       | When to use                                      |
| ---------- | ------------------------------------------------ |
| `feat`     | New user-facing feature                          |
| `fix`      | Bug fix                                          |
| `docs`     | Documentation only                               |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                         |
| `chore`    | Build, CI, dependency updates, or housekeeping   |
| `perf`     | Performance improvement                          |

**Scope** (optional): the area affected — e.g., `scanner`, `ui`, `search`, `conversation`.

**Examples**:

- `feat(ui): add session export to markdown`
- `fix(scanner): handle missing history.jsonl gracefully`
- `chore: upgrade ink to v7`
- `docs: update keybinding reference`

**Rules**:

- Use lowercase; no trailing period.
- Keep it under 70 characters.
- Use imperative mood ("add", not "added" or "adds").

## PR Description Template (Required)

## Summary

What changed and why (user-facing when applicable).

## Scope

- Goals:
- Non-goals:

## Acceptance Criteria

- [ ] Concrete, testable outcomes

## Test Plan

- [ ] Manual TUI smoke test
- [ ] `npm run build`

## Safety & Secrets

- Never commit API keys or tokens.
- Never commit `node_modules/`, `dist/`, or `.env` files.
- Avoid running destructive shell commands; keep file edits scoped and reversible.

## Gotchas (Common Rework Sources)

- **JSONL parsing**: session files may contain malformed lines; always wrap in try/catch and skip bad entries.
- **Path encoding**: Claude encodes project paths in directory names; use `src/utils/path.ts` helpers, don't hand-roll.
- **Concurrency**: scanner uses a pool pattern (`limitConcurrency`) to avoid opening too many files; respect this limit.
- **ink rendering**: terminal dimensions vary; test with different terminal sizes and handle overflow gracefully.
- **ESM imports**: all imports must use `.js` extensions in compiled output; TypeScript resolves `.ts` → `.js` via `NodeNext`.
