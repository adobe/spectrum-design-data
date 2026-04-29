#!/usr/bin/env node
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

import { Command } from "commander";
import {
  getAllComponents,
  getComponentsByCategory,
  getComponentDoc,
  searchComponents,
  searchInContent,
  findComponentByName,
  getStats,
} from "../src/data/docs.js";

const CATEGORIES = [
  "actions",
  "containers",
  "feedback",
  "inputs",
  "navigation",
  "status",
];

const USE_CASE_MAP = {
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

const program = new Command();

program
  .name("s2-docs")
  .description("Query Spectrum 2 component documentation")
  .version("1.0.0");

program
  .command("list")
  .description("List available S2 components")
  .option(
    "-c, --category <category>",
    `Filter by category (${CATEGORIES.join(", ")})`,
  )
  .action((opts) => {
    if (opts.category) {
      const components = getComponentsByCategory(opts.category);
      console.log(
        JSON.stringify(
          { category: opts.category, count: components.length, components },
          null,
          2,
        ),
      );
    } else {
      const components = getAllComponents();
      const byCategory = components.reduce((acc, comp) => {
        if (!acc[comp.category]) acc[comp.category] = [];
        acc[comp.category].push({ name: comp.name, slug: comp.slug });
        return acc;
      }, {});
      console.log(
        JSON.stringify(
          { total: components.length, categories: byCategory },
          null,
          2,
        ),
      );
    }
  });

program
  .command("get <name>")
  .description("Get documentation for a specific component")
  .action((name) => {
    const component = findComponentByName(name);
    if (!component) {
      console.error(`Component not found: ${name}`);
      process.exit(1);
    }
    const documentation = getComponentDoc(component.category, component.slug);
    console.log(JSON.stringify({ component, documentation }, null, 2));
  });

program
  .command("search <query>")
  .description("Search components by name or content")
  .option("--content", "Search within component content (slower)")
  .action((query, opts) => {
    if (opts.content) {
      const results = searchInContent(query);
      console.log(
        JSON.stringify(
          {
            query,
            found: results.length,
            results: results.map((r) => ({
              component: r.component.name,
              category: r.component.category,
              slug: r.component.slug,
              matches: r.matches,
            })),
          },
          null,
          2,
        ),
      );
    } else {
      const components = searchComponents(query);
      console.log(
        JSON.stringify(
          {
            query,
            found: components.length,
            components: components.map((c) => ({
              name: c.name,
              slug: c.slug,
              category: c.category,
              url: c.url,
            })),
          },
          null,
          2,
        ),
      );
    }
  });

program
  .command("use-case <phrase>")
  .description("Find components matching a use case")
  .action((phrase) => {
    const lower = phrase.toLowerCase();
    const matched = Object.entries(USE_CASE_MAP).find(([key]) =>
      lower.includes(key),
    )?.[1];
    if (matched) {
      const components = getComponentsByCategory(matched);
      console.log(
        JSON.stringify(
          {
            useCase: phrase,
            suggestedCategory: matched,
            components: components.map((c) => ({ name: c.name, slug: c.slug })),
          },
          null,
          2,
        ),
      );
    } else {
      const results = searchInContent(phrase);
      console.log(
        JSON.stringify(
          {
            useCase: phrase,
            found: results.length,
            components: results.slice(0, 5).map((r) => ({
              name: r.component.name,
              category: r.component.category,
              relevantContent: r.matches[0]?.line,
            })),
          },
          null,
          2,
        ),
      );
    }
  });

program
  .command("stats")
  .description("Show documentation coverage statistics")
  .action(() => {
    console.log(JSON.stringify(getStats(), null, 2));
  });

program.parse();
