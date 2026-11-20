// Copyright 2026 Adobe. All rights reserved.
// Refreshes (--write) or proves (--check) Studio's practice copy of design-data.
import {
  checkDesignDataCopy,
  designDataCopyPaths,
  writeDesignDataCopy,
} from "./designDataCopy";

const mode = process.argv[2];
const paths = designDataCopyPaths();

if (mode === "--write") {
  const changed = writeDesignDataCopy(paths);
  console.log(
    changed.length
      ? `Updated ${changed.length} practice-copy file(s) and the source record.`
      : "Practice copy already matched; refreshed the source record.",
  );
} else if (mode === "--check") {
  const { errors, notes } = checkDesignDataCopy(paths);
  for (const note of notes) console.log(note);
  if (errors.length) {
    for (const error of errors.slice(0, 50)) console.error(error);
    if (errors.length > 50)
      console.error(`…and ${errors.length - 50} more problems.`);
    process.exitCode = 1;
  } else console.log("Practice copy of design-data passes the proof check.");
} else {
  console.error("Usage: design-data-snapshot.ts --write | --check");
  process.exitCode = 2;
}
