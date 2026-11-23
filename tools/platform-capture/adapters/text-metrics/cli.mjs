#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import { parseArgs } from "node:util";
import { DEFAULT_KIT } from "../../lib/rasterize/index.mjs";
import { DEFAULT_FAMILY, DEFAULT_OUT, generate } from "./index.mjs";

const { values } = parseArgs({
  options: {
    kit: { type: "string", default: DEFAULT_KIT },
    family: { type: "string", default: DEFAULT_FAMILY },
    out: { type: "string", default: DEFAULT_OUT },
  },
});
const { table, out } = await generate({ kit: values.kit, family: values.family, out: values.out });
console.log(`wrote ${out}\nTest/700/14px = ${table.meta.test700At14px} px (${table.meta.generated}, ${table.meta.kit})`);
console.log("Derived from a licensed font: do not commit or publish this file. Use it with design-data --text-metrics.");
