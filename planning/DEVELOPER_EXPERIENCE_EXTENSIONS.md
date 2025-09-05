# Developer Experience Extensions

## Executive Summary

This document outlines three critical developer experience extensions to the Spectrum design system: LLM/MCP integration for intelligent code assistance, comprehensive linting for deprecation and semantic usage enforcement, and usage metrics reporting for design system governance and optimization.

## LLM and MCP Integration

### Model Context Protocol (MCP) Server

The Spectrum design system provides an MCP server that gives LLMs comprehensive access to design data, component schemas, lifecycle information, and platform-specific guidance.

#### MCP Server Architecture

```typescript
// @adobe/spectrum-mcp-server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SpectrumDesignData } from "@adobe/spectrum-design-data";

class SpectrumMCPServer {
  private server: Server;
  private designData: SpectrumDesignData;

  constructor() {
    this.server = new Server(
      {
        name: "spectrum-design-system",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );

    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }

  private setupTools() {
    // Tool: Query design tokens
    this.server.setRequestHandler("tools/call", async (request) => {
      if (request.params.name === "query_tokens") {
        return this.queryTokens(request.params.arguments);
      }

      if (request.params.name === "validate_token_usage") {
        return this.validateTokenUsage(request.params.arguments);
      }

      if (request.params.name === "get_component_lifecycle") {
        return this.getComponentLifecycle(request.params.arguments);
      }

      if (request.params.name === "suggest_semantic_alternatives") {
        return this.suggestSemanticAlternatives(request.params.arguments);
      }

      if (request.params.name === "generate_migration_code") {
        return this.generateMigrationCode(request.params.arguments);
      }
    });
  }

  private setupResources() {
    // Resource: Complete design system documentation
    this.server.setRequestHandler("resources/read", async (request) => {
      const uri = request.params.uri;

      if (uri.startsWith("spectrum://components/")) {
        const componentName = uri.split("/").pop();
        return this.getComponentDocumentation(componentName);
      }

      if (uri.startsWith("spectrum://tokens/")) {
        const tokenPath = uri.replace("spectrum://tokens/", "");
        return this.getTokenDocumentation(tokenPath);
      }

      if (uri.startsWith("spectrum://lifecycle/")) {
        const componentName = uri.split("/").pop();
        return this.getLifecycleDocumentation(componentName);
      }

      if (uri.startsWith("spectrum://platform/")) {
        const [, , platform, component] = uri.split("/");
        return this.getPlatformSpecificDocumentation(platform, component);
      }
    });
  }

  private setupPrompts() {
    // Prompt: Generate component usage examples
    this.server.setRequestHandler("prompts/get", async (request) => {
      if (request.params.name === "component_usage_examples") {
        return {
          description: "Generate platform-specific component usage examples",
          arguments: [
            {
              name: "component",
              description: "Component name (e.g., Button, Menu)",
              required: true,
            },
            {
              name: "platform",
              description: "Target platform (ios, react, android, css)",
              required: true,
            },
            {
              name: "use_case",
              description: "Specific use case or context",
              required: false,
            },
          ],
        };
      }

      if (request.params.name === "migration_guidance") {
        return {
          description:
            "Generate migration guidance for deprecated components/tokens",
          arguments: [
            {
              name: "deprecated_item",
              description: "Deprecated component or token name",
              required: true,
            },
            {
              name: "platform",
              description: "Target platform for migration",
              required: true,
            },
            {
              name: "codebase_context",
              description: "Current code context or usage pattern",
              required: false,
            },
          ],
        };
      }
    });
  }

  private async queryTokens(args: any) {
    const { query, platform, context } = args;

    // Semantic search through design tokens
    const tokens = await this.designData.searchTokens({
      query: query,
      platform: platform,
      includeDeprecated: false,
      includeLifecycleInfo: true,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tokens: tokens.map((token) => ({
                name: token.generateSemanticName(),
                value: token.resolveValue(context),
                description: token.context.property.semantic_meaning,
                lifecycle: token.lifecycle,
                platformSpecific: token.getPlatformSpecificInfo(platform),
                usage: token.generateUsageExample(platform),
              })),
              suggestions: this.generateTokenSuggestions(query, tokens),
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private async validateTokenUsage(args: any) {
    const { code, platform, file_path } = args;

    // Parse code and validate token usage
    const analysis = await this.designData.analyzeTokenUsage({
      code: code,
      platform: platform,
      filePath: file_path,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              issues: analysis.issues.map((issue) => ({
                type: issue.type,
                severity: issue.severity,
                message: issue.message,
                suggestion: issue.suggestion,
                autoFixAvailable: issue.autoFixAvailable,
                line: issue.location.line,
                column: issue.location.column,
              })),
              semanticAlternatives: analysis.semanticAlternatives,
              deprecationWarnings: analysis.deprecationWarnings,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private async getComponentLifecycle(args: any) {
    const { component, platform } = args;

    const lifecycle = await this.designData.getComponentLifecycle(
      component,
      platform,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              component: component,
              platform: platform,
              lifecycle: lifecycle,
              migrationGuidance: lifecycle.deprecated
                ? {
                    reason: lifecycle.deprecated.reason,
                    replacement: lifecycle.deprecated.replacement,
                    migrationGuide: lifecycle.deprecated.migrationGuide,
                    timeline: lifecycle.deprecated.timeline,
                    automatedMigration: lifecycle.deprecated.automatedMigration,
                  }
                : null,
              platformSpecificNotes: lifecycle.platformSpecificNotes,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private async suggestSemanticAlternatives(args: any) {
    const { token_usage, platform, context } = args;

    // Analyze token usage and suggest more semantic alternatives
    const alternatives = await this.designData.suggestSemanticAlternatives({
      currentUsage: token_usage,
      platform: platform,
      context: context,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              currentUsage: token_usage,
              issues: alternatives.issues,
              suggestions: alternatives.suggestions.map((suggestion) => ({
                alternative: suggestion.token,
                reason: suggestion.reason,
                semanticLevel: suggestion.semanticLevel,
                migrationComplexity: suggestion.migrationComplexity,
                codeExample: suggestion.generateCodeExample(platform),
              })),
              bestPractices: alternatives.bestPractices,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
```

### IDE Integration

#### VS Code Extension

```typescript
// @adobe/spectrum-vscode-extension
import * as vscode from "vscode";
import { SpectrumMCPClient } from "@adobe/spectrum-mcp-client";

export class SpectrumExtension {
  private mcpClient: SpectrumMCPClient;

  constructor(context: vscode.ExtensionContext) {
    this.mcpClient = new SpectrumMCPClient();
    this.registerCommands(context);
    this.registerProviders(context);
  }

  private registerCommands(context: vscode.ExtensionContext) {
    // Command: Validate Spectrum token usage
    const validateCommand = vscode.commands.registerCommand(
      "spectrum.validateTokens",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const platform = this.detectPlatform(document);

        const validation = await this.mcpClient.validateTokenUsage({
          code: document.getText(),
          platform: platform,
          file_path: document.fileName,
        });

        this.showValidationResults(validation);
      },
    );

    // Command: Suggest semantic alternatives
    const suggestCommand = vscode.commands.registerCommand(
      "spectrum.suggestAlternatives",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        const platform = this.detectPlatform(editor.document);

        const suggestions = await this.mcpClient.suggestSemanticAlternatives({
          token_usage: selectedText,
          platform: platform,
          context: this.getCodeContext(editor, selection),
        });

        this.showSuggestions(suggestions);
      },
    );

    context.subscriptions.push(validateCommand, suggestCommand);
  }

  private registerProviders(context: vscode.ExtensionContext) {
    // Hover provider for token information
    const hoverProvider = vscode.languages.registerHoverProvider(
      ["typescript", "javascript", "css", "scss", "swift", "kotlin"],
      {
        async provideHover(document, position, token) {
          const range = document.getWordRangeAtPosition(position);
          const word = document.getText(range);

          if (this.isSpectrumToken(word)) {
            const tokenInfo = await this.mcpClient.queryTokens({
              query: word,
              platform: this.detectPlatform(document),
            });

            return new vscode.Hover(this.formatTokenHover(tokenInfo));
          }
        },
      },
    );

    // Completion provider for token suggestions
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      ["typescript", "javascript", "css", "scss", "swift", "kotlin"],
      {
        async provideCompletionItems(document, position, token, context) {
          const lineText = document.lineAt(position).text;
          const platform = this.detectPlatform(document);

          if (this.shouldProvideTokenCompletions(lineText, position)) {
            const tokens = await this.mcpClient.queryTokens({
              query: this.extractPartialToken(lineText, position),
              platform: platform,
            });

            return tokens.map((token) =>
              this.createCompletionItem(token, platform),
            );
          }
        },
      },
      "-",
      "_", // Trigger characters
    );

    context.subscriptions.push(hoverProvider, completionProvider);
  }

  private createCompletionItem(
    token: any,
    platform: string,
  ): vscode.CompletionItem {
    const item = new vscode.CompletionItem(
      token.name,
      vscode.CompletionItemKind.Constant,
    );

    item.detail = `${token.description} (${token.value})`;
    item.documentation = new vscode.MarkdownString(`
**Spectrum Token**: \`${token.name}\`

**Value**: \`${token.value}\`

**Description**: ${token.description}

**Platform Usage**:
\`\`\`${this.getPlatformLanguage(platform)}
${token.usage}
\`\`\`

${
  token.lifecycle.deprecated
    ? `
⚠️ **Deprecated** since ${token.lifecycle.deprecated.version}
${token.lifecycle.deprecated.reason}

**Use instead**: \`${token.lifecycle.deprecated.replacement}\`
`
    : ""
}
    `);

    item.insertText = token.usage;

    return item;
  }
}
```

#### Cursor Integration

```typescript
// Cursor Rules integration
export const cursorRules = `
# Spectrum Design System Integration

## Token Usage Guidelines

### Preferred Semantic Tokens
- Use semantic tokens like \`accent-background-color-default\` instead of primitive tokens like \`blue-900\`
- Use component-specific tokens like \`button-background-color-accent\` when available
- Avoid direct color/spacing values, always use design tokens

### Platform-Specific Patterns

#### React/TypeScript
\`\`\`typescript
// ✅ Good - Semantic token usage
const buttonStyles = {
  backgroundColor: useSpectrumToken('button-background-color-accent'),
  padding: useSpectrumToken('button-padding-medium'),
  borderRadius: useSpectrumToken('button-border-radius'),
};

// ❌ Bad - Direct primitive token usage  
const buttonStyles = {
  backgroundColor: 'var(--spectrum-blue-900)',
  padding: '12px',
  borderRadius: '4px',
};
\`\`\`

#### iOS/Swift
\`\`\`swift
// ✅ Good - Semantic token usage
button.backgroundColor = SpectrumColor.buttonBackgroundAccent
button.layer.cornerRadius = SpectrumDimension.buttonBorderRadius

// ❌ Bad - Direct values
button.backgroundColor = UIColor.systemBlue
button.layer.cornerRadius = 8.0
\`\`\`

### Lifecycle Awareness
- Check component/token lifecycle before usage
- Use lifecycle hooks for deprecation warnings
- Follow migration guides for deprecated tokens

### MCP Integration
This project has Spectrum MCP server integration. Use these tools:
- \`query_tokens\`: Find appropriate design tokens
- \`validate_token_usage\`: Check current token usage
- \`suggest_semantic_alternatives\`: Get better token suggestions
- \`get_component_lifecycle\`: Check deprecation status
`;
```

## Intelligent Linting System

### Spectrum ESLint Plugin

```typescript
// @adobe/eslint-plugin-spectrum
import { ESLintUtils } from "@typescript-eslint/utils";
import { SpectrumDesignData } from "@adobe/spectrum-design-data";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://spectrum.adobe.com/eslint-rules/${name}`,
);

export const rules = {
  // Rule: Enforce semantic token usage
  "use-semantic-tokens": createRule({
    name: "use-semantic-tokens",
    meta: {
      type: "suggestion",
      docs: {
        description: "Enforce usage of semantic tokens over primitive tokens",
        recommended: "error",
      },
      fixable: "code",
      schema: [
        {
          type: "object",
          properties: {
            platform: {
              type: "string",
              enum: ["react", "css", "ios", "android"],
            },
            strictness: {
              type: "string",
              enum: ["strict", "moderate", "lenient"],
            },
          },
          additionalProperties: false,
        },
      ],
      messages: {
        primitiveTokenUsage:
          'Use semantic token "{{semantic}}" instead of primitive token "{{primitive}}"',
        directValueUsage:
          'Use design token instead of direct value "{{value}}"',
        deprecatedToken:
          'Token "{{token}}" is deprecated since {{version}}. Use "{{replacement}}" instead.',
      },
    },
    defaultOptions: [{ platform: "react", strictness: "moderate" }],
    create(context, [options]) {
      const designData = new SpectrumDesignData();
      const platform = options.platform;

      return {
        // Check CSS custom property usage
        Literal(node) {
          if (
            typeof node.value === "string" &&
            node.value.startsWith("var(--spectrum-")
          ) {
            const tokenName = node.value.match(
              /var\(--spectrum-([^)]+)\)/,
            )?.[1];
            if (tokenName) {
              this.checkTokenUsage(node, tokenName, platform, context);
            }
          }
        },

        // Check direct color/spacing values
        Property(node) {
          if (this.isStyleProperty(node) && this.isDirectValue(node.value)) {
            const semanticAlternatives = designData.findSemanticAlternatives(
              node.key.name,
              node.value.value,
              platform,
            );

            if (semanticAlternatives.length > 0) {
              context.report({
                node: node.value,
                messageId: "directValueUsage",
                data: { value: node.value.value },
                fix(fixer) {
                  const bestAlternative = semanticAlternatives[0];
                  return fixer.replaceText(
                    node.value,
                    this.generateTokenUsage(bestAlternative, platform),
                  );
                },
              });
            }
          }
        },

        // Check React hook usage
        CallExpression(node) {
          if (this.isSpectrumHookCall(node)) {
            const tokenName = node.arguments[0]?.value;
            if (tokenName) {
              this.checkTokenUsage(node, tokenName, platform, context);
            }
          }
        },
      };
    },

    checkTokenUsage(node, tokenName, platform, context) {
      const tokenInfo = designData.getTokenInfo(tokenName);

      // Check if token is deprecated
      if (tokenInfo.lifecycle.deprecated) {
        context.report({
          node,
          messageId: "deprecatedToken",
          data: {
            token: tokenName,
            version: tokenInfo.lifecycle.deprecated.version,
            replacement: tokenInfo.lifecycle.deprecated.replacement,
          },
          fix(fixer) {
            if (tokenInfo.lifecycle.deprecated.automatedMigration) {
              return fixer.replaceText(
                node,
                this.generateMigrationCode(tokenInfo, platform),
              );
            }
          },
        });
      }

      // Check if more semantic alternative exists
      const semanticLevel = designData.getSemanticLevel(tokenName);
      if (semanticLevel < 2) {
        // Not semantic enough
        const alternatives = designData.findMoreSemanticAlternatives(
          tokenName,
          platform,
        );
        if (alternatives.length > 0) {
          context.report({
            node,
            messageId: "primitiveTokenUsage",
            data: {
              primitive: tokenName,
              semantic: alternatives[0].name,
            },
            fix(fixer) {
              return fixer.replaceText(
                node,
                this.generateTokenUsage(alternatives[0], platform),
              );
            },
          });
        }
      }
    },
  }),

  // Rule: Enforce component lifecycle awareness
  "check-component-lifecycle": createRule({
    name: "check-component-lifecycle",
    meta: {
      type: "problem",
      docs: {
        description: "Warn about usage of deprecated components",
        recommended: "warn",
      },
      schema: [],
      messages: {
        deprecatedComponent:
          'Component "{{component}}" is deprecated since {{version}}. {{reason}}',
        removedComponent:
          'Component "{{component}}" was removed in {{version}}. Use "{{replacement}}" instead.',
      },
    },
    defaultOptions: [],
    create(context) {
      return {
        ImportDeclaration(node) {
          if (this.isSpectrumImport(node)) {
            node.specifiers.forEach((specifier) => {
              const componentName = specifier.imported.name;
              const lifecycle = designData.getComponentLifecycle(componentName);

              if (lifecycle.deprecated) {
                context.report({
                  node: specifier,
                  messageId: "deprecatedComponent",
                  data: {
                    component: componentName,
                    version: lifecycle.deprecated.version,
                    reason: lifecycle.deprecated.reason,
                  },
                });
              }

              if (lifecycle.removed) {
                context.report({
                  node: specifier,
                  messageId: "removedComponent",
                  data: {
                    component: componentName,
                    version: lifecycle.removed.version,
                    replacement: lifecycle.removed.replacement,
                  },
                });
              }
            });
          }
        },
      };
    },
  }),
};
```

### Platform-Specific Linters

#### Swift Linter (SwiftLint Plugin)

```swift
// SpectrumSwiftLint/Rules/SemanticTokenUsageRule.swift
import SwiftLintCore
import SwiftSyntax

public struct SemanticTokenUsageRule: ConfigurationProviderRule, SwiftSyntaxRule {
    public var configuration = SeverityConfiguration(.warning)

    public static let description = RuleDescription(
        identifier: "spectrum_semantic_tokens",
        name: "Spectrum Semantic Token Usage",
        description: "Enforce usage of semantic Spectrum tokens over primitive values",
        kind: .style,
        nonTriggeringExamples: [
            Example("button.backgroundColor = SpectrumColor.buttonBackgroundAccent"),
            Example("view.layer.cornerRadius = SpectrumDimension.buttonBorderRadius"),
        ],
        triggeringExamples: [
            Example("button.backgroundColor = ↓UIColor.systemBlue"),
            Example("view.layer.cornerRadius = ↓8.0"),
        ]
    )

    public func makeVisitor(file: SwiftLintFile) -> ViolationsSyntaxVisitor {
        SemanticTokenUsageVisitor(viewMode: .sourceAccurate)
    }
}

private final class SemanticTokenUsageVisitor: ViolationsSyntaxVisitor {
    private let spectrumData = SpectrumDesignData()

    override func visitPost(_ node: MemberAccessExprSyntax) -> SyntaxVisitorContinueKind {
        // Check for direct UIColor usage
        if let baseExpr = node.base?.as(DeclReferenceExprSyntax.self),
           baseExpr.baseName.text == "UIColor" {

            let colorName = node.declName.baseName.text
            if let semanticAlternative = spectrumData.findSemanticColorAlternative(colorName) {
                violations.append(
                    ReasonedRuleViolation(
                        position: node.positionAfterSkippingLeadingTrivia,
                        reason: "Use semantic token 'SpectrumColor.\(semanticAlternative)' instead of 'UIColor.\(colorName)'",
                        severity: configuration.severity
                    )
                )
            }
        }

        // Check for deprecated Spectrum tokens
        if let baseExpr = node.base?.as(DeclReferenceExprSyntax.self),
           baseExpr.baseName.text == "SpectrumColor" || baseExpr.baseName.text == "SpectrumDimension" {

            let tokenName = node.declName.baseName.text
            if let lifecycle = spectrumData.getTokenLifecycle(tokenName),
               let deprecated = lifecycle.deprecated {
                violations.append(
                    ReasonedRuleViolation(
                        position: node.positionAfterSkippingLeadingTrivia,
                        reason: "Token '\(tokenName)' deprecated since \(deprecated.version): \(deprecated.reason). Use '\(deprecated.replacement ?? "alternative")' instead.",
                        severity: .error
                    )
                )
            }
        }

        return .visitChildren
    }

    override func visitPost(_ node: FloatLiteralExprSyntax) -> SyntaxVisitorContinueKind {
        // Check for direct numeric values that should use tokens
        if let parent = node.parent?.as(AssignmentExprSyntax.self),
           let target = parent.target.as(MemberAccessExprSyntax.self) {

            let propertyName = target.declName.baseName.text
            let value = node.literal.text

            if let semanticToken = spectrumData.findDimensionTokenForValue(propertyName, value) {
                violations.append(
                    ReasonedRuleViolation(
                        position: node.positionAfterSkippingLeadingTrivia,
                        reason: "Use semantic token 'SpectrumDimension.\(semanticToken)' instead of direct value '\(value)'",
                        severity: configuration.severity
                    )
                )
            }
        }

        return .visitChildren
    }
}
```

#### Android Lint Rules

```kotlin
// spectrum-android-lint/src/main/kotlin/SemanticTokenUsageDetector.kt
package com.adobe.spectrum.lint

import com.android.tools.lint.detector.api.*
import com.intellij.psi.PsiMethod
import org.jetbrains.uast.*

class SemanticTokenUsageDetector : Detector(), Detector.UastScanner {

    companion object {
        val ISSUE = Issue.create(
            id = "SpectrumSemanticTokens",
            briefDescription = "Use semantic Spectrum tokens",
            explanation = "Use semantic Spectrum tokens instead of primitive values or Android system resources",
            category = Category.CORRECTNESS,
            priority = 6,
            severity = Severity.WARNING,
            implementation = Implementation(
                SemanticTokenUsageDetector::class.java,
                Scope.JAVA_FILE_SCOPE
            )
        )
    }

    private val spectrumData = SpectrumDesignData()

    override fun getApplicableMethodNames(): List<String> {
        return listOf(
            "setBackgroundColor",
            "setTextColor",
            "setPadding",
            "setMargin",
            "getColor",
            "getDimension"
        )
    }

    override fun visitMethodCall(context: JavaContext, node: UCallExpression, method: PsiMethod) {
        val methodName = method.name
        val arguments = node.valueArguments

        when (methodName) {
            "setBackgroundColor", "setTextColor" -> {
                checkColorUsage(context, node, arguments)
            }
            "setPadding", "setMargin" -> {
                checkDimensionUsage(context, node, arguments)
            }
            "getColor" -> {
                checkResourceUsage(context, node, arguments, "color")
            }
            "getDimension" -> {
                checkResourceUsage(context, node, arguments, "dimension")
            }
        }
    }

    private fun checkColorUsage(context: JavaContext, node: UCallExpression, arguments: List<UExpression>) {
        arguments.forEach { arg ->
            when {
                // Check for direct Color.* usage
                arg.asSourceString().startsWith("Color.") -> {
                    val colorName = arg.asSourceString().substringAfter("Color.")
                    val semanticAlternative = spectrumData.findSemanticColorAlternative(colorName)

                    if (semanticAlternative != null) {
                        context.report(
                            ISSUE,
                            arg,
                            context.getLocation(arg),
                            "Use semantic token `SpectrumColor.$semanticAlternative` instead of `Color.$colorName`",
                            createColorFix(semanticAlternative)
                        )
                    }
                }

                // Check for deprecated Spectrum tokens
                arg.asSourceString().startsWith("SpectrumColor.") -> {
                    val tokenName = arg.asSourceString().substringAfter("SpectrumColor.")
                    val lifecycle = spectrumData.getTokenLifecycle(tokenName)

                    if (lifecycle?.deprecated != null) {
                        context.report(
                            ISSUE,
                            arg,
                            context.getLocation(arg),
                            "Token `$tokenName` deprecated since ${lifecycle.deprecated.version}: ${lifecycle.deprecated.reason}. Use `${lifecycle.deprecated.replacement}` instead.",
                            createDeprecationFix(lifecycle.deprecated.replacement)
                        )
                    }
                }
            }
        }
    }

    private fun checkResourceUsage(context: JavaContext, node: UCallExpression, arguments: List<UExpression>, type: String) {
        arguments.forEach { arg ->
            if (arg.asSourceString().startsWith("R.$type.")) {
                val resourceName = arg.asSourceString().substringAfter("R.$type.")

                // Check if this is a system resource that should use Spectrum token
                if (isSystemResource(resourceName)) {
                    val semanticAlternative = spectrumData.findSemanticAlternativeForResource(resourceName, type)

                    if (semanticAlternative != null) {
                        context.report(
                            ISSUE,
                            arg,
                            context.getLocation(arg),
                            "Use semantic Spectrum token instead of system resource `R.$type.$resourceName`",
                            createResourceFix(semanticAlternative, type)
                        )
                    }
                }
            }
        }
    }

    private fun createColorFix(semanticToken: String): LintFix {
        return fix()
            .name("Use semantic Spectrum token")
            .replace()
            .text("Color.*")
            .with("SpectrumColor.$semanticToken")
            .build()
    }
}
```

### CLI Linter Tool

```typescript
// @adobe/spectrum-lint CLI tool
#!/usr/bin/env node

import { Command } from 'commander';
import { SpectrumLinter } from './linter';
import { SpectrumAutoFixer } from './auto-fixer';

const program = new Command();

program
  .name('spectrum-lint')
  .description('Lint codebase for Spectrum design system compliance')
  .version('1.0.0');

program
  .command('check')
  .description('Check codebase for Spectrum compliance issues')
  .option('-p, --platform <platform>', 'Target platform (react, ios, android, css)')
  .option('-f, --format <format>', 'Output format (json, table, github)', 'table')
  .option('--strict', 'Enable strict semantic token enforcement')
  .option('--include-deprecated', 'Include deprecated token usage warnings')
  .argument('<paths...>', 'Paths to check')
  .action(async (paths, options) => {
    const linter = new SpectrumLinter({
      platform: options.platform,
      strict: options.strict,
      includeDeprecated: options.includeDeprecated,
    });

    const results = await linter.lintPaths(paths);

    switch (options.format) {
      case 'json':
        console.log(JSON.stringify(results, null, 2));
        break;
      case 'github':
        outputGitHubAnnotations(results);
        break;
      default:
        outputTable(results);
    }

    process.exit(results.errorCount > 0 ? 1 : 0);
  });

program
  .command('fix')
  .description('Automatically fix Spectrum compliance issues')
  .option('-p, --platform <platform>', 'Target platform (react, ios, android, css)')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .option('--interactive', 'Prompt for each fix')
  .argument('<paths...>', 'Paths to fix')
  .action(async (paths, options) => {
    const autoFixer = new SpectrumAutoFixer({
      platform: options.platform,
      dryRun: options.dryRun,
      interactive: options.interactive,
    });

    const results = await autoFixer.fixPaths(paths);

    console.log(`Fixed ${results.fixedCount} issues in ${results.filesChanged} files`);

    if (results.unfixableIssues.length > 0) {
      console.log('\nUnfixable issues:');
      results.unfixableIssues.forEach(issue => {
        console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      });
    }
  });

program
  .command('migrate')
  .description('Migrate from deprecated tokens/components')
  .option('-p, --platform <platform>', 'Target platform (react, ios, android, css)')
  .option('--from-version <version>', 'Migrate from specific version')
  .option('--to-version <version>', 'Migrate to specific version')
  .argument('<paths...>', 'Paths to migrate')
  .action(async (paths, options) => {
    const migrator = new SpectrumMigrator({
      platform: options.platform,
      fromVersion: options.fromVersion,
      toVersion: options.toVersion,
    });

    const results = await migrator.migratePaths(paths);

    console.log(`Migration complete: ${results.migratedFiles} files updated`);

    if (results.manualMigrationRequired.length > 0) {
      console.log('\nManual migration required:');
      results.manualMigrationRequired.forEach(item => {
        console.log(`  ${item.file}:${item.line} - ${item.reason}`);
        console.log(`    ${item.migrationGuide}`);
      });
    }
  });

function outputTable(results: LintResults) {
  console.table(results.issues.map(issue => ({
    File: issue.file,
    Line: issue.line,
    Severity: issue.severity,
    Rule: issue.rule,
    Message: issue.message,
    Fixable: issue.fixable ? '✓' : '✗',
  })));

  console.log(`\n${results.errorCount} errors, ${results.warningCount} warnings`);
}

function outputGitHubAnnotations(results: LintResults) {
  results.issues.forEach(issue => {
    const level = issue.severity === 'error' ? 'error' : 'warning';
    console.log(`::${level} file=${issue.file},line=${issue.line}::${issue.message}`);
  });
}
```

## Usage Metrics Reporting

### SDK Metrics Collection

```typescript
// @adobe/spectrum-metrics-collector
export class SpectrumMetricsCollector {
  private designData: SpectrumDesignData;
  private platform: Platform;
  private projectInfo: ProjectInfo;

  constructor(config: MetricsConfig) {
    this.designData = new SpectrumDesignData();
    this.platform = config.platform;
    this.projectInfo = config.projectInfo;
  }

  // Analyze codebase and collect usage metrics
  async collectMetrics(paths: string[]): Promise<UsageMetrics> {
    const metrics: UsageMetrics = {
      project: this.projectInfo,
      platform: this.platform,
      collectionDate: new Date().toISOString(),
      designSystemVersion: this.designData.version,

      tokenUsage: {
        totalTokensUsed: 0,
        tokensByType: {},
        tokensBySemanticLevel: {},
        deprecatedTokensUsed: [],
        primitiveTokensUsed: [],
      },

      componentUsage: {
        totalComponentsUsed: 0,
        componentsByCategory: {},
        deprecatedComponentsUsed: [],
        customComponentsDetected: [],
      },

      complianceMetrics: {
        semanticTokenUsageRate: 0,
        deprecationComplianceRate: 0,
        designSystemCoverageRate: 0,
      },

      codebaseAnalysis: {
        filesAnalyzed: 0,
        linesOfCode: 0,
        designSystemDensity: 0,
      },
    };

    for (const path of paths) {
      await this.analyzePath(path, metrics);
    }

    this.calculateDerivedMetrics(metrics);

    return metrics;
  }

  private async analyzePath(
    path: string,
    metrics: UsageMetrics,
  ): Promise<void> {
    const files = await this.getFilesForAnalysis(path);

    for (const file of files) {
      const analysis = await this.analyzeFile(file);

      metrics.codebaseAnalysis.filesAnalyzed++;
      metrics.codebaseAnalysis.linesOfCode += analysis.linesOfCode;

      // Collect token usage
      analysis.tokenUsage.forEach((usage) => {
        metrics.tokenUsage.totalTokensUsed++;

        const tokenInfo = this.designData.getTokenInfo(usage.tokenName);

        // Categorize by type
        const tokenType = tokenInfo.context.property.property_type;
        metrics.tokenUsage.tokensByType[tokenType] =
          (metrics.tokenUsage.tokensByType[tokenType] || 0) + 1;

        // Categorize by semantic level
        const semanticLevel = this.getSemanticLevel(tokenInfo);
        metrics.tokenUsage.tokensBySemanticLevel[semanticLevel] =
          (metrics.tokenUsage.tokensBySemanticLevel[semanticLevel] || 0) + 1;

        // Track deprecated usage
        if (tokenInfo.lifecycle.deprecated) {
          metrics.tokenUsage.deprecatedTokensUsed.push({
            token: usage.tokenName,
            file: file.path,
            line: usage.line,
            deprecatedSince: tokenInfo.lifecycle.deprecated.version,
            replacement: tokenInfo.lifecycle.deprecated.replacement,
          });
        }

        // Track primitive token usage
        if (semanticLevel === "primitive") {
          metrics.tokenUsage.primitiveTokensUsed.push({
            token: usage.tokenName,
            file: file.path,
            line: usage.line,
            semanticAlternatives: this.designData.findSemanticAlternatives(
              usage.tokenName,
            ),
          });
        }
      });

      // Collect component usage
      analysis.componentUsage.forEach((usage) => {
        metrics.componentUsage.totalComponentsUsed++;

        const componentInfo = this.designData.getComponentInfo(
          usage.componentName,
        );

        if (componentInfo) {
          // Categorize by component category
          const category = componentInfo.meta.category;
          metrics.componentUsage.componentsByCategory[category] =
            (metrics.componentUsage.componentsByCategory[category] || 0) + 1;

          // Track deprecated component usage
          if (componentInfo.lifecycle.deprecated) {
            metrics.componentUsage.deprecatedComponentsUsed.push({
              component: usage.componentName,
              file: file.path,
              line: usage.line,
              deprecatedSince: componentInfo.lifecycle.deprecated.version,
              replacement: componentInfo.lifecycle.deprecated.replacement,
            });
          }
        } else {
          // Track custom/non-Spectrum components
          metrics.componentUsage.customComponentsDetected.push({
            component: usage.componentName,
            file: file.path,
            line: usage.line,
            isLikelyCustom: this.isLikelyCustomComponent(usage.componentName),
          });
        }
      });
    }
  }

  private calculateDerivedMetrics(metrics: UsageMetrics): void {
    // Calculate semantic token usage rate
    const semanticTokens =
      (metrics.tokenUsage.tokensBySemanticLevel["semantic"] || 0) +
      (metrics.tokenUsage.tokensBySemanticLevel["component-specific"] || 0);
    metrics.complianceMetrics.semanticTokenUsageRate =
      semanticTokens / metrics.tokenUsage.totalTokensUsed;

    // Calculate deprecation compliance rate
    const nonDeprecatedUsage =
      metrics.tokenUsage.totalTokensUsed -
      metrics.tokenUsage.deprecatedTokensUsed.length;
    metrics.complianceMetrics.deprecationComplianceRate =
      nonDeprecatedUsage / metrics.tokenUsage.totalTokensUsed;

    // Calculate design system coverage rate
    const designSystemUsage =
      metrics.tokenUsage.totalTokensUsed +
      metrics.componentUsage.totalComponentsUsed;
    metrics.codebaseAnalysis.designSystemDensity =
      designSystemUsage / metrics.codebaseAnalysis.linesOfCode;
  }

  // Generate comprehensive report
  generateReport(
    metrics: UsageMetrics,
    format: "json" | "html" | "markdown" = "json",
  ): string {
    switch (format) {
      case "html":
        return this.generateHTMLReport(metrics);
      case "markdown":
        return this.generateMarkdownReport(metrics);
      default:
        return JSON.stringify(metrics, null, 2);
    }
  }

  private generateMarkdownReport(metrics: UsageMetrics): string {
    return `
# Spectrum Design System Usage Report

**Project**: ${metrics.project.name}  
**Platform**: ${metrics.platform}  
**Generated**: ${metrics.collectionDate}  
**Design System Version**: ${metrics.designSystemVersion}

## Overview

- **Files Analyzed**: ${metrics.codebaseAnalysis.filesAnalyzed.toLocaleString()}
- **Lines of Code**: ${metrics.codebaseAnalysis.linesOfCode.toLocaleString()}
- **Design System Density**: ${(metrics.codebaseAnalysis.designSystemDensity * 1000).toFixed(2)} uses per 1K LOC

## Token Usage

### Summary
- **Total Tokens Used**: ${metrics.tokenUsage.totalTokensUsed.toLocaleString()}
- **Semantic Token Usage Rate**: ${(metrics.complianceMetrics.semanticTokenUsageRate * 100).toFixed(1)}%
- **Deprecation Compliance Rate**: ${(metrics.complianceMetrics.deprecationComplianceRate * 100).toFixed(1)}%

### Token Usage by Type
${Object.entries(metrics.tokenUsage.tokensByType)
  .map(([type, count]) => `- **${type}**: ${count} uses`)
  .join("\n")}

### Semantic Level Distribution
${Object.entries(metrics.tokenUsage.tokensBySemanticLevel)
  .map(
    ([level, count]) =>
      `- **${level}**: ${count} uses (${((count / metrics.tokenUsage.totalTokensUsed) * 100).toFixed(1)}%)`,
  )
  .join("\n")}

## Component Usage

### Summary
- **Total Components Used**: ${metrics.componentUsage.totalComponentsUsed.toLocaleString()}
- **Custom Components Detected**: ${metrics.componentUsage.customComponentsDetected.length}

### Component Usage by Category
${Object.entries(metrics.componentUsage.componentsByCategory)
  .map(([category, count]) => `- **${category}**: ${count} uses`)
  .join("\n")}

## Compliance Issues

### Deprecated Token Usage (${metrics.tokenUsage.deprecatedTokensUsed.length} issues)
${metrics.tokenUsage.deprecatedTokensUsed
  .slice(0, 10)
  .map(
    (issue) =>
      `- \`${issue.token}\` in ${issue.file}:${issue.line} (deprecated since ${issue.deprecatedSince})`,
  )
  .join("\n")}
${metrics.tokenUsage.deprecatedTokensUsed.length > 10 ? `\n... and ${metrics.tokenUsage.deprecatedTokensUsed.length - 10} more` : ""}

### Primitive Token Usage (${metrics.tokenUsage.primitiveTokensUsed.length} issues)
${metrics.tokenUsage.primitiveTokensUsed
  .slice(0, 10)
  .map((issue) => `- \`${issue.token}\` in ${issue.file}:${issue.line}`)
  .join("\n")}
${metrics.tokenUsage.primitiveTokensUsed.length > 10 ? `\n... and ${metrics.tokenUsage.primitiveTokensUsed.length - 10} more` : ""}

## Recommendations

${this.generateRecommendations(metrics)}
    `;
  }

  private generateRecommendations(metrics: UsageMetrics): string {
    const recommendations = [];

    if (metrics.complianceMetrics.semanticTokenUsageRate < 0.8) {
      recommendations.push(
        "🎯 **Improve Semantic Token Usage**: Currently at " +
          (metrics.complianceMetrics.semanticTokenUsageRate * 100).toFixed(1) +
          "%. Target: high usage rate. Run `spectrum-lint fix` to automatically upgrade primitive tokens.",
      );
    }

    if (metrics.tokenUsage.deprecatedTokensUsed.length > 0) {
      recommendations.push(
        "⚠️ **Address Deprecated Tokens**: " +
          metrics.tokenUsage.deprecatedTokensUsed.length +
          " deprecated tokens found. Run `spectrum-lint migrate` to automatically update.",
      );
    }

    if (metrics.codebaseAnalysis.designSystemDensity < 0.01) {
      recommendations.push(
        "📈 **Increase Design System Adoption**: Low usage density detected. " +
          "Consider migrating more hardcoded values to design tokens.",
      );
    }

    if (metrics.componentUsage.customComponentsDetected.length > 0) {
      recommendations.push(
        "🧩 **Review Custom Components**: " +
          metrics.componentUsage.customComponentsDetected.length +
          " custom components detected. Consider if any can use Spectrum components instead.",
      );
    }

    return recommendations.join("\n\n");
  }
}
```

### CLI Metrics Tool

```bash
#!/usr/bin/env node
# spectrum-metrics CLI

spectrum-metrics collect \
  --platform react \
  --project-name "Adobe XD Web" \
  --project-version "1.2.3" \
  --output metrics-report.json \
  src/

spectrum-metrics report \
  --input metrics-report.json \
  --format html \
  --output metrics-report.html

spectrum-metrics compare \
  --baseline baseline-metrics.json \
  --current current-metrics.json \
  --output comparison-report.html

spectrum-metrics dashboard \
  --metrics-dir ./metrics/ \
  --port 3000 \
  --watch
```

### Integration Examples

#### CI/CD Integration

```yaml
# .github/workflows/spectrum-metrics.yml
name: Spectrum Design System Metrics

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install Spectrum CLI
        run: npm install -g @adobe/spectrum-cli

      - name: Collect Usage Metrics
        run: |
          spectrum-metrics collect \
            --platform react \
            --project-name "${{ github.repository }}" \
            --project-version "${{ github.sha }}" \
            --output current-metrics.json \
            src/

      - name: Download Baseline Metrics
        if: github.event_name == 'pull_request'
        run: |
          gh api repos/${{ github.repository }}/contents/metrics/baseline-metrics.json \
            --jq '.content' | base64 -d > baseline-metrics.json
        env:
          GH_TOKEN: ${{ github.token }}

      - name: Generate Comparison Report
        if: github.event_name == 'pull_request'
        run: |
          spectrum-metrics compare \
            --baseline baseline-metrics.json \
            --current current-metrics.json \
            --format markdown \
            --output metrics-comparison.md

      - name: Comment PR with Metrics
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('metrics-comparison.md', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });

      - name: Update Baseline Metrics
        if: github.ref == 'refs/heads/main'
        run: |
          cp current-metrics.json metrics/baseline-metrics.json
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add metrics/baseline-metrics.json
          git commit -m "Update baseline metrics" || exit 0
          git push
```

## Benefits

### For Developers

- ✅ **Intelligent Code Assistance**: LLM-powered suggestions for proper token usage
- ✅ **Automated Fixes**: `--fix` support for common compliance issues
- ✅ **Real-Time Validation**: IDE integration with immediate feedback
- ✅ **Migration Assistance**: Automated migration from deprecated tokens/components

### For Design System Team

- ✅ **Usage Visibility**: Comprehensive metrics on design system adoption
- ✅ **Compliance Monitoring**: Track semantic token usage and deprecation compliance
- ✅ **Impact Analysis**: Understand real-world usage before making changes
- ✅ **Quality Assurance**: Automated enforcement of design system best practices

### For Product Teams

- ✅ **Guided Adoption**: Clear guidance on proper design system usage
- ✅ **Automated Maintenance**: Reduce manual effort in staying compliant
- ✅ **Performance Insights**: Understand design system impact on codebase
- ✅ **Migration Planning**: Data-driven approach to design system updates

This comprehensive developer experience system ensures that the Spectrum design system is not just powerful and flexible, but also easy to adopt, maintain, and govern at Adobe's scale.
