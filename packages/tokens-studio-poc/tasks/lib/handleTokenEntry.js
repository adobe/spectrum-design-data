import _ from "lodash";
import { JSON_SET_NODE_NAMES } from "./common.js";
import { getTokenAlias } from "./alias.js";
import { getTypeByKeyOrValue } from "./getTypeByKeyOrValue.js";
import { debug } from "./debug.js";
import { storeToken } from "./storeToken.js";
import {
  expressCoreJson,
  expressDarkestJson,
  expressDarkJson,
  expressDesktopJson,
  expressLightJson,
  expressMobileJson,
  expressWireframeJson,
  globalCoreJson,
  globalDarkestJson,
  globalDarkJson,
  globalDesktopJson,
  globalLightJson,
  globalMobileJson,
  globalWireframeJson,
  spectrumCoreJson,
  spectrumDarkestJson,
  spectrumDarkJson,
  spectrumDesktopJson,
  spectrumLightJson,
  spectrumMobileJson,
  spectrumWireframeJson,
} from "./jsondata.js";

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
 * - all values / all sets
 *
 * @param key
 * @param entry
 * @param component - extra nested group - store component value for nested groups
 */
export const handleTokenEntryForAll = (key, entry, component = undefined) => {
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

/**
 * check custom style-dictionary token entry...
 * - spectrum only
 *
 * @param key
 * @param entry
 * @param component - extra nested group - store component value for nested groups
 */
export const handleTokenEntryForSpectrum = (key, entry, component) => {
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
    storeToken(spectrumCoreJson, key, tokenEntry, component);
  }
  // or look for sets
  else if (_.has(entry, JSON_SET_NODE_NAMES.SETS)) {
    // try different sets tree walking with this node
    const setNode = entry[JSON_SET_NODE_NAMES.SETS];

    // e.g. a global value by scale
    splitSetByScale(
      spectrumMobileJson,
      spectrumDesktopJson,
      key,
      setNode,
      component,
    );

    // e.g. a global value by theme
    splitSetByTheme(
      spectrumLightJson,
      spectrumDarkJson,
      spectrumDarkestJson,
      spectrumWireframeJson,
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

/**
 * check custom style-dictionary token entry...
 * - spectrum only
 *
 * @param key
 * @param entry
 * @param component - extra nested group - store component value for nested groups
 */
export const handleTokenEntryForExpress = (key, entry, component) => {
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
    storeToken(expressCoreJson, key, tokenEntry, component);
  }
  // or look for sets
  else if (_.has(entry, JSON_SET_NODE_NAMES.SETS)) {
    // try different sets tree walking with this node
    const setNode = entry[JSON_SET_NODE_NAMES.SETS];

    // e.g. a global value by scale
    splitSetByScale(
      expressMobileJson,
      expressDesktopJson,
      key,
      setNode,
      component,
    );

    // e.g. a global value by theme
    splitSetByTheme(
      expressLightJson,
      expressDarkJson,
      expressDarkestJson,
      expressWireframeJson,
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
