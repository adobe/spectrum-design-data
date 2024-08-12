/*
Copyright {{ now() | date(format="%Y") }} Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import tokenDiff from "../src/lib/index.js";
import basicToken from "./test-schemas/basic-original-token.json" with { type: "json" };
import basicRenamedToken from "./test-schemas/basic-renamed-token.json" with { type: "json" };
import originalEntireSchema from "./test-schemas/entire-schema.json" with { type: "json" };
import addedRenamedTokens from "./test-schemas/added-renamed-tokens.json" with { type: "json" };
import renamedAddedDeletedTokens from "./test-schemas/renamed-added-deleted-tokens.json" with { type: "json" };
import severalSetTokens from "./test-schemas/several-set-tokens.json" with { type: "json" };
import renamedAddedDeletedSetTokens from "./test-schemas/renamed-added-deleted-set-tokens.json" with { type: "json" };
import rADDepTokens from "./test-schemas/renamed-added-deleted-deprecated-tokens.json" with { type: "json" };
import rADDepUTokens from "./test-schemas/renamed-added-deleted-deprecated-updated-tokens.json" with { type: "json" };
import rADDepURevTokens from "./test-schemas/renamed-added-deleted-deprecated-updated-reverted-tokens.json" with { type: "json" };
import basicSetTokenProperty from "./test-schemas/basic-set-token-property.json" with { type: "json" };
import addedPropertySetToken from "./test-schemas/added-property-set-token.json" with { type: "json" };

const expectedRenamed = {
  added: {},
  deleted: {},
  deprecated: {},
  reverted: {},
  renamed: {
    "hello-world": {
      "old-name": "swatch-border-color",
    },
  },
  updated: {
    added: {},
    deleted: {},
    renamed: {},
    updated: {},
  },
};

const expectedManyAddedRenamed = {
  added: {
    "i-like-pizza": {
      component: "table",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.07",
      uuid: "1234",
    },
    "hi-how-are-you": {
      component: "color-handle",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.42",
      uuid: "234",
    },
  },
  deleted: {},
  deprecated: {},
  reverted: {},
  renamed: {
    "i-like-ice-cream": {
      "old-name": "color-area-border-color",
    },
  },
  updated: {
    added: {},
    deleted: {},
    renamed: {},
    updated: {},
  },
};

const expectedRenamedAddedDeleted = {
  added: {
    "gray-100": {
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color-set.json",
      sets: {
        light: {
          $schema:
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
          value: "rgb(248, 248, 248)",
          uuid: "64e2dbc2-05fa-43d7-80ae-d4d11c55348f",
        },
        dark: {
          $schema:
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
          value: "rgb(50, 50, 50)",
          uuid: "4500355e-ce60-4046-b692-71301b6b1348",
        },
        darkest: {
          $schema:
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
          value: "rgb(29, 29, 29)",
          uuid: "abd011c4-87a5-4b1f-82e2-e94d118f417f",
        },
        wireframe: {
          $schema:
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
          value: "rgb(244, 246, 252)",
          uuid: "3605974e-8f93-4907-81b3-fb6ab55d03f8",
        },
      },
      private: true,
      uuid: "55a0effe-1758-4b2f-908c-d36e460880b8",
    },
  },
  deleted: {
    "status-light-dot-size-extra-large": undefined,
  },
  deprecated: {},
  reverted: {},
  renamed: {
    "i-like-lemon-coconut-muffins": {
      "old-name": "help-text-top-to-workflow-icon-medium",
    },
  },
  updated: {
    added: {},
    deleted: {},
    renamed: {},
    updated: {},
  },
};

const expectedSeveralRenamedAddedDeleted = {
  added: {
    "i-like-pizza": {
      component: "table",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.07",
      uuid: "1234",
    },
    "hi-how-are-you": {
      component: "color-handle",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.42",
      uuid: "234",
    },
  },
  deleted: {
    "floating-action-button-drop-shadow-color": undefined,
    "floating-action-button-shadow-color": undefined,
    "table-selected-row-background-opacity-non-emphasized-hover": undefined,
    "table-selected-row-background-opacity-non-emphasized": undefined,
  },
  deprecated: {},
  reverted: {},
  renamed: {
    "i-like-ice-cream": {
      "old-name": "color-area-border-color",
    },
    "i-like-char-siu": {
      "old-name": "color-handle-inner-border-color",
    },
  },
  updated: {
    added: {},
    deleted: {},
    renamed: {},
    updated: {},
  },
};

// The names are getting pretty long lol, so here's the abbreviations (open to change b/c tbh these kinda suck!)
// R = renamed, A = added, D = deleted, Dep = deprecated, Rev = reverted, U = updated
const expectedSeveralRADDep = {
  added: {
    "i-like-pizza": {
      component: "table",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.07",
      uuid: "1234",
    },
    "hi-how-are-you": {
      component: "color-handle",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.42",
      uuid: "234",
    },
  },
  deleted: {
    "floating-action-button-drop-shadow-color": undefined,
    "floating-action-button-shadow-color": undefined,
    "table-selected-row-background-opacity-non-emphasized-hover": undefined,
    "table-selected-row-background-opacity-non-emphasized": undefined,
  },
  deprecated: {
    "color-slider-border-color": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
    },
    "color-loupe-outer-border": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
    },
  },
  reverted: {},
  renamed: {
    "i-like-ice-cream": {
      "old-name": "color-area-border-color",
    },
    "i-like-char-siu": {
      "old-name": "color-handle-inner-border-color",
    },
  },
  updated: {
    added: {},
    deleted: {},
    renamed: {},
    updated: {},
  },
};

const expectedSeveralRADDepU = {
  added: {
    "i-like-pizza": {
      component: "table",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.07",
      uuid: "1234",
    },
    "hi-how-are-you": {
      component: "color-handle",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.42",
      uuid: "234",
    },
  },
  deleted: {
    "floating-action-button-drop-shadow-color": undefined,
    "floating-action-button-shadow-color": undefined,
    "table-selected-row-background-opacity-non-emphasized-hover": undefined,
    "table-selected-row-background-opacity-non-emphasized": undefined,
  },
  deprecated: {
    "color-slider-border-color": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
    },
    "color-loupe-outer-border": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
    },
  },
  reverted: {},
  renamed: {
    "i-like-ice-cream": {
      "old-name": "color-area-border-color",
    },
    "i-like-char-siu": {
      "old-name": "color-handle-inner-border-color",
    },
  },
  updated: {
    added: {},
    deleted: {},
    renamed: {},
    updated: {
      "thumbnail-border-color": {
        $schema: {
          "new-value":
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/not-a-thumbnail.json",
          "original-value":
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
          path: "$schema",
        },
      },
      "opacity-checkerboard-square-dark": {
        sets: {
          light: {
            value: {
              "new-value": "{gray-500}",
              "original-value": "{gray-200}",
              path: "sets.light.value",
            },
          },
          darkest: {
            value: {
              "new-value": "{gray-900}",
              "original-value": "{gray-800}",
              path: "sets.darkest.value",
            },
          },
        },
      },
      "color-slider-border-opacity": {
        component: {
          "new-value": "not-a-color-slider",
          "original-value": "color-slider",
          path: "component",
        },
      },
      "color-loupe-inner-border": {
        uuid: {
          "new-value": "if a uuid ever change lol",
          "original-value": "d2c4cb48-8a90-461d-95bc-d882ba01472b",
          path: "uuid",
        },
      },
      "drop-zone-background-color": {
        component: {
          "new-value": "woohoo!",
          "original-value": "drop-zone",
          path: "component",
        },
        value: {
          "new-value": "{fushcia pink}",
          "original-value": "{accent-visual-color}",
          path: "value",
        },
      },
    },
  },
};

const expectedSeveralRADDepURev = {
  added: {
    "i-like-pizza": {
      component: "table",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.07",
      uuid: "1234",
    },
    "hi-how-are-you": {
      component: "color-handle",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
      value: "0.42",
      uuid: "234",
    },
  },
  deleted: {
    "floating-action-button-drop-shadow-color": undefined,
    "floating-action-button-shadow-color": undefined,
    "table-selected-row-background-opacity-non-emphasized-hover": undefined,
    "table-selected-row-background-opacity-non-emphasized": undefined,
  },
  deprecated: {
    "color-slider-border-color": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
    },
    "color-loupe-outer-border": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
    },
  },
  reverted: {
    "color-handle-drop-shadow-color": {
      deprecated: undefined,
      deprecated_comment: undefined,
    },
  },
  renamed: {
    "i-like-ice-cream": {
      "old-name": "color-area-border-color",
    },
    "i-like-char-siu": {
      "old-name": "color-handle-inner-border-color",
    },
  },
  updated: {
    added: {},
    deleted: {},
    renamed: {},
    updated: {
      "thumbnail-border-color": {
        $schema: {
          "new-value":
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/not-a-thumbnail.json",
          "original-value":
            "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
          path: "$schema",
        },
      },
      "opacity-checkerboard-square-dark": {
        sets: {
          light: {
            value: {
              "new-value": "{gray-500}",
              "original-value": "{gray-200}",
              path: "sets.light.value",
            },
          },
          darkest: {
            value: {
              "new-value": "{gray-900}",
              "original-value": "{gray-800}",
              path: "sets.darkest.value",
            },
          },
        },
      },
      "color-slider-border-opacity": {
        component: {
          "new-value": "not-a-color-slider",
          "original-value": "color-slider",
          path: "component",
        },
      },
      "color-loupe-inner-border": {
        uuid: {
          "new-value": "if a uuid ever change lol",
          "original-value": "d2c4cb48-8a90-461d-95bc-d882ba01472b",
          path: "uuid",
        },
      },
      "drop-zone-background-color": {
        component: {
          "new-value": "woohoo!",
          "original-value": "drop-zone",
          path: "component",
        },
        value: {
          "new-value": "{fushcia pink}",
          "original-value": "{accent-visual-color}",
          path: "value",
        },
      },
    },
  },
};

const expectedAddedProperty = {
  renamed: {},
  deprecated: {},
  reverted: {},
  added: {},
  deleted: {},
  updated: {
    added: {
      "celery-background-color-default": {
        sets: {
          "random-property": {
            $schema: {
              "new-value":
                "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
              path: "sets.random-property.$schema",
            },
            value: {
              "new-value": "{spinach-100}",
              path: "sets.random-property.value",
            },
            uuid: {
              "new-value": "1234",
              path: "sets.random-property.uuid",
            },
          },
        },
      },
    },
    deleted: {},
    renamed: {},
    updated: {},
  },
};

const expectedDeletedProperty = {
  renamed: {},
  deprecated: {},
  reverted: {},
  added: {},
  deleted: {},
  updated: {
    added: {},
    deleted: {
      "celery-background-color-default": {
        sets: {
          "random-property": {
            $schema: {
              "new-value":
                "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
              path: "sets.random-property.$schema",
            },
            value: {
              "new-value": "{spinach-100}",
              path: "sets.random-property.value",
            },
            uuid: {
              "new-value": "1234",
              path: "sets.random-property.uuid",
            },
          },
        },
      },
    },
    renamed: {},
    updated: {},
  },
};

test("basic test to see renamed token", (t) => {
  t.deepEqual(tokenDiff(basicToken, basicRenamedToken), expectedRenamed);
});

test("test to see renamed token and added tokens (many))", (t) => {
  t.deepEqual(
    tokenDiff(originalEntireSchema, addedRenamedTokens),
    expectedManyAddedRenamed,
  );
});

test("test to see renamed, added, and deleted set tokens (few)", (t) => {
  t.deepEqual(
    tokenDiff(severalSetTokens, renamedAddedDeletedSetTokens),
    expectedRenamedAddedDeleted,
  );
});

test("test to see renamed, added, and deleted tokens (many)", (t) => {
  t.deepEqual(
    tokenDiff(originalEntireSchema, renamedAddedDeletedTokens),
    expectedSeveralRenamedAddedDeleted,
  );
});

test("test to see renamed, added, deleted, and deprecated tokens (many)", (t) => {
  t.deepEqual(
    tokenDiff(originalEntireSchema, rADDepTokens),
    expectedSeveralRADDep,
  );
});

test("test to see renamed, added, deleted, deprecated, and updated tokens (many)", (t) => {
  t.deepEqual(
    tokenDiff(originalEntireSchema, rADDepUTokens),
    expectedSeveralRADDepU,
  );
});

test("test to see renamed, added, deleted, deprecated, updated, and if for some reason, 'un-deprecated' tokens (many)", (t) => {
  t.deepEqual(
    tokenDiff(originalEntireSchema, rADDepURevTokens),
    expectedSeveralRADDepURev,
  );
});

test("test to see if added property from token looks right", (t) => {
  t.deepEqual(
    tokenDiff(basicSetTokenProperty, addedPropertySetToken),
    expectedAddedProperty,
  );
});

test("test to see if deleted property from token looks right", (t) => {
  t.deepEqual(
    tokenDiff(addedPropertySetToken, basicSetTokenProperty),
    expectedDeletedProperty,
  );
});
