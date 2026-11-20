// Copyright 2026 Adobe. All rights reserved.
import {
  readStudioDataset,
  staleStudioData,
  writeStudioData,
} from "./studioDataFiles";

if (process.argv.includes("--check")) {
  const stale = staleStudioData(readStudioDataset());
  if (stale.length)
    throw new Error(
      `Studio data files are not normalized or the index is stale. Run pnpm data:studio.\n${stale.join("\n")}`,
    );
  console.log("Studio data files and their generated index are current.");
} else if (process.argv.includes("--write")) {
  const changed = writeStudioData(readStudioDataset());
  console.log(
    changed.length
      ? `Rewrote ${changed.length} Studio data files.`
      : "Studio data files are already current.",
  );
} else throw new Error("Use --check or --write.");
