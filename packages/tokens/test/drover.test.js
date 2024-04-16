/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import { readFile } from "fs/promises";

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

test.before(async (t) => {
  variables = JSON.parse(
    await readFile("dist/json/variables.json", { encoding: "utf8" }),
  );
  drover = JSON.parse(
    await readFile("dist/json/drover.json", { encoding: "utf8" }),
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

test("Drover should match light variable values", (t) => {
  t.deepEqual(drover.colorThemes.light, vars.light);
});
test("Drover should match dark variable values", (t) => {
  t.deepEqual(drover.colorThemes.dark, vars.dark);
});
test("Drover should match darkest variable values", (t) => {
  t.deepEqual(drover.colorThemes.darkest, vars.darkest);
});
