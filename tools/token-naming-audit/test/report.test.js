/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import { renderReport } from "../src/report.js";

const sampleStringNames = [
  {
    token: "some-legacy-token",
    file: "color.tokens.json",
    status: "unrecorded",
  },
  {
    token: "accent-background-color-default",
    file: "color-aliases.tokens.json",
    status: "known",
    category: "compound-state",
    reason: "Does not roundtrip",
  },
];

const samplePropertyValues = [
  {
    token: "button/background",
    file: "component.tokens.json",
    propertyValue: "background",
    suggestedField: "object",
  },
];

test("report includes both top-level sections", (t) => {
  const report = renderReport(sampleStringNames, samplePropertyValues);
  t.true(report.includes("## String-form name tokens"));
  t.true(report.includes("## Overloaded `property` values"));
});

test("report lists unrecorded token in Unrecorded subsection", (t) => {
  const report = renderReport(sampleStringNames, samplePropertyValues);
  t.true(report.includes("some-legacy-token"));
  t.true(report.includes("### Unrecorded (action required)"));
});

test("report lists known exception with category and reason", (t) => {
  const report = renderReport(sampleStringNames, samplePropertyValues);
  t.true(report.includes("accent-background-color-default"));
  t.true(report.includes("compound-state"));
  t.true(report.includes("Does not roundtrip"));
});

test("report lists overloaded property value with suggestion", (t) => {
  const report = renderReport(sampleStringNames, samplePropertyValues);
  t.true(report.includes("background"));
  t.true(report.includes("`object`"));
});

test("report includes summary count table", (t) => {
  const report = renderReport(sampleStringNames, samplePropertyValues);
  t.true(report.includes("| 1 |")); // unrecorded count
});

test("empty scanners produce report with no-results messages", (t) => {
  const report = renderReport([], []);
  t.true(report.includes("_No unrecorded string-name tokens found._"));
  t.true(report.includes("_No overloaded property values found._"));
});
