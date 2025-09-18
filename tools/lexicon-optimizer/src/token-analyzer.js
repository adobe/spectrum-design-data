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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Design Token Analyzer - Analyzes hyphen-delimited token names
 */
export class TokenAnalyzer {
  constructor() {
    this.tokenLexicon = {
      segments: new Set(), // Individual segments (e.g., "background", "color", "primary")
      patterns: new Map(), // Common patterns (e.g., "color-*", "*-size-*")
      compoundTerms: new Set(), // Multi-word terms (e.g., "background-color")
      prefixes: new Map(), // Common prefixes (e.g., "color-", "size-")
      suffixes: new Map(), // Common suffixes (e.g., "-color", "-size")
      hierarchies: new Map(), // Hierarchical relationships
      categories: new Map(), // Token categories by file
    };

    this.analysis = {
      totalTokens: 0,
      totalSegments: 0,
      uniqueSegments: 0,
      commonPatterns: [],
      potentialIssues: [],
      recommendations: [],
    };
  }

  /**
   * Load all design token files
   */
  loadTokenFiles() {
    const tokensPath = join(__dirname, "../../../packages/tokens/src");
    const tokenFiles = readdirSync(tokensPath).filter((file) =>
      file.endsWith(".json"),
    );

    const tokens = [];
    for (const file of tokenFiles) {
      try {
        const tokenPath = join(tokensPath, file);
        const tokenData = JSON.parse(readFileSync(tokenPath, "utf8"));
        const category = file.replace(".json", "");

        for (const [tokenName, tokenDef] of Object.entries(tokenData)) {
          tokens.push({
            name: tokenName,
            category: category,
            definition: tokenDef,
            fileContext: this.analyzeFileContext(category, tokenName, tokenDef),
          });
        }
      } catch (error) {
        console.warn(
          `Warning: Could not load token file ${file}:`,
          error.message,
        );
      }
    }

    return tokens;
  }

  /**
   * Analyze file context and component relationships
   */
  analyzeFileContext(category, tokenName, tokenDef) {
    const context = {
      fileCategory: category,
      expectedPrefix: this.getExpectedPrefixFromCategory(category),
      hasComponent: !!tokenDef.component,
      componentName: tokenDef.component || null,
      shouldStartWithComponent: !!tokenDef.component,
      contextMismatch: false,
      suggestions: [],
    };

    // Check if token should start with component name
    if (context.hasComponent && context.componentName) {
      const expectedComponentPrefix = context.componentName
        .toLowerCase()
        .replace(/\s+/g, "-");
      if (!tokenName.startsWith(expectedComponentPrefix)) {
        context.contextMismatch = true;
        context.suggestions.push(
          `Token should start with component name: ${expectedComponentPrefix}`,
        );
      }
    }

    // Adobe Spectrum uses semantic naming, so we don't expect category prefixes
    // Instead, we validate that the token follows semantic naming patterns
    if (
      context.expectedPrefix &&
      typeof context.expectedPrefix === "string" &&
      context.expectedPrefix.includes("e.g.")
    ) {
      // This is a context description, not a prefix expectation
      context.semanticNaming = true;
      context.categoryDescription = context.expectedPrefix;
    }

    return context;
  }

  /**
   * Get expected prefix based on file category
   * Based on Adobe Spectrum design token naming conventions
   */
  getExpectedPrefixFromCategory(category) {
    // Adobe Spectrum uses semantic naming, not category prefixes
    // The file category indicates the token type, but tokens use semantic names
    const categoryContext = {
      "color-palette": "Base color values (e.g., blue-100, gray-200)",
      "color-aliases":
        "Semantic color aliases (e.g., focus-indicator-color, overlay-color)",
      "color-component":
        "Component-specific colors (e.g., swatch-border-color)",
      "semantic-color-palette":
        "Semantic color system (e.g., text-color, background-color)",
      typography:
        "Typography tokens (e.g., default-font-family, text-align-start)",
      layout: "Layout and spacing (e.g., corner-radius-100, margin-0)",
      "layout-component":
        "Component-specific layout (e.g., button-height, input-width)",
      icons: "Icon-related tokens (e.g., icon-size, icon-color)",
    };

    return categoryContext[category] || "General design token";
  }

  /**
   * Split token name into segments and analyze patterns
   */
  analyzeTokenName(tokenName, category, fileContext = null) {
    const segments = tokenName.split("-");
    this.analysis.totalTokens++;
    this.analysis.totalSegments += segments.length;

    // Add individual segments
    segments.forEach((segment) => {
      this.tokenLexicon.segments.add(segment);
    });

    // Analyze patterns with context
    this.analyzePatterns(tokenName, segments, category, fileContext);

    // Identify compound terms with context
    this.identifyCompoundTerms(tokenName, segments, fileContext);

    // Analyze hierarchies with context
    this.analyzeHierarchy(tokenName, segments, category, fileContext);
  }

  /**
   * Analyze common patterns in token names
   */
  analyzePatterns(tokenName, segments, category, fileContext = null) {
    // Create pattern variations
    const patterns = this.generatePatterns(tokenName, segments, fileContext);

    patterns.forEach((pattern) => {
      if (!this.tokenLexicon.patterns.has(pattern)) {
        this.tokenLexicon.patterns.set(pattern, []);
      }
      this.tokenLexicon.patterns.get(pattern).push({
        tokenName,
        category,
        segments,
        fileContext,
      });
    });
  }

  /**
   * Generate pattern variations for a token name
   */
  generatePatterns(tokenName, segments, fileContext = null) {
    const patterns = [];

    // Full pattern with wildcards
    patterns.push(tokenName);

    // Segment-based patterns
    for (let i = 0; i < segments.length; i++) {
      const pattern = segments
        .map((seg, idx) => (idx === i ? "*" : seg))
        .join("-");
      patterns.push(pattern);
    }

    // Prefix patterns
    for (let i = 1; i < segments.length; i++) {
      const prefix = segments.slice(0, i).join("-") + "-*";
      patterns.push(prefix);
    }

    // Suffix patterns
    for (let i = 0; i < segments.length - 1; i++) {
      const suffix = "*" + segments.slice(i).join("-");
      patterns.push(suffix);
    }

    // Context-aware patterns
    if (fileContext) {
      // Component-based patterns
      if (fileContext.hasComponent && fileContext.componentName) {
        const componentPrefix = fileContext.componentName
          .toLowerCase()
          .replace(/\s+/g, "-");
        if (tokenName.startsWith(componentPrefix)) {
          const componentPattern = componentPrefix + "-*";
          patterns.push(componentPattern);
        }
      }

      // File category patterns
      if (
        fileContext.expectedPrefix &&
        tokenName.startsWith(fileContext.expectedPrefix)
      ) {
        const categoryPattern = fileContext.expectedPrefix + "*";
        patterns.push(categoryPattern);
      }
    }

    return patterns;
  }

  /**
   * Identify compound terms (multi-word concepts)
   */
  identifyCompoundTerms(tokenName, segments) {
    // Common compound terms in design systems
    const compoundTerms = [
      "background-color",
      "border-radius",
      "box-shadow",
      "text-align",
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "letter-spacing",
      "word-spacing",
      "text-decoration",
      "border-width",
      "border-style",
      "border-color",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "z-index",
      "opacity",
      "transform",
      "transition",
      "flex-direction",
      "justify-content",
      "align-items",
      "grid-template",
      "grid-gap",
      "grid-area",
    ];

    // Check if token contains compound terms
    compoundTerms.forEach((term) => {
      if (tokenName.includes(term)) {
        this.tokenLexicon.compoundTerms.add(term);
      }
    });

    // Identify potential compound terms by analyzing adjacent segments
    for (let i = 0; i < segments.length - 1; i++) {
      const potentialTerm = `${segments[i]}-${segments[i + 1]}`;
      if (this.isLikelyCompoundTerm(potentialTerm)) {
        this.tokenLexicon.compoundTerms.add(potentialTerm);
      }
    }
  }

  /**
   * Check if a term is likely a compound term
   */
  isLikelyCompoundTerm(term) {
    // Common compound term patterns
    const patterns = [
      /^[a-z]+-[a-z]+$/, // Two words
      /^[a-z]+-[a-z]+-[a-z]+$/, // Three words
      /color$/, // Ends with color
      /size$/, // Ends with size
      /width$/, // Ends with width
      /height$/, // Ends with height
      /radius$/, // Ends with radius
      /spacing$/, // Ends with spacing
      /family$/, // Ends with family
      /weight$/, // Ends with weight
      /align$/, // Ends with align
      /direction$/, // Ends with direction
      /content$/, // Ends with content
    ];

    return patterns.some((pattern) => pattern.test(term));
  }

  /**
   * Analyze hierarchical relationships
   */
  analyzeHierarchy(tokenName, segments, category) {
    // Build hierarchy tree
    let currentPath = "";
    for (let i = 0; i < segments.length; i++) {
      currentPath = currentPath ? `${currentPath}-${segments[i]}` : segments[i];

      if (!this.tokenLexicon.hierarchies.has(currentPath)) {
        this.tokenLexicon.hierarchies.set(currentPath, {
          level: i,
          children: new Set(),
          parents: new Set(),
          tokens: new Set(),
          categories: new Set(),
        });
      }

      const node = this.tokenLexicon.hierarchies.get(currentPath);
      node.tokens.add(tokenName);
      node.categories.add(category);

      // Add parent-child relationships
      if (i > 0) {
        const parentPath = segments.slice(0, i).join("-");
        if (this.tokenLexicon.hierarchies.has(parentPath)) {
          this.tokenLexicon.hierarchies
            .get(parentPath)
            .children.add(currentPath);
          node.parents.add(parentPath);
        }
      }
    }
  }

  /**
   * Analyze prefixes and suffixes
   */
  analyzePrefixesAndSuffixes() {
    for (const [pattern, tokens] of this.tokenLexicon.patterns) {
      if (pattern.endsWith("-*")) {
        const prefix = pattern.slice(0, -2);
        if (!this.tokenLexicon.prefixes.has(prefix)) {
          this.tokenLexicon.prefixes.set(prefix, []);
        }
        this.tokenLexicon.prefixes.get(prefix).push(...tokens);
      }

      if (pattern.startsWith("*-")) {
        const suffix = pattern.slice(2);
        if (!this.tokenLexicon.suffixes.has(suffix)) {
          this.tokenLexicon.suffixes.set(suffix, []);
        }
        this.tokenLexicon.suffixes.get(suffix).push(...tokens);
      }
    }
  }

  /**
   * Find potential issues and inconsistencies
   */
  findIssues() {
    const issues = [];

    // Check for inconsistent naming patterns
    this.findInconsistentPatterns(issues);

    // Check for potential typos
    this.findPotentialTypos(issues);

    // Check for missing compound terms
    this.findMissingCompoundTerms(issues);

    // Check for hierarchy inconsistencies
    this.findHierarchyIssues(issues);

    // Check for context mismatches
    this.findContextMismatches(issues);

    return issues;
  }

  /**
   * Find inconsistent naming patterns
   */
  findInconsistentPatterns(issues) {
    // Group tokens by similar patterns
    const patternGroups = new Map();

    for (const [pattern, tokens] of this.tokenLexicon.patterns) {
      if (tokens.length > 1) {
        const basePattern = pattern.replace(/\*/g, "");
        if (!patternGroups.has(basePattern)) {
          patternGroups.set(basePattern, []);
        }
        patternGroups.get(basePattern).push({ pattern, tokens });
      }
    }

    // Find inconsistencies
    for (const [basePattern, variations] of patternGroups) {
      if (variations.length > 1) {
        issues.push({
          type: "inconsistent_pattern",
          message: `Inconsistent patterns for "${basePattern}"`,
          details: variations.map((v) => ({
            pattern: v.pattern,
            count: v.tokens.length,
            examples: v.tokens.slice(0, 3).map((t) => t.tokenName),
          })),
          recommendation: "Consider standardizing the naming pattern",
        });
      }
    }
  }

  /**
   * Find potential typos in token names
   */
  findPotentialTypos(issues) {
    const segments = Array.from(this.tokenLexicon.segments);
    const similarSegments = [];

    // Find similar segments
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const seg1 = segments[i];
        const seg2 = segments[j];
        const distance = this.levenshteinDistance(seg1, seg2);

        if (distance <= 2 && distance > 0) {
          similarSegments.push({ seg1, seg2, distance });
        }
      }
    }

    if (similarSegments.length > 0) {
      issues.push({
        type: "potential_typos",
        message: "Potential typos in token segments",
        details: similarSegments,
        recommendation: "Review similar segments for typos",
      });
    }
  }

  /**
   * Find missing compound terms
   */
  findMissingCompoundTerms(issues) {
    const segments = Array.from(this.tokenLexicon.segments);
    const compoundTerms = Array.from(this.tokenLexicon.compoundTerms);

    // Look for segments that could form compound terms
    const potentialCompounds = [];
    for (let i = 0; i < segments.length - 1; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const potential = `${segments[i]}-${segments[j]}`;
        if (
          !compoundTerms.includes(potential) &&
          this.isLikelyCompoundTerm(potential)
        ) {
          potentialCompounds.push(potential);
        }
      }
    }

    if (potentialCompounds.length > 0) {
      issues.push({
        type: "missing_compound_terms",
        message: "Potential missing compound terms",
        details: potentialCompounds,
        recommendation: "Consider if these should be compound terms",
      });
    }
  }

  /**
   * Find hierarchy issues
   */
  findHierarchyIssues(issues) {
    // Check for inconsistent hierarchy levels
    const levelGroups = new Map();

    for (const [path, node] of this.tokenLexicon.hierarchies) {
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, []);
      }
      levelGroups.get(node.level).push({ path, node });
    }

    // Find levels with very few items (potential inconsistencies)
    for (const [level, nodes] of levelGroups) {
      if (nodes.length < 3 && level > 0) {
        issues.push({
          type: "sparse_hierarchy_level",
          message: `Sparse hierarchy level ${level}`,
          details: nodes.map((n) => n.path),
          recommendation:
            "Consider consolidating or expanding this hierarchy level",
        });
      }
    }
  }

  /**
   * Find context mismatches based on Adobe Spectrum naming conventions
   */
  findContextMismatches(issues) {
    const contextIssues = [];

    // Check all patterns for context mismatches
    for (const [pattern, tokens] of this.tokenLexicon.patterns) {
      for (const token of tokens) {
        if (token.fileContext && token.fileContext.contextMismatch) {
          contextIssues.push({
            tokenName: token.tokenName,
            category: token.category,
            issues: token.fileContext.suggestions,
            componentName: token.fileContext.componentName,
            categoryDescription: token.fileContext.categoryDescription,
          });
        }
      }
    }

    if (contextIssues.length > 0) {
      // Group by issue type
      const componentMismatches = contextIssues.filter(
        (issue) => issue.componentName,
      );

      if (componentMismatches.length > 0) {
        issues.push({
          type: "component_naming_mismatch",
          message: `Found ${componentMismatches.length} tokens that don't start with their component name`,
          details: componentMismatches.map((issue) => ({
            token: issue.tokenName,
            component: issue.componentName,
            suggestions: issue.issues,
          })),
          recommendation:
            "Ensure tokens with component property start with the component name",
        });
      }
    }

    // Add semantic naming analysis
    this.analyzeSemanticNamingPatterns(issues);
  }

  /**
   * Analyze semantic naming patterns according to Adobe Spectrum conventions
   */
  analyzeSemanticNamingPatterns(issues) {
    const semanticPatterns = {
      "focus-indicator": [],
      overlay: [],
      "drop-shadow": [],
      "text-align": [],
      "font-family": [],
      "corner-radius": [],
      margin: [],
      padding: [],
    };

    // Collect tokens by semantic pattern
    for (const [pattern, tokens] of this.tokenLexicon.patterns) {
      for (const token of tokens) {
        const tokenName = token.tokenName;

        // Check for common semantic patterns
        for (const semanticPattern in semanticPatterns) {
          if (tokenName.includes(semanticPattern)) {
            semanticPatterns[semanticPattern].push({
              token: tokenName,
              category: token.category,
              fileContext: token.fileContext,
            });
          }
        }
      }
    }

    // Analyze semantic pattern consistency
    for (const [pattern, tokens] of Object.entries(semanticPatterns)) {
      if (tokens.length > 0) {
        const categories = [...new Set(tokens.map((t) => t.category))];
        if (categories.length > 1) {
          issues.push({
            type: "semantic_pattern_consistency",
            message: `Semantic pattern '${pattern}' appears across multiple categories`,
            details: {
              pattern: pattern,
              categories: categories,
              tokenCount: tokens.length,
              examples: tokens.slice(0, 5).map((t) => ({
                token: t.token,
                category: t.category,
              })),
            },
            recommendation: `Consider consolidating '${pattern}' tokens or ensure consistent usage across categories`,
          });
        }
      }
    }
  }

  /**
   * Levenshtein distance for finding similar strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Most common prefixes
    const commonPrefixes = Array.from(this.tokenLexicon.prefixes.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    if (commonPrefixes.length > 0) {
      recommendations.push({
        type: "common_prefixes",
        message: "Most common token prefixes",
        details: commonPrefixes.map(([prefix, tokens]) => ({
          prefix,
          count: tokens.length,
          examples: tokens.slice(0, 3).map((t) => t.tokenName),
        })),
        recommendation:
          "Use these prefixes consistently across token categories",
      });
    }

    // Most common suffixes
    const commonSuffixes = Array.from(this.tokenLexicon.suffixes.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    if (commonSuffixes.length > 0) {
      recommendations.push({
        type: "common_suffixes",
        message: "Most common token suffixes",
        details: commonSuffixes.map(([suffix, tokens]) => ({
          suffix,
          count: tokens.length,
          examples: tokens.slice(0, 3).map((t) => t.tokenName),
        })),
        recommendation:
          "Use these suffixes consistently across token categories",
      });
    }

    // Compound terms
    if (this.tokenLexicon.compoundTerms.size > 0) {
      recommendations.push({
        type: "compound_terms",
        message: "Identified compound terms",
        details: Array.from(this.tokenLexicon.compoundTerms),
        recommendation: "Ensure these compound terms are used consistently",
      });
    }

    return recommendations;
  }

  /**
   * Run complete token analysis
   */
  analyze() {
    console.log("🔍 Loading design token files...");
    const tokens = this.loadTokenFiles();

    console.log(`📊 Analyzing ${tokens.length} design tokens...`);

    for (const token of tokens) {
      this.analyzeTokenName(token.name, token.category, token.fileContext);
    }

    this.analyzePrefixesAndSuffixes();
    this.analysis.uniqueSegments = this.tokenLexicon.segments.size;

    const issues = this.findIssues();
    const recommendations = this.generateRecommendations();

    return {
      summary: {
        totalTokens: this.analysis.totalTokens,
        totalSegments: this.analysis.totalSegments,
        uniqueSegments: this.analysis.uniqueSegments,
        compoundTerms: this.tokenLexicon.compoundTerms.size,
        patterns: this.tokenLexicon.patterns.size,
        prefixes: this.tokenLexicon.prefixes.size,
        suffixes: this.tokenLexicon.suffixes.size,
      },
      lexicon: {
        segments: Array.from(this.tokenLexicon.segments).sort(),
        compoundTerms: Array.from(this.tokenLexicon.compoundTerms).sort(),
        commonPrefixes: Array.from(this.tokenLexicon.prefixes.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 20)
          .map(([prefix, tokens]) => ({ prefix, count: tokens.length })),
        commonSuffixes: Array.from(this.tokenLexicon.suffixes.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 20)
          .map(([suffix, tokens]) => ({ suffix, count: tokens.length })),
        patterns: Array.from(this.tokenLexicon.patterns.entries())
          .filter(([_, tokens]) => tokens.length > 1)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 20)
          .map(([pattern, tokens]) => ({ pattern, count: tokens.length })),
      },
      issues,
      recommendations,
      hierarchy: Object.fromEntries(
        Array.from(this.tokenLexicon.hierarchies.entries()).map(
          ([path, node]) => [
            path,
            {
              level: node.level,
              children: Array.from(node.children),
              parents: Array.from(node.parents),
              tokenCount: node.tokens.size,
              categories: Array.from(node.categories),
            },
          ],
        ),
      ),
    };
  }
}

export default TokenAnalyzer;
