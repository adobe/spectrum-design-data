const { readFile } = require("fs/promises");

const getValue = (obj, setName) => {
  if (obj.hasOwnProperty("value")) {
    return obj.value;
  } else if (obj.hasOwnProperty("sets")) {
    if (obj.sets.hasOwnProperty(setName)) {
      return getValue(obj.sets[setName], setName);
    } else if (obj.sets.hasOwnProperty("spectrum")) {
      return getValue(obj.sets.spectrum, setName);
    }
  }
};

const vars = { light: {}, dark: {}, darkest: {} };
let variables;
let drover;

beforeAll(async () => {
  variables = JSON.parse(
    await readFile("dist/json/variables.json", { encoding: "utf8" })
  );
  drover = JSON.parse(
    await readFile("dist/json/drover.json", { encoding: "utf8" })
  );
  Object.keys(drover.colorThemes.light).forEach((tokenName) => {
    vars.light[tokenName] = getValue(variables[tokenName], "light");
  });
  Object.keys(drover.colorThemes.dark).forEach((tokenName) => {
    vars.dark[tokenName] = getValue(variables[tokenName], "dark");
  });
  Object.keys(drover.colorThemes.darkest).forEach((tokenName) => {
    vars.darkest[tokenName] = getValue(variables[tokenName], "darkest");
  });
});

test("Drover should match light variable values", () => {
  expect(drover.colorThemes.light).toMatchObject(vars.light);
});
test("Drover should match dark variable values", () => {
  expect(drover.colorThemes.dark).toMatchObject(vars.dark);
});
test("Drover should match darkest variable values", () => {
  expect(drover.colorThemes.darkest).toMatchObject(vars.darkest);
});
