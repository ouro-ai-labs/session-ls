import Fuse, { type IFuseOptions } from "fuse.js";
import type { Session } from "../types.js";

let fuse: Fuse<Session> | null = null;

const fuseOptions: IFuseOptions<Session> = {
  keys: [
    { name: "projectName", weight: 0.3 },
    { name: "slug", weight: 0.25 },
    { name: "gitBranch", weight: 0.2 },
    { name: "displayMessages", weight: 0.25 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
};

export function initFuzzy(sessions: Session[]): void {
  fuse = new Fuse(sessions, fuseOptions);
}

export function fuzzySearch(query: string): Session[] {
  if (!fuse) return [];
  return fuse.search(query).map((r) => r.item);
}
