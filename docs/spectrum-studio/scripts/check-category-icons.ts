// Copyright 2026 Adobe. All rights reserved.
import {
  categoryIconConfiguration,
  validateCategoryIcons,
} from "../src/features/icons/categoryIcons";

const issues = validateCategoryIcons(categoryIconConfiguration);
if (issues.length)
  throw new Error(`Invalid category icon configuration:\n${issues.join("\n")}`);
console.log("Category icon configuration is valid.");
