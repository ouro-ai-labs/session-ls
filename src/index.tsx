#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { spawn } from "node:child_process";
import { App } from "./app.js";
import { existsSync } from "node:fs";
import { getLaunchRequest } from "./launchClaude.js";
import { decodePath } from "./utils/path.js";
import { buildIndex } from "./services/indexer.js";

const args = process.argv.slice(2);

if (args[0] === "build-search-index") {
  // CLI subcommand: build/update the full-text search index over all conversation history
  console.log("Building full-text search index over all conversation history...\n");

  buildIndex((progress) => {
    if (progress.phase === "scanning") {
      process.stdout.write("\rScanning session files...");
    } else if (progress.phase === "indexing") {
      const pct = progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;
      process.stdout.write(
        `\rIndexing: ${progress.current}/${progress.total} sessions (${pct}%)`
      );
    } else if (progress.phase === "done") {
      process.stdout.write("\n");
      if (progress.total === 0) {
        console.log("Index is already up to date.");
      } else {
        console.log(`Done. Indexed ${progress.total} sessions.`);
      }
      console.log("\nFull-text search is now available in the TUI.");
    }
  }).catch((err) => {
    console.error("\nIndexing failed:", err);
    process.exit(1);
  });
} else {
  // Default: launch TUI
  const instance = render(<App />);

  instance.waitUntilExit().then(() => {
    const request = getLaunchRequest();
    if (!request) return;

    // Resolve project path: may be absolute or encoded (e.g. "-Users-foo-bar")
    let cwd = request.projectPath;
    if (!cwd.startsWith("/")) {
      cwd = decodePath(cwd);
    }

    const args = ["--resume", request.sessionId];
    if (!existsSync(cwd)) {
      console.error(`Project path does not exist: ${cwd}`);
      process.exit(1);
    }

    const child = spawn("claude", args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });
    child.on("exit", (code) => process.exit(code ?? 0));
  });
}
