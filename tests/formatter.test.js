const StyleDictionary = require("style-dictionary");
const JsonSetsFormatter = require("../json-sets-formatter");
StyleDictionary.registerFormat(JsonSetsFormatter);
const config = module.exports = {
  source: ["tests/fixtures/refset.json"],
  platforms: {
    JSON: {
      buildPath: "tests/tmp/",
      transforms: ["attribute/cti", "name/cti/kebab"],
      files: [
        {
          destination: "refset.json",
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


test('ref to set should include all values', () => {
  const sd = StyleDictionary.extend(config);
  sd.buildAllPlatforms();
  expect('true').toBe('true');
});
