/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const StyleDictionary = require("style-dictionary");
const AttributeSetsTransform =
  require("style-dictionary-sets").AttributeSetsTransform;
const NameKebabTransfom = require("style-dictionary-sets").NameKebabTransfom;

const dimensionRegex = /(?:[0-9]+px)|(?:[0-9]+\.[0-9]+)/;
const colorRegex =
  /rgba?\(([0-9]+), ?([0-9]+), ?([0-9]+)(?:, ?([0-1]|0\.[0-9]+))?\)/;

const colorStopInitial = {
  colorTokens: {
    name: "Color Stop",
    varBaseName: "global-color",
    description: "A UI color stop",
  },
  colorAliases: {
    name: "Color Aliases",
    varBaseName: "alias",
    description:
      "Holds color aliases, which are color groups that components share",
  },
  colorSemantics: {
    name: "Color Semantics",
    varBaseName: "semantic",
    description: "Semantic values for color configuation",
  },
};

const initial = {
  dna: {
    system: "Spectrum",
    version: "11.7.0",
    KEYS: {
      COLORS: "colorGlobals",
      DIMENSIONS: "dimensionGlobals",
      DIMENSION_LAYOUT_TOKENS: "layoutTokens",
      DIMENSION_COMPONENT_LAYOUT_TOKENS: "componentLayoutTokens",
      STOP_DATA: "colorStopData",
      COLOR_TOKENS: "colorTokens",
      COLOR_ALIASES: "colorAliases",
      COLOR_SEMANTICS: "colorSemantics",
      SCALE_DATA: "scaleData",
    },
    colorGlobals: {
      name: "Global Common Colors",
      varBaseName: "global-color",
      description: "Color definitions common across all color stops",
    },
    colorStopData: {
      light: { ...colorStopInitial },
      dark: { ...colorStopInitial },
      darkest: { ...colorStopInitial },
    },
    dimensionGlobals: {
      name: "Global Common Dimensions (a.k.a Sizes)",
      varBaseName: "global-dimension-static",
      description:
        "Dimension and size definitions that do not change across scales",
    },
    scaleData: {
      medium: {
        name: "A Scale Stop",
        varBaseName: "global-dimension",
        description: "A scale stop of a given size",
        "scale-factor": "1",
        layoutTokens: {},
        componentLayoutTokens: {},
      },
    },
  },
};

const nameGen = (token, platform) => {
  let name = platform.prefix ? [platform.prefix] : [];
  const cleanTokenPath = [];
  for (let i = 0; i < token.path.length; i++) {
    if (token.path[i] === "sets") {
      i++;
    } else {
      cleanTokenPath.push(token.path[i]);
    }
  }
  name = name.concat(cleanTokenPath);
  return name.join("-");
};

const isObject = (item) => {
  return typeof item === "object" && !Array.isArray(item) && item !== null;
};

const isASet = (value) => {
  return isObject(value) && "sets" in value;
};

const genType = (token) => {
  if (!token.path.includes("ccx")) {
    if (colorRegex.test(token.value)) {
      let stopPrefix = "";
      if (token.path.includes("light")) {
        stopPrefix = "light";
      } else if (token.path.includes("dark")) {
        stopPrefix = "dark";
      } else if (token.path.includes("darkest")) {
        stopPrefix = "darkest";
      } else {
        return "colorGlobal";
      }
      switch (token.filePath) {
        case "src/color-alias.json":
          return `${stopPrefix}-colorAlias`;
          break;
        case "src/color-semantic.json":
          return `${stopPrefix}-colorSemantic`;
          break;
        default:
          return `${stopPrefix}-colorToken`;
      }
    } else if (dimensionRegex.test(token.value)) {
      let scalePrefix = "";
      if (token.path.includes("desktop")) {
        scalePrefix = "desktop";
      } else if (token.path.includes("mobile")) {
        scalePrefix = "mobile";
      } else {
        return "dimensionGlobals";
      }
      switch (token.filePath) {
        case "src/component-layout.json":
          return `${scalePrefix}-componentLayout`;
          break;
        // case "src/layout.json":
        default:
          return `${scalePrefix}-layout`;
          break;
      }
    }
    console.log({
      name: token.name,
      path: token.path,
      value: token.value,
      dimension: dimensionRegex.test(token.value),
      desktop: token.path.includes("desktop"),
      mobile: token.path.includes("mobile"),
      color: colorRegex.test(token.value),
      file: token.filePath,
    });
  }
};

const getValue = (token, dictionary) => {
  if (dictionary.usesReference(token.original.value)) {
    const ref = token.original.value;
    if (isASet(token.value)) {
      const sets = {};
      for (const setName in token.value.sets) {
        sets[setName] = getValue(token.value.sets[setName], dictionary);
      }
      return { ref, sets };
    } else {
      return { ref, value: token.value };
    }
  } else {
    return { value: token.value };
  }
};

const DNASetsFormatter = {
  formatter: ({ dictionary, platform, file, options }) => {
    const result = { ...initial };
    dictionary.allTokens.forEach((token) => {
      if (dictionary.usesReference(token)) {
        if (isASet(token.value)) {
          const newValue = getValue(token, dictionary);
          if (
            newValue.sets.hasOwnProperty("spectrum") &&
            newValue.sets.hasOwnProperty("express")
          ) {
            newValue.sets = newValue.sets.spectrum.sets;
          }
          if (
            newValue.sets.hasOwnProperty("light") &&
            newValue.sets.hasOwnProperty("dark") &&
            newValue.sets.hasOwnProperty("darkest")
          ) {
            switch (token.filePath) {
              case "src/color-alias.json":
                result.dna.colorStopData.light.colorAliases[
                  nameGen(token, platform)
                ] = newValue.sets.light.value;
                result.dna.colorStopData.dark.colorAliases[
                  nameGen(token, platform)
                ] = newValue.sets.dark.value;
                result.dna.colorStopData.darkest.colorAliases[
                  nameGen(token, platform)
                ] = newValue.sets.darkest.value;
                break;
              case "src/color-semantic.json":
                result.dna.colorStopData.light.colorSemantics[
                  nameGen(token, platform)
                ] = newValue.sets.light.value;
                result.dna.colorStopData.dark.colorSemantics[
                  nameGen(token, platform)
                ] = newValue.sets.dark.value;
                result.dna.colorStopData.darkest.colorSemantics[
                  nameGen(token, platform)
                ] = newValue.sets.darkest.value;
                break;
              default:
                result.dna.colorStopData.light.colorTokens[
                  nameGen(token, platform)
                ] = newValue.sets.light.value;
                result.dna.colorStopData.dark.colorTokens[
                  nameGen(token, platform)
                ] = newValue.sets.dark.value;
                result.dna.colorStopData.darkest.colorTokens[
                  nameGen(token, platform)
                ] = newValue.sets.darkest.value;
            }
          } else {
            // The only token here is android elevation
          }
        } else {
          if (genType(token) == "colorGlobal") {
            result.dna.colorGlobals[nameGen(token, platform)] = token.value;
          }
        }
      } else {
        token.attributes.tokenType = genType(token);
        switch (token.attributes.tokenType) {
          case "dimensionGlobals":
            result.dna.dimensionGlobals[nameGen(token, platform)] = token.value;
            break;
          case "desktop-layout":
            result.dna.scaleData.medium.layoutTokens[nameGen(token, platform)] =
              token.value;
            break;
          case "desktop-componentLayout":
            result.dna.scaleData.medium.componentLayoutTokens[
              nameGen(token, platform)
            ] = token.value;
            break;
          case "light-colorAlias":
            result.dna.colorStopData.light.colorAliases[
              nameGen(token, platform)
            ] = token.value;
            break;
          case "light-colorSemantic":
            result.dna.colorStopData.light.colorSemantics[
              nameGen(token, platform)
            ] = token.value;
            break;
          case "light-colorToken":
            result.dna.colorStopData.light.colorTokens[
              nameGen(token, platform)
            ] = token.value;
            break;
          case "dark-colorAlias":
            result.dna.colorStopData.dark.colorAliases[
              nameGen(token, platform)
            ] = token.value;
            break;
          case "dark-colorSemantic":
            result.dna.colorStopData.dark.colorSemantics[
              nameGen(token, platform)
            ] = token.value;
            break;
          case "dark-colorToken":
            result.dna.colorStopData.dark.colorTokens[
              nameGen(token, platform)
            ] = token.value;
            break;
          case "darkest-colorAlias":
            result.dna.colorStopData.darkest.colorAliases[
              nameGen(token, platform)
            ] = token.value;
            break;
          case "darkest-colorSemantic":
            result.dna.colorStopData.darkest.colorSemantics[
              nameGen(token, platform)
            ] = token.value;
            break;
          case "darkest-colorToken":
            result.dna.colorStopData.darkest.colorTokens[
              nameGen(token, platform)
            ] = token.value;
            break;
          default:
        }
      }
    });
    return JSON.stringify(result, null, 2);
  },
  name: "dna/json/sets",
};

DNASetsFormatter.formatter.nested = true;

StyleDictionary.registerFormat(DNASetsFormatter);
StyleDictionary.registerTransform(AttributeSetsTransform);
StyleDictionary.registerTransform(NameKebabTransfom);

module.exports = {
  source: ["src/**/*.json"],
  platforms: {
    Drover: {
      buildPath: "dist/json/",
      transforms: [AttributeSetsTransform.name, NameKebabTransfom.name],
      files: [
        {
          destination: "dna.json",
          format: "dna/json/sets",
          options: {
            showFileHeader: false,
            outputReferences: true,
          },
        },
      ],
    },
  },
};
