const StyleDictionary = require("style-dictionary");
const VarsFormatter = require("./vars-formatter");

const fs = require("fs");

StyleDictionary.registerFormat({
  name: "js/deep-variables",
  formatter: VarsFormatter,
});

StyleDictionary.registerTransform({
  name: "attribute/sets",
  type: "attribute",
  matcher: (prop) => {
    return prop.hasOwnProperty("sets");
  },
  transformer: (prop, options) => {
    const attributes = prop.attributes || {};
    attributes.sets = prop.sets;
    return attributes;
  },
});

StyleDictionary.registerTransform({
  name: "value/sets",
  type: "value",
  matcher: (prop) => {
    return prop.attributes.hasOwnProperty("sets");
  },
  transformer: (prop, options) => {
    let value = prop.value;
    for (const setKey in prop.sets) {
      if (options.sets.includes(setKey)) {
        value = prop.attributes.sets[setKey];
      }
    }
    return value;
  },
});

const setRegex = /@(\w+):(\w+)/;

const defaultFile = {
  destination: "default.css",
  options: {
    showFileHeader: false,
    outputReferences: true,
  },
  format: "css/variables",
};
const defaultPlatform = {
  transforms: [
    "attribute/sets",
    "value/sets",
    "attribute/cti",
    "name/cti/kebab",
    "time/seconds",
    "content/icon",
  ],
  buildPath: "dist/css/",
  deep: true,
  sets: ["large"],
  prefix: "spectrum",
  files: [defaultFile],
};

const config = {
  source: ["tokens/**/*.json"],
  platforms: {
    "Javscript": {
      buildPath: "dist/js/",
      transformGroup: "js",
      files: [
        {
          destination: "variables.js",
          format: "js/deep-variables",
          options: {
            outputReferences: true,
          },
        },
      ],
    },
    "CSS: CCX": {
      ...defaultPlatform,
      ...{
        sets: ["ccx"],
        files: [
          {
            ...defaultFile,
            ...{
              destination: "ccx.css",
              filter: (prop) => {
                return (
                  prop.attributes.hasOwnProperty("sets") &&
                  prop.attributes.sets.hasOwnProperty("ccx")
                );
              },
            },
          },
        ],
      },
    },
    "CSS: Scale Desktop": {
      ...defaultPlatform,
      ...{
        sets: ["desktop"],
        files: [
          {
            ...defaultFile,
            ...{
              destination: "desktop.css",
              filter: (prop) => {
                return (
                  prop.attributes.hasOwnProperty("sets") &&
                  prop.attributes.sets.hasOwnProperty("desktop")
                );
              },
            },
          },
        ],
      },
    },
    "CSS: Default with Mobile Scale": defaultPlatform,
  },
};

StyleDictionaryExtended = StyleDictionary.extend(config);
StyleDictionaryExtended.buildAllPlatforms();
