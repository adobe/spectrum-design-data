import _ from "lodash";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import { JSON_SET_NODE_NAMES } from "./lib/common.js";
import { debug } from "./lib/debug.js";
import { getTypeByKeyOrValue } from "./lib/getTypeByKeyOrValue.js";
import { getTokenAlias } from "./lib/alias.js";
import { storeToken } from "./lib/storeToken.js";
import {
  completeTokensStudioTokensJsonData,
  expressCoreJson,
  expressDarkestJson,
  expressDarkJson,
  expressDesktopJson,
  expressLightJson,
  expressMobileJson,
  expressWireframeJson,
  finalizeTokensStudioJsonData,
  globalCoreJson,
  globalDarkestJson,
  globalDarkJson,
  globalDesktopJson,
  globalLightJson,
  globalMobileJson,
  globalWireframeJson,
  mergeWorkingJson,
  resetWorkingJson,
  spectrumCoreJson,
  spectrumDarkestJson,
  spectrumDarkJson,
  spectrumDesktopJson,
  spectrumLightJson,
  spectrumMobileJson,
  spectrumWireframeJson,
} from "./lib/jsondata.js";

/**
 * files that go in
 * @type {string[]}
 */
const srcFiles = [
  // typography (this is hacky, instead the converter needs a two pass strategy, first collecting the aliases, second generate the tokens)
  "temp/typography.json",

  // layout
  "temp/layout.json",
  "temp/layout-component.json",
  // color
  "temp/color-palette.json",
  "temp/semantic-color-palette.json",
  "temp/color-aliases.json",
  "temp/color-component.json",

  // two-pass to collect all new aliases before assigning/overwriting the values

  // typography
  "temp/typography.json",

  // layout
  "temp/layout.json",
  "temp/layout-component.json",
  // color
  "temp/color-palette.json",
  "temp/semantic-color-palette.json",
  "temp/color-aliases.json",
  "temp/color-component.json",
];

/**
 * files that come out
 * @type {string}
 */
const destFile = "./src/all/tokens.json";

/**
 * handles sets like:
 *
 *   "workflow-icon-size-50": {
 *     "sets": {
 *       "desktop": {
 *         "value": "14px"
 *       },
 *       "mobile": {
 *         "value": "18px"
 *       }
 *     }
 *   },
 *
 * or
 *
 *   "field-label-text-to-asterisk-small": {
 *     "component": "field-label",
 *     "sets": {
 *       "desktop": {
 *         "value": "4px"
 *       },
 *       "mobile": {
 *         "value": "5px"
 *       }
 *     }
 *   },
 *
 * @param targetMobile
 * @param targetDesktop
 * @param key
 * @param set
 */
function splitSetByScale(targetMobile, targetDesktop, key, set, component) {
  debug("splitSetByScale: " + JSON.stringify(set));
  if (_.has(set, JSON_SET_NODE_NAMES.MOBILE)) {
    const currentValue = getTokenAlias(set[JSON_SET_NODE_NAMES.MOBILE].value);
    const mobileTokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetMobile, key, mobileTokenEntry, component);
  }
  if (_.has(set, JSON_SET_NODE_NAMES.DESKTOP)) {
    const currentValue = getTokenAlias(set[JSON_SET_NODE_NAMES.DESKTOP].value);
    const desktopTokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetDesktop, key, desktopTokenEntry, component);
  }
}

/**
 * can handle sets like:
 *
 *   "gray-50": {
 *     "sets": {
 *       "light": {
 *         "value": "rgb(255, 255, 255)"
 *       },
 *       "dark": {
 *         "value": "rgb(29, 29, 29)"
 *       },
 *       "darkest": {
 *         "value": "rgb(0, 0, 0)"
 *       },
 *       "wireframe": {
 *         "value": "rgb(255, 255, 255)"
 *       }
 *     }
 *   },
 */
const splitSetByTheme = (
  targetLight,
  targetDark,
  targetDarkest,
  targetWireframe,
  key,
  set,
  component,
) => {
  debug("splitSetByTheme: " + JSON.stringify(set));
  if (_.has(set, JSON_SET_NODE_NAMES.LIGHT)) {
    let currentValue = getTokenAlias(
      set[JSON_SET_NODE_NAMES.LIGHT][JSON_SET_NODE_NAMES.VALUE],
    );
    const tokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetLight, key, tokenEntry, component);
  }

  if (_.has(set, JSON_SET_NODE_NAMES.DARK)) {
    let currentValue = getTokenAlias(
      set[JSON_SET_NODE_NAMES.DARK][JSON_SET_NODE_NAMES.VALUE],
    );
    const tokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetDark, key, tokenEntry, component);
  }

  if (_.has(set, JSON_SET_NODE_NAMES.DARKEST)) {
    let currentValue = getTokenAlias(
      set[JSON_SET_NODE_NAMES.DARKEST][JSON_SET_NODE_NAMES.VALUE],
    );
    const tokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetDarkest, key, tokenEntry, component);
  }

  if (_.has(set, JSON_SET_NODE_NAMES.WIREFRAME)) {
    let currentValue = getTokenAlias(
      set[JSON_SET_NODE_NAMES.WIREFRAME][JSON_SET_NODE_NAMES.VALUE],
    );
    const tokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetWireframe, key, tokenEntry, component);
  }
};

/**
 * for sets like:
 *
 *   "border-width-100": {
 *     "sets": {
 *       "spectrum": {
 *         "value": "1px"
 *       },
 *       "express": {
 *         "value": "2px",
 *         "deprecated": true,
 *         "deprecated_comment": "Express will merge with Spectrum with the release of Spectrum 2."
 *       }
 *     }
 *   },
 *
 * or
 *
 *   "color-loupe-bottom-to-color-handle": {
 *     "component": "color-loupe",
 *     "sets": {
 *       "spectrum": {
 *         "value": "12px"
 *       },
 *       "express": {
 *         "value": "6px",
 *         "deprecated": true,
 *         "deprecated_comment": "Express will merge with Spectrum with the release of Spectrum 2."
 *       }
 *     }
 *   },
 *
 * or
 *
 *   "neutral-background-color-selected-default": {
 *     "sets": {
 *       "spectrum": {
 *         "value": "{gray-700}"
 *       },
 *       "express": {
 *         "value": "{gray-800}",
 *         "deprecated": true,
 *         "deprecated_comment": "Express will merge with Spectrum with the release of Spectrum 2."
 *       }
 *     }
 *   },
 *
 * or
 *
 *   "color-loupe-height": {
 *     "component": "color-loupe",
 *     "sets": {
 *       "spectrum": {
 *         "value": "64px"
 *       },
 *       "express": {
 *         "sets": {
 *           "desktop": {
 *             "value": "40px",
 *             "deprecated": true,
 *             "deprecated_comment": "Express will merge with Spectrum with the release of Spectrum 2."
 *           },
 *           "mobile": {
 *             "value": "50px",
 *             "deprecated": true,
 *             "deprecated_comment": "Express will merge with Spectrum with the release of Spectrum 2."
 *           }
 *         }
 *       }
 *     }
 *   },
 *
 * @param key
 * @param set
 */
function splitSetBySystem(key, set, component) {
  debug("splitSetBySystem: " + JSON.stringify(set));

  // express
  if (_.has(set, JSON_SET_NODE_NAMES.EXPRESS)) {
    const expressNode = set[JSON_SET_NODE_NAMES.EXPRESS];

    // find express-global value
    if (_.has(expressNode, JSON_SET_NODE_NAMES.VALUE)) {
      const currentValue = getTokenAlias(
        expressNode[JSON_SET_NODE_NAMES.VALUE],
      );
      const expressTokenEntry = {
        value: currentValue,
        type: getTypeByKeyOrValue(key, currentValue),
      };
      storeToken(expressCoreJson, key, expressTokenEntry, component);
    }

    // find express sets
    if (_.has(expressNode, JSON_SET_NODE_NAMES.SETS)) {
      // try different sets tree walking with this node
      const setNode = expressNode[JSON_SET_NODE_NAMES.SETS];
      // find split by theme for express
      splitSetByTheme(
        expressLightJson,
        expressDarkJson,
        expressDarkestJson,
        expressWireframeJson,
        key,
        setNode,
        component,
      );

      // find split by scale for express
      splitSetByScale(
        expressMobileJson,
        expressDesktopJson,
        key,
        setNode,
        component,
      );
    }
  }

  // spectrum
  if (_.has(set, JSON_SET_NODE_NAMES.SPECTRUM)) {
    const spectrumNode = set[JSON_SET_NODE_NAMES.SPECTRUM];

    // found spectrum-global value
    if (_.has(spectrumNode, JSON_SET_NODE_NAMES.VALUE)) {
      const currentValue = getTokenAlias(
        spectrumNode[JSON_SET_NODE_NAMES.VALUE],
      );
      const spectrumTokenEntry = {
        value: currentValue,
        type: getTypeByKeyOrValue(key, currentValue),
      };
      storeToken(spectrumCoreJson, key, spectrumTokenEntry, component);
    }

    // find spectrum sets
    if (_.has(spectrumNode, JSON_SET_NODE_NAMES.SETS)) {
      // try different sets tree walking with this node
      const setNode = spectrumNode[JSON_SET_NODE_NAMES.SETS];
      // find split by theme for spectrum
      splitSetByTheme(
        spectrumLightJson,
        spectrumDarkJson,
        spectrumDarkestJson,
        spectrumWireframeJson,
        key,
        setNode,
        component,
      );

      // find split by scale for spectrum
      splitSetByScale(
        spectrumMobileJson,
        spectrumDesktopJson,
        key,
        setNode,
        component,
      );
    }
  }
}

/**
 * handles sets like:
 *
 *   "corner-radius-75": {
 *     "sets": {
 *       "spectrum": {
 *         "sets": {
 *           "desktop": {
 *             "value": "2px"
 *           },
 *           "mobile": {
 *             "value": "2px"
 *           }
 *         }
 *       },
 *       "express": {
 *         "sets": {
 *           "desktop": {
 *             "value": "3px",
 *             "deprecated": true,
 *             "deprecated_comment": "Express will merge with Spectrum with the release of Spectrum 2."
 *           },
 *           "mobile": {
 *             "value": "4px",
 *             "deprecated": true,
 *             "deprecated_comment": "Express will merge with Spectrum with the release of Spectrum 2."
 *           }
 *         }
 *       }
 *     }
 *   },
 *
 * or
 *
 *   "slider-control-height-small": {
 *     "component": "slider",
 *     "sets": {
 *       "spectrum": {
 *         "sets": {
 *           "desktop": {
 *             "value": "14px"
 *           },
 *           "mobile": {
 *             "value": "18px"
 *           }
 *         }
 *       },
 *       "express": {
 *         "sets": {
 *           "desktop": {
 *             "value": "18px",
 *             "deprecated": true,
 *             "deprecated_comment": "Express will merge with Spectrum with the release of Spectrum 2."
 *           },
 *           "mobile": {
 *             "value": "22px",
 *             "deprecated": true,
 *             "deprecated_comment": "Express will merge with Spectrum with the release of Spectrum 2."
 *           }
 *         }
 *       }
 *     }
 * @param key
 * @param set
 * @param component
 */
function splitSetBySystemAndScale(key, set, component) {
  debug("splitSetBySystemAndScale: " + JSON.stringify(set));
  if (_.has(set, JSON_SET_NODE_NAMES.EXPRESS)) {
    const setNode = set[JSON_SET_NODE_NAMES.EXPRESS][JSON_SET_NODE_NAMES.SETS];
    splitSetByScale(
      expressMobileJson,
      expressDesktopJson,
      key,
      setNode,
      component,
    );
  }
  if (_.has(set, JSON_SET_NODE_NAMES.SPECTRUM)) {
    const setNode = set[JSON_SET_NODE_NAMES.SPECTRUM][JSON_SET_NODE_NAMES.SETS];
    splitSetByScale(
      spectrumMobileJson,
      spectrumDesktopJson,
      key,
      setNode,
      component,
    );
  }
}

/**
 * check custom style-dictionary token entry...
 *
 * @param key
 * @param entry
 */
const handleTokenEntry = (key, entry) => {
  // store component value for nested groups
  let component;

  // looking for "component" entry upfront
  if (_.has(entry, JSON_SET_NODE_NAMES.COMPONENT)) {
    // safe component, will created nested token groups
    component = entry.component;
  }

  // look for a value in the first level -> global token found
  if (_.has(entry, JSON_SET_NODE_NAMES.VALUE)) {
    // e.g. a global value
    // for simple global values, like:
    //
    //   "android-elevation": {
    //     "value": "2dp"
    //   },
    //
    // or
    //
    //   "picker-minimum-width-multiplier": {
    //     "component": "picker",
    //     "value": "2"
    //   },
    //
    // or
    //
    //   "black": {
    //     "value": "rgb(0, 0, 0)"
    //   },
    const currentValue = getTokenAlias(entry[JSON_SET_NODE_NAMES.VALUE]);
    const tokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    debug("found global key / value: " + key + "/" + currentValue);
    storeToken(globalCoreJson, key, tokenEntry, component);
  }
  // or look for sets
  else if (_.has(entry, JSON_SET_NODE_NAMES.SETS)) {
    // try different sets tree walking with this node
    const setNode = entry[JSON_SET_NODE_NAMES.SETS];

    // e.g. a global value by scale
    splitSetByScale(
      globalMobileJson,
      globalDesktopJson,
      key,
      setNode,
      component,
    );

    // e.g. a global value by theme
    splitSetByTheme(
      globalLightJson,
      globalDarkJson,
      globalDarkestJson,
      globalWireframeJson,
      key,
      setNode,
      component,
    );

    // or a value split by system / not by scale:
    splitSetBySystem(key, setNode, component);

    // or a value split by system and by scale
    splitSetBySystemAndScale(key, setNode, component);
  }
};

function gatherTokenFromJson(data) {
  // reset working data
  resetWorkingJson();

  Object.entries(data).forEach(([key, value]) => {
    handleTokenEntry(key, value);
  });

  // merge data into token studio data
  mergeWorkingJson();
}

const main = async () => {
  // // two pass:
  // // - 1. go through every file and look for aliases
  // // - 2. go through every file and create new tokens

  // for (const file of files) {
  //   console.log(file);
  //   console.log(path.join(process.cwd(), "..", file));
  //   const jsonData = JSON.parse(
  //     fs.readFileSync(path.join(process.cwd(), file), "utf-8")
  //   );
  //   gatherTokenFromJson(jsonData);
  // }

  for (const file of srcFiles) {
    console.log(file);
    console.log(path.join(process.cwd(), file));

    const jsonData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), file), "utf-8"),
    );
    gatherTokenFromJson(jsonData);
  }

  // finalize tokens studio json data with additional info and metadata
  finalizeTokensStudioJsonData();

  // write data
  await writeFile(
    destFile,
    JSON.stringify(completeTokensStudioTokensJsonData, null, 2),
  );
  console.log(
    `Wrote ${destFile} with ${
      Object.keys(completeTokensStudioTokensJsonData).length
    } entries.`,
  );

  // test data
  // todo: apply token type of alias source to alias ?

  // todo: check if an alias is used before it is defined...

  // todo: check if a token is referenced by alias and types do not match

  // todo: check if a token is referencing a token, that does not exists (or the syntax is wrong, dash vs period notation)?
};

await main();
