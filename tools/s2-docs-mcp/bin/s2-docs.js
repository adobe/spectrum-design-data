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

const HELP = `Usage: s2-docs <command> [args]

Commands:
  list [--category <c>]      List components (optionally filter by category)
  get <name>                  Get docs for a specific component
  search <query> [--content]  Search by name; --content searches doc bodies
  use-case <phrase>           Find components matching a use case
  stats                       Show documentation coverage statistics

Categories: ${CATEGORIES.join(", ")}
`;

function emit(value) {
  console.log(JSON.stringify(value, null, 2));
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function takeFlag(args, ...names) {
  for (const name of names) {
    const i = args.indexOf(name);
    if (i !== -1) {
      args.splice(i, 1);
      return true;
    }
  }
  return false;
}

function takeOption(args, ...names) {
  for (const name of names) {
    const i = args.indexOf(name);
    if (i !== -1) {
      const value = args[i + 1];
      if (value === undefined) fail(`Missing value for ${name}`);
      args.splice(i, 2);
      return value;
    }
  }
  return undefined;
}

const argv = process.argv.slice(2);

if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
  process.stdout.write(HELP);
  process.exit(0);
}

const [command, ...rest] = argv;

switch (command) {
  case "list": {
    const category = takeOption(rest, "--category", "-c");
    if (category) {
      const components = getComponentsByCategory(category);
      emit({ category, count: components.length, components });
    } else {
      const components = getAllComponents();
      const byCategory = components.reduce((acc, comp) => {
        if (!acc[comp.category]) acc[comp.category] = [];
        acc[comp.category].push({ name: comp.name, slug: comp.slug });
        return acc;
      }, {});
      emit({ total: components.length, categories: byCategory });
    }
    break;
  }

  case "get": {
    const name = rest[0];
    if (!name) fail("Usage: s2-docs get <name>");
    const component = findComponentByName(name);
    if (!component) fail(`Component not found: ${name}`);
    const documentation = getComponentDoc(component.category, component.slug);
    emit({ component, documentation });
    break;
  }

  case "search": {
    const useContent = takeFlag(rest, "--content");
    const query = rest[0];
    if (!query) fail("Usage: s2-docs search <query> [--content]");
    if (useContent) {
      const results = searchInContent(query);
      emit({
        query,
        found: results.length,
        results: results.map((r) => ({
          component: r.component.name,
          category: r.component.category,
          slug: r.component.slug,
          matches: r.matches,
        })),
      });
    } else {
      const components = searchComponents(query);
      emit({
        query,
        found: components.length,
        components: components.map((c) => ({
          name: c.name,
          slug: c.slug,
          category: c.category,
          url: c.url,
        })),
      });
    }
    break;
  }

  case "use-case": {
    const phrase = rest[0];
    if (!phrase) fail('Usage: s2-docs use-case "<phrase>"');
    const lower = phrase.toLowerCase();
    const matched = Object.entries(USE_CASE_MAP).find(([key]) =>
      lower.includes(key),
    )?.[1];
    if (matched) {
      const components = getComponentsByCategory(matched);
      emit({
        useCase: phrase,
        suggestedCategory: matched,
        components: components.map((c) => ({ name: c.name, slug: c.slug })),
      });
    } else {
      const results = searchInContent(phrase);
      emit({
        useCase: phrase,
        found: results.length,
        components: results.slice(0, 5).map((r) => ({
          name: r.component.name,
          category: r.component.category,
          relevantContent: r.matches[0]?.line,
        })),
      });
    }
    break;
  }

  case "stats": {
    emit(getStats());
    break;
  }

  default:
    fail(`Unknown command: ${command}\n\n${HELP}`);
}
