/**
 * S2 Documentation MCP Tools
 */

import {
  getAllComponents,
  getComponentsByCategory,
  getComponentDoc,
  searchComponents,
  searchInContent,
  findComponentByName,
  getStats,
} from "../data/docs.js";

export function createDocsTools() {
  return [
    {
      name: "list-s2-components",
      description: "List all available Spectrum 2 components",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Filter by category (actions, containers, feedback, inputs, navigation, status)",
            enum: [
              "actions",
              "containers",
              "feedback",
              "inputs",
              "navigation",
              "status",
            ],
          },
        },
      },
      handler: async (args) => {
        if (args.category) {
          const components = getComponentsByCategory(args.category);
          return {
            category: args.category,
            count: components.length,
            components: components.map((c) => ({
              name: c.name,
              slug: c.slug,
              url: c.url,
            })),
          };
        }

        const components = getAllComponents();
        const byCategory = components.reduce((acc, comp) => {
          if (!acc[comp.category]) acc[comp.category] = [];
          acc[comp.category].push({
            name: comp.name,
            slug: comp.slug,
          });
          return acc;
        }, {});

        return {
          total: components.length,
          categories: byCategory,
        };
      },
    },

    {
      name: "get-s2-component",
      description: "Get documentation for a specific Spectrum 2 component",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              'Component name (e.g., "Button", "Action Button") or slug (e.g., "button", "action-button")',
          },
          category: {
            type: "string",
            description: "Component category (optional, helps with lookup)",
          },
        },
        required: ["name"],
      },
      handler: async (args) => {
        const component = findComponentByName(args.name);

        if (!component) {
          throw new Error(`Component not found: ${args.name}`);
        }

        const content = getComponentDoc(component.category, component.slug);

        return {
          component: {
            name: component.name,
            slug: component.slug,
            category: component.category,
            url: component.url,
          },
          documentation: content,
        };
      },
    },

    {
      name: "search-s2-docs",
      description:
        "Search Spectrum 2 documentation by component name or content",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          searchContent: {
            type: "boolean",
            description:
              "Search within component content (slower but more thorough)",
            default: false,
          },
        },
        required: ["query"],
      },
      handler: async (args) => {
        if (args.searchContent) {
          const results = searchInContent(args.query);
          return {
            query: args.query,
            found: results.length,
            results: results.map((r) => ({
              component: r.component.name,
              category: r.component.category,
              slug: r.component.slug,
              matches: r.matches,
            })),
          };
        }

        const components = searchComponents(args.query);
        return {
          query: args.query,
          found: components.length,
          components: components.map((c) => ({
            name: c.name,
            slug: c.slug,
            category: c.category,
            url: c.url,
          })),
        };
      },
    },

    {
      name: "get-s2-stats",
      description: "Get statistics about scraped S2 documentation",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        return getStats();
      },
    },

    {
      name: "find-s2-component-by-use-case",
      description: "Find S2 components by use case or design pattern",
      inputSchema: {
        type: "object",
        properties: {
          useCase: {
            type: "string",
            description:
              'Use case or design pattern (e.g., "form input", "navigation", "feedback", "selection")',
          },
        },
        required: ["useCase"],
      },
      handler: async (args) => {
        // Map common use cases to categories
        const useCaseMap = {
          form: "inputs",
          input: "inputs",
          selection: "inputs",
          navigation: "navigation",
          nav: "navigation",
          action: "actions",
          button: "actions",
          click: "actions",
          feedback: "feedback",
          notification: "feedback",
          alert: "feedback",
          progress: "feedback",
          container: "containers",
          layout: "containers",
          overlay: "containers",
          status: "status",
          badge: "status",
          indicator: "status",
        };

        const lowerUseCase = args.useCase.toLowerCase();
        const matchedCategory = Object.entries(useCaseMap).find(([key]) =>
          lowerUseCase.includes(key),
        )?.[1];

        if (matchedCategory) {
          const components = getComponentsByCategory(matchedCategory);
          return {
            useCase: args.useCase,
            suggestedCategory: matchedCategory,
            components: components.map((c) => ({
              name: c.name,
              slug: c.slug,
              description: `Component in ${matchedCategory} category`,
            })),
          };
        }

        // Fall back to content search
        const results = searchInContent(args.useCase);
        return {
          useCase: args.useCase,
          found: results.length,
          components: results.slice(0, 5).map((r) => ({
            name: r.component.name,
            category: r.component.category,
            relevantContent: r.matches[0]?.line,
          })),
        };
      },
    },
  ];
}
