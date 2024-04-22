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
import augmentExpressTokens from "../tasks/lib/augmentExpressTokens.js";

const fixture = {
  foo: {
    express: {
      value: "bar",
    },
  },
  "corner-radius-100": {
    sets: {
      spectrum: {
        sets: {
          desktop: {
            value: "4px",
          },
          mobile: {
            value: "5px",
          },
        },
      },
      express: {
        sets: {
          desktop: {
            value: "6px",
          },
          mobile: {
            value: "8px",
          },
        },
      },
    },
  },
};

test("Deprecate Express should add deprecation metadata to Express tokens", (t) => {
  t.snapshot(augmentExpressTokens(fixture));
});
