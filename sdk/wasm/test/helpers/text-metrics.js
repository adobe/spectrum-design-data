// Copyright 2026 Adobe. All rights reserved.

import { readFileSync } from "node:fs";

// The committed default table, the same file the renderer embeds and the site ships.
export const tablePath = new URL(
  "../../../core/src/text-metrics/source-sans-3.json",
  import.meta.url,
);
export const defaultTable = JSON.parse(readFileSync(tablePath, "utf8"));
