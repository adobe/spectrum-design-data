const StyleDictionary = require("style-dictionary");
const JsonSetsFormatter = require("./json-sets-formatter");

StyleDictionary.registerFormat(JsonSetsFormatter);

module.exports = {
  source: ["tokens/**/*.json"],
  platforms: {
    JSON: {
      buildPath: "dist/json/",
      transforms: ["attribute/cti", "name/cti/kebab"],
      files: [
        {
          destination: "variables.json",
          format: "json/sets",
          options: {
            showFileHeader: false,
            outputReferences: true,
          },
        },
      ],
    },
  },
}
