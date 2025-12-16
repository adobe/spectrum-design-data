/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import XLSX from "xlsx";
import { resolve } from "path";

/**
 * Parse the Excel file to extract naming rules and generate enums
 * @param {string} excelPath - Path to spectrum-token-name-parts.xlsx
 * @returns {Object} Extracted naming rules and enum data
 */
export function parseExcelRules(excelPath) {
  const workbook = XLSX.readFile(excelPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert worksheet to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Initialize collections
  const anatomyParts = new Set();
  const indexValues = new Set(); // Numeric indices from token names
  const sizeOptions = new Set(); // T-shirt sizes (component options)
  const modifiers = new Set();
  const groups = new Set();
  const components = new Set();
  const properties = new Set();

  // Process each row
  for (const row of data) {
    // Extract token name
    const tokenName = row["Token Name"];
    if (!tokenName) continue;

    // Extract group
    if (row["Group"]) {
      groups.add(row["Group"]);
    }

    // Extract From-To anatomy parts
    if (row["From-To"]) {
      const fromTo = row["From-To"];
      // Pattern: {anatomy-part-x}-to-{anatomy-part-y}
      const match = fromTo.match(/^(.+)-to-(.+)$/);
      if (match) {
        anatomyParts.add(match[1]);
        anatomyParts.add(match[2]);
      }
    }

    // Extract numeric index values from token names (e.g., -50, -75, -100)
    const indexMatch = tokenName.match(/-(\d+)$/);
    if (indexMatch) {
      indexValues.add(indexMatch[1]);
    }

    // Extract t-shirt size options (component options like small, medium, large)
    if (row["Size"]) {
      sizeOptions.add(String(row["Size"]));
    }

    // Extract modifiers (Quiet column as example)
    if (row["Quiet"]) {
      modifiers.add("quiet");
    }

    // Parse token name for components and properties
    const parts = tokenName.split("-");

    // Detect component names (common patterns)
    if (parts.length >= 2) {
      // Check if first part is a known component
      const potentialComponent = parts[0];
      if (
        ["component", "field", "button", "checkbox"].includes(
          potentialComponent,
        )
      ) {
        components.add(potentialComponent);
      }

      // Check for multi-word components (e.g., "workflow-icon")
      if (parts.length >= 3 && parts[1] === "icon") {
        components.add(`${parts[0]}-icon`);
      }
    }

    // Detect property names
    if (tokenName.includes("-size-")) {
      properties.add("size");
    }
    if (tokenName.includes("-color-")) {
      properties.add("color");
    }
    if (tokenName.includes("-radius")) {
      properties.add("corner-radius");
    }
    if (tokenName.includes("spacing")) {
      properties.add("spacing");
    }
  }

  return {
    anatomyParts: Array.from(anatomyParts).sort(),
    indexValues: Array.from(indexValues).sort(
      (a, b) => parseInt(a) - parseInt(b),
    ),
    sizeOptions: Array.from(sizeOptions).sort(),
    modifiers: Array.from(modifiers).sort(),
    groups: Array.from(groups).sort(),
    components: Array.from(components).sort(),
    properties: Array.from(properties).sort(),
    rawData: data,
  };
}

/**
 * Get the default Excel file path
 * @returns {string} Path to the Excel file
 */
export function getExcelPath() {
  return resolve(process.cwd(), "spectrum-token-name-parts.xlsx");
}

export default { parseExcelRules, getExcelPath };
