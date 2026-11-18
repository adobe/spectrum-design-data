// Copyright 2026 Adobe. All rights reserved.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { crosswalkHandoff } from "../src/features/design-data/taxonomyCrosswalk";

const target = fileURLToPath(
  new URL("../docs/rfcs/design-data-handoff.md", import.meta.url),
);
writeFileSync(target, crosswalkHandoff());
console.log(`Wrote ${target}`);
