/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use it except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import {
  loadReactSpectrumMap,
  resolveTokenToReactSpectrum,
  reverseLookupReactSpectrum,
  listMappedTokenNames,
} from "../data/react-spectrum-map.js";

const SUPPORTED_PLATFORMS = ["react-spectrum"];

/**
 * Create implementation-mapping MCP tools (token → platform style macro).
 * @returns {Array<{ name: string, description: string, inputSchema: object, handler: Function }>}
 */
export function createImplementationMapTools() {
  return [
    {
      name: "resolve-implementation",
      description:
        "Resolve a Spectrum token name to the equivalent style macro property and value for a given platform (e.g. React Spectrum). Use when you need to know what to use in code for a given design token.",
      inputSchema: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            description: `Target platform. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
            enum: SUPPORTED_PLATFORMS,
          },
          tokenName: {
            type: "string",
            description:
              "Spectrum token name (e.g. accent-background-color-default, font-size-100)",
          },
        },
        required: ["platform", "tokenName"],
      },
      handler: async (args) => {
        const platform = args?.platform;
        const tokenName = args?.tokenName;
        if (!platform || !tokenName) {
          return {
            ok: false,
            error: "platform and tokenName are required",
          };
        }
        if (platform !== "react-spectrum") {
          return {
            ok: false,
            error: `Unsupported platform: ${platform}. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
          };
        }
        const styleMacro = resolveTokenToReactSpectrum(
          String(tokenName).trim(),
        );
        if (!styleMacro) {
          return {
            ok: false,
            platform: "react-spectrum",
            tokenName: String(tokenName).trim(),
            message:
              "No mapping found for this token. It may not be used in React Spectrum style macro or is not yet in the PoC map.",
          };
        }
        return {
          ok: true,
          platform: "react-spectrum",
          tokenName: String(tokenName).trim(),
          styleMacro: {
            property: styleMacro.property,
            value: styleMacro.value,
          },
          usage: `In React Spectrum style macro, set ${styleMacro.property}: '${styleMacro.value}'`,
        };
      },
    },
    {
      name: "reverse-lookup-implementation",
      description:
        "Find Spectrum token name(s) that map to a given platform style macro property and value. Use when you have a React Spectrum style value and want to know the source token.",
      inputSchema: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            description: `Platform. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
            enum: SUPPORTED_PLATFORMS,
          },
          property: {
            type: "string",
            description:
              "Style macro property (e.g. backgroundColor, fontSize, outlineColor)",
          },
          value: {
            type: "string",
            description: "Style macro value (e.g. accent, ui, focus-ring)",
          },
        },
        required: ["platform", "property", "value"],
      },
      handler: async (args) => {
        const platform = args?.platform;
        const property = args?.property;
        const value = args?.value;
        if (!platform || !property || !value) {
          return {
            ok: false,
            error: "platform, property, and value are required",
          };
        }
        if (platform !== "react-spectrum") {
          return {
            ok: false,
            error: `Unsupported platform: ${platform}. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
          };
        }
        const tokenNames = reverseLookupReactSpectrum(
          String(property).trim(),
          String(value).trim(),
        );
        return {
          ok: true,
          platform: "react-spectrum",
          property: String(property).trim(),
          value: String(value).trim(),
          tokenNames,
          message:
            tokenNames.length === 0
              ? "No tokens in the PoC map match this style macro."
              : undefined,
        };
      },
    },
    {
      name: "list-implementation-mappings",
      description:
        "List token names that have a known mapping to a given platform (e.g. React Spectrum). Useful to see what is covered by the PoC map.",
      inputSchema: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            description: `Platform. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
            enum: SUPPORTED_PLATFORMS,
          },
        },
        required: ["platform"],
      },
      handler: async (args) => {
        const platform = args?.platform;
        if (!platform || platform !== "react-spectrum") {
          return {
            ok: false,
            error: `Unsupported platform: ${platform ?? "missing"}. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
          };
        }
        const { version, mappings } = loadReactSpectrumMap();
        const tokenNames = listMappedTokenNames();
        return {
          ok: true,
          platform: "react-spectrum",
          version,
          count: tokenNames.length,
          tokenNames,
        };
      },
    },
  ];
}
