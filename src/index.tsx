#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { spawn } from "node:child_process";
import { App } from "./app.js";
import { existsSync } from "node:fs";
import { getLaunchRequest } from "./launchClaude.js";
import { decodePath } from "./utils/path.js";

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
