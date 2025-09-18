/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import TokenAnalyzer from "./token-analyzer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Lexicon Optimizer - Analyzes component schemas to extract and optimize terminology
 */
export class LexiconOptimizer {
  constructor() {
    this.lexicon = {
      propertyNames: new Set(),
      enumValues: new Set(),
      descriptions: new Set(),
      categories: new Set(),
      stateValues: new Set(),
      componentTitles: new Set(),
      typeValues: new Set(),
    };
    this.componentStats = new Map();
    this.tokenAnalyzer = new TokenAnalyzer();
  }

  /**
   * Load all component schemas from the component-schemas package
   */
  loadComponentSchemas() {
    const schemasPath = join(
      __dirname,
      "../../../packages/component-schemas/schemas/components",
    );
    const schemaFiles = readdirSync(schemasPath).filter((file) =>
      file.endsWith(".json"),
    );

    const schemas = [];
    for (const file of schemaFiles) {
      try {
        const schemaPath = join(schemasPath, file);
        const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
        schemas.push({ fileName: file, schema });
      } catch (error) {
        console.warn(`Warning: Could not load schema ${file}:`, error.message);
      }
    }

    return schemas;
  }

  /**
   * Extract terms from a single component schema
   */
  analyzeSchema(schemaData) {
    const { fileName, schema } = schemaData;
    const componentName = fileName.replace(".json", "");

    // Initialize component stats
    this.componentStats.set(componentName, {
      totalProperties: 0,
      enumProperties: 0,
      booleanProperties: 0,
      stringProperties: 0,
      numberProperties: 0,
      hasState: false,
      hasSize: false,
      hasLabel: false,
    });

    // Extract component title
    if (schema.title) {
      this.lexicon.componentTitles.add(schema.title);
    }

    // Extract category
    if (schema.meta?.category) {
      this.lexicon.categories.add(schema.meta.category);
    }

    // Extract description terms
    if (schema.description) {
      this.extractDescriptionTerms(schema.description);
    }

    // Analyze properties
    if (schema.properties) {
      this.analyzeProperties(schema.properties, componentName);
    }

    return this.componentStats.get(componentName);
  }

  /**
   * Analyze component properties
   */
  analyzeProperties(properties, componentName) {
    const stats = this.componentStats.get(componentName);

    for (const [propName, propDef] of Object.entries(properties)) {
      stats.totalProperties++;

      // Extract property name
      this.lexicon.propertyNames.add(propName);

      // Track property type
      if (propDef.type) {
        this.lexicon.typeValues.add(propDef.type);

        if (propDef.type === "boolean") {
          stats.booleanProperties++;
        } else if (propDef.type === "string") {
          stats.stringProperties++;
        } else if (propDef.type === "number") {
          stats.numberProperties++;
        }
      }

      // Track specific property types
      if (propName === "state") {
        stats.hasState = true;
      }
      if (propName === "size") {
        stats.hasSize = true;
      }
      if (propName === "label") {
        stats.hasLabel = true;
      }

      // Extract enum values
      if (propDef.enum) {
        stats.enumProperties++;
        propDef.enum.forEach((value) => {
          this.lexicon.enumValues.add(value);

          // Special handling for state values
          if (propName === "state") {
            this.lexicon.stateValues.add(value);
          }
        });
      }

      // Extract description terms
      if (propDef.description) {
        this.extractDescriptionTerms(propDef.description);
      }

      // Handle default values
      if (propDef.default !== undefined) {
        this.lexicon.enumValues.add(String(propDef.default));
      }
    }
  }

  /**
   * Extract meaningful terms from descriptions
   */
  extractDescriptionTerms(description) {
    if (!description) return;

    // Simple term extraction - could be enhanced with NLP
    const terms = description
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .split(/\s+/)
      .filter((term) => term.length > 2) // Filter out short words
      .filter((term) => !this.isCommonWord(term)); // Filter out common words

    terms.forEach((term) => this.lexicon.descriptions.add(term));
  }

  /**
   * Check if a word is a common English word (basic list)
   */
  isCommonWord(word) {
    const commonWords = new Set([
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "among",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
      "a",
      "an",
      "some",
      "any",
      "all",
      "each",
      "every",
      "no",
      "not",
      "only",
      "also",
      "just",
      "even",
      "still",
      "yet",
      "already",
      "here",
      "there",
      "where",
      "when",
      "why",
      "how",
      "what",
      "which",
      "who",
      "whom",
      "whose",
      "if",
      "then",
      "else",
      "because",
      "although",
      "though",
      "unless",
      "until",
      "while",
      "since",
      "as",
      "so",
      "such",
      "very",
      "too",
      "much",
      "many",
      "more",
      "most",
      "less",
      "least",
      "few",
      "little",
      "big",
      "small",
      "large",
      "long",
      "short",
      "high",
      "low",
      "new",
      "old",
      "good",
      "bad",
      "great",
      "better",
      "best",
      "worse",
      "worst",
      "same",
      "different",
      "other",
      "another",
      "first",
      "last",
      "next",
      "previous",
      "current",
      "recent",
      "early",
      "late",
      "fast",
      "slow",
      "quick",
      "easy",
      "hard",
      "simple",
      "complex",
      "important",
      "necessary",
      "possible",
      "available",
      "required",
      "optional",
    ]);

    return commonWords.has(word);
  }

  /**
   * Run the complete lexicon analysis
   */
  analyze(includeTokens = false) {
    console.log("🔍 Loading component schemas...");
    const schemas = this.loadComponentSchemas();

    console.log(`📊 Analyzing ${schemas.length} component schemas...`);

    for (const schemaData of schemas) {
      this.analyzeSchema(schemaData);
    }

    const report = this.generateReport();

    // Add token analysis if requested
    if (includeTokens) {
      console.log("🎨 Analyzing design tokens...");
      const tokenAnalysis = this.tokenAnalyzer.analyze();
      report.tokens = tokenAnalysis;
    }

    return report;
  }

  /**
   * Generate a comprehensive lexicon report
   */
  generateReport() {
    const report = {
      summary: {
        totalComponents: this.componentStats.size,
        totalPropertyNames: this.lexicon.propertyNames.size,
        totalEnumValues: this.lexicon.enumValues.size,
        totalDescriptions: this.lexicon.descriptions.size,
        totalCategories: this.lexicon.categories.size,
        totalStateValues: this.lexicon.stateValues.size,
        totalComponentTitles: this.lexicon.componentTitles.size,
        totalTypeValues: this.lexicon.typeValues.size,
      },
      lexicon: {
        propertyNames: Array.from(this.lexicon.propertyNames).sort(),
        enumValues: Array.from(this.lexicon.enumValues).sort(),
        descriptions: Array.from(this.lexicon.descriptions).sort(),
        categories: Array.from(this.lexicon.categories).sort(),
        stateValues: Array.from(this.lexicon.stateValues).sort(),
        componentTitles: Array.from(this.lexicon.componentTitles).sort(),
        typeValues: Array.from(this.lexicon.typeValues).sort(),
      },
      componentStats: Object.fromEntries(this.componentStats),
      insights: this.generateInsights(),
    };

    return report;
  }

  /**
   * Generate insights about the lexicon
   */
  generateInsights() {
    const insights = [];

    // Most common property names
    const propertyCounts = new Map();
    for (const [_, stats] of this.componentStats) {
      // This would need to be tracked during analysis
    }

    // Size consistency
    const sizeValues = Array.from(this.lexicon.enumValues).filter((v) =>
      ["s", "m", "l", "xl", "xs", "xxl"].includes(v),
    );
    if (sizeValues.length > 0) {
      insights.push({
        type: "size_consistency",
        message: `Found ${sizeValues.length} size values: ${sizeValues.join(", ")}`,
        recommendation: "Consider standardizing size values across components",
      });
    }

    // State consistency
    const stateValues = Array.from(this.lexicon.stateValues);
    if (stateValues.length > 0) {
      insights.push({
        type: "state_consistency",
        message: `Found ${stateValues.length} state values: ${stateValues.join(", ")}`,
        recommendation: "Consider standardizing state values across components",
      });
    }

    // Boolean property patterns
    const booleanProps = Array.from(this.lexicon.propertyNames).filter(
      (name) =>
        name.startsWith("is") ||
        name.startsWith("has") ||
        name.startsWith("show"),
    );
    if (booleanProps.length > 0) {
      insights.push({
        type: "boolean_patterns",
        message: `Found ${booleanProps.length} boolean properties following naming patterns`,
        recommendation:
          "Maintain consistent boolean property naming conventions",
      });
    }

    return insights;
  }

  /**
   * Export lexicon data to various formats
   */
  exportToFormat(format = "json") {
    const report = this.generateReport();

    switch (format.toLowerCase()) {
      case "json":
        return JSON.stringify(report, null, 2);

      case "csv":
        return this.exportToCSV(report);

      case "markdown":
        return this.exportToMarkdown(report);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Export to CSV format
   */
  exportToCSV(report) {
    const lines = ["Type,Term,Count"];

    // Property names
    report.lexicon.propertyNames.forEach((term) => {
      lines.push(`Property Name,${term},1`);
    });

    // Enum values
    report.lexicon.enumValues.forEach((term) => {
      lines.push(`Enum Value,${term},1`);
    });

    // Categories
    report.lexicon.categories.forEach((term) => {
      lines.push(`Category,${term},1`);
    });

    return lines.join("\n");
  }

  /**
   * Export to Markdown format
   */
  exportToMarkdown(report) {
    let markdown = "# Lexicon Optimizer Report\n\n";

    markdown += "## Summary\n\n";
    markdown += `- **Total Components**: ${report.summary.totalComponents}\n`;
    markdown += `- **Property Names**: ${report.summary.totalPropertyNames}\n`;
    markdown += `- **Enum Values**: ${report.summary.totalEnumValues}\n`;
    markdown += `- **Categories**: ${report.summary.totalCategories}\n`;
    markdown += `- **State Values**: ${report.summary.totalStateValues}\n\n`;

    markdown += "## Property Names\n\n";
    markdown +=
      report.lexicon.propertyNames.map((name) => `- \`${name}\``).join("\n") +
      "\n\n";

    markdown += "## Enum Values\n\n";
    markdown +=
      report.lexicon.enumValues.map((value) => `- \`${value}\``).join("\n") +
      "\n\n";

    markdown += "## Categories\n\n";
    markdown +=
      report.lexicon.categories.map((cat) => `- \`${cat}\``).join("\n") +
      "\n\n";

    markdown += "## Insights\n\n";
    report.insights.forEach((insight) => {
      markdown += `### ${insight.type.replace("_", " ").toUpperCase()}\n\n`;
      markdown += `${insight.message}\n\n`;
      markdown += `**Recommendation**: ${insight.recommendation}\n\n`;
    });

    return markdown;
  }
}

export default LexiconOptimizer;
