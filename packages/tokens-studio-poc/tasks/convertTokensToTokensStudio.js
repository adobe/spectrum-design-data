import _ from "lodash";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";

// store "component: 'value'"
let allGroupNodes = new Set();
// store token keys
let allKeys = new Set();

// map style-dictionary tokens 'keys' to tokens studio alias syntax, like
//   gray-100 -> gray.100
//   heading-size-m -> heading.heading-size-m
//   thumbnail-size-500 -> thumbnail.thumbnail-size.500
let convertedKeysToAlias = new Map();

// collecting data
let globalJson = {};
let globalLightJson = {};
let globalDarkJson = {};
let globalDarkestJson = {};
let globalWireframeJson = {};
let globalDesktopJson = {};
let globalMobileJson = {};

let expressJson = {};
let expressLightJson = {};
let expressDarkJson = {};
let expressDarkestJson = {};
let expressWireframeJson = {};
let expressDesktopJson = {};
let expressMobileJson = {};

let spectrumJson = {};
let spectrumLightJson = {};
let spectrumDarkJson = {};
let spectrumDarkestJson = {};
let spectrumWireframeJson = {};
let spectrumDesktopJson = {};
let spectrumMobileJson = {};

const TokensStudioSetsNodeNames = {
  GlobalCore: "global/core",
  GlobalLight: "global/light",
  GlobalDark: "global/dark",
  GlobalDarkest: "global/darkest",
  GlobalWireframe: "global/wireframe",
  GlobalDesktop: "global/desktop",
  GlobalMobile: "global/mobile",
  SpectrumCore: "spectrum/core",
  SpectrumLight: "spectrum/light",
  SpectrumDark: "spectrum/dark",
  SpectrumDarkest: "spectrum/darkest",
  SpectrumWireframe: "spectrum/wireframe",
  SpectrumDesktop: "spectrum/desktop",
  SpectrumMobile: "spectrum/mobile",
  ExpressCore: "express/core",
  ExpressLight: "express/light",
  ExpressDark: "express/dark",
  ExpressDarkest: "express/darkest",
  ExpressWireframe: "express/wireframe",
  ExpressDesktop: "express/desktop",
  ExpressMobile: "express/mobile",
};

// final token data object (might be split into individual sets/files)
let completeTokenData = {
  [TokensStudioSetsNodeNames.GlobalCore]: {},
  [TokensStudioSetsNodeNames.GlobalLight]: {},
  [TokensStudioSetsNodeNames.GlobalDark]: {},
  [TokensStudioSetsNodeNames.GlobalDarkest]: {},
  [TokensStudioSetsNodeNames.GlobalWireframe]: {},
  [TokensStudioSetsNodeNames.GlobalDesktop]: {},
  [TokensStudioSetsNodeNames.GlobalMobile]: {},
  [TokensStudioSetsNodeNames.SpectrumCore]: {},
  [TokensStudioSetsNodeNames.SpectrumLight]: {},
  [TokensStudioSetsNodeNames.SpectrumDark]: {},
  [TokensStudioSetsNodeNames.SpectrumDarkest]: {},
  [TokensStudioSetsNodeNames.SpectrumWireframe]: {},
  [TokensStudioSetsNodeNames.SpectrumDesktop]: {},
  [TokensStudioSetsNodeNames.SpectrumMobile]: {},
  [TokensStudioSetsNodeNames.ExpressCore]: {},
  [TokensStudioSetsNodeNames.ExpressLight]: {},
  [TokensStudioSetsNodeNames.ExpressDark]: {},
  [TokensStudioSetsNodeNames.ExpressDarkest]: {},
  [TokensStudioSetsNodeNames.ExpressWireframe]: {},
  [TokensStudioSetsNodeNames.ExpressDesktop]: {},
  [TokensStudioSetsNodeNames.ExpressMobile]: {},
};

// additional data for token studio,
// .e.g. set order
let additionalTokenStudioData = {
  $themes: [],
  $metadata: {
    tokenSetOrder: [
      TokensStudioSetsNodeNames.GlobalCore,
      TokensStudioSetsNodeNames.GlobalLight,
      TokensStudioSetsNodeNames.GlobalDark,
      TokensStudioSetsNodeNames.GlobalDarkest,
      TokensStudioSetsNodeNames.GlobalWireframe,
      TokensStudioSetsNodeNames.GlobalDesktop,
      TokensStudioSetsNodeNames.GlobalMobile,
      TokensStudioSetsNodeNames.SpectrumCore,
      TokensStudioSetsNodeNames.SpectrumLight,
      TokensStudioSetsNodeNames.SpectrumDark,
      TokensStudioSetsNodeNames.SpectrumDarkest,
      TokensStudioSetsNodeNames.SpectrumWireframe,
      TokensStudioSetsNodeNames.SpectrumDesktop,
      TokensStudioSetsNodeNames.SpectrumMobile,
      TokensStudioSetsNodeNames.ExpressCore,
      TokensStudioSetsNodeNames.ExpressLight,
      TokensStudioSetsNodeNames.ExpressDark,
      TokensStudioSetsNodeNames.ExpressDarkest,
      TokensStudioSetsNodeNames.ExpressWireframe,
      TokensStudioSetsNodeNames.ExpressDesktop,
      TokensStudioSetsNodeNames.ExpressMobile,
    ],
  },
};

/**
 * https://docs.tokens.studio/available-tokens/available-tokens
 *
 * @type {{BORDER_RADIUS: string, FONT_WEIGHTS: string, FONT_SIZES: string, OPACITY: string, LETTER_SPACING: string, SIZING: string, TEXT_DECORATION: string, DIMENSION: string, FONT_FAMILIES: string, COLOR: string, TYPOGRAPHY: string, TEXT_CASE: string, LINE_HEIGHTS: string, BORDER_WIDTH: string, SPACING: string}}
 */
const TYPE = {
  /**
   * Radius tokens give you the possibility to define values for your border radius. You can either create a single
   * value token or define multiple border radii in a token.
   * https://docs.tokens.studio/available-tokens/border-radius-tokens
   */
  BORDER_RADIUS: "borderRadius",

  /**
   * You can create tokens that define the border width of a layer. The value of this token would be a dimension,
   * either unitless or with a unit such as px or rem.
   * https://docs.tokens.studio/available-tokens/border-width-tokens
   */
  BORDER_WIDTH: "borderWidth",

  /**
   * Color tokens make up a big part of Tokens Studio for Figma, as they're so tightly integrated with Figma's styles
   * but give you options that Styles don't offer (yet).
   * https://docs.tokens.studio/available-tokens/color-tokens
   */
  COLOR: "color",

  /**
   * You can use the Dimension token to define an amount of distance and can be used in a wide range of applications.
   * The dimension token is always bound to a specific unit, either px or rem.
   *
   * To apply a dimension token, you can right click the token and select the application where you want to use
   * the dimension. This can either be:
   *
   * Spacing
   * Sizing
   * Border radius
   * Border width
   * Background blur
   *
   * https://docs.tokens.studio/available-tokens/dimension-tokens
   */
  DIMENSION: "dimension",

  /**
   * You can define your font family as a single value or also as a comma-separated list.
   * The plugin will try each of these, and if it finds one that works, takes this one
   *
   * https://docs.tokens.studio/available-tokens/typography-tokens
   */
  FONT_FAMILIES: "fontFamilies",

  /***
   * Font weights are defined using strings such as Regular or Bold and are applied in combination with a
   * fontFamily token (or as part of a typography token) We also provide a way to support numerical weights
   * such as 400, 600 - however due to the fact that Figma doesn't let us set a font weight by using these numbers
   * we had to implement a mapping that gets this right for the majority of fonts, but it could be that this mapping
   * doesn't work for your case. You can always use the exact string that's available
   * inside Figma's font choice (e.g. font family Inter with a weight of Bold).
   *
   * https://docs.tokens.studio/available-tokens/typography-tokens
   */
  FONT_WEIGHTS: "fontWeights",

  /**
   * https://docs.tokens.studio/available-tokens/typography-tokens
   */
  FONT_SIZES: "fontSizes",

  /**
   * https://docs.tokens.studio/available-tokens/typography-tokens
   */
  LETTER_SPACING: "letterSpacing",

  /**
   * https://docs.tokens.studio/available-tokens/typography-tokens
   */
  LINE_HEIGHTS: "lineHeights",

  /**
   * You can create tokens that define the opacity value of a layer.
   *
   * https://docs.tokens.studio/available-tokens/opacity-tokens
   */
  OPACITY: "opacity",

  /**
   * You can create tokens that define the width, height (or both values) of a layer.
   * One thing to keep in mind is that in Figma you cannot alter the width of a layer inside an instance,
   * not even plugins can do that.
   * https://docs.tokens.studio/available-tokens/sizing-tokens
   */
  SIZING: "sizing",

  /**
   * Spacing tokens give you the ability to define values for Auto Layout that you can reuse.
   * Once you applied a spacing token to a layer, it will get updated whenever you change that token,
   * so any layer containing a reference to {spacing.container} will get updated, when you update that specific token.
   * https://docs.tokens.studio/available-tokens/spacing-tokens
   */
  SPACING: "spacing",

  /**
   * https://docs.tokens.studio/available-tokens/typography-tokens
   */
  TEXT_CASE: "textCase",

  /**
   * https://docs.tokens.studio/available-tokens/typography-tokens
   */
  TEXT_DECORATION: "textDecoration",

  /**
   * A typography token is a composite token consisting of a few parameters that make up a type definition.
   * We also have individual token types for each of these options, as you can apply them individually as well.
   * However, in order to create styles, you'd have to use a Typography token.
   *
   * https://docs.tokens.studio/available-tokens/typography-tokens
   */
  TYPOGRAPHY: "typography",
};

const JSON_SET_NODE_NAMES = {
  SPECTRUM: "spectrum",
  EXPRESS: "express",
  LIGHT: "light",
  DARK: "dark",
  DARKEST: "darkest",
  WIREFRAME: "wireframe",
  MOBILE: "mobile",
  DESKTOP: "desktop",
  VALUE: "value",
  COMPONENT: "component",
  SETS: "sets",
};

/**
 * files that go in
 * @type {string[]}
 */
const files = [
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

function debug(msg) {
  const debugIt = true;
  if (debugIt) {
    console.log(msg.toString() || msg);
  }
}

/**
 * get converted alias if exists, otherwise return value untouched
 *
 * @param value value to check for existing conversion
 * @return {string} value converted or untouched
 */
const getConvertedTokenValue = (value) => {
  const isAlias = value.startsWith("{") && value.endsWith("}");
  if (isAlias) {
    const pureAlias = value.slice(1, -1);
    debug(pureAlias);
    if (convertedKeysToAlias.has(pureAlias)) {
      debug("Found converted token: " + convertedKeysToAlias.get(pureAlias));
      return `{${convertedKeysToAlias.get(pureAlias)}}`;
    }
  }

  return value;
};

/**
 * try to define a token type by gathering information from the key (or value)
 * not good... needed until all tokens are tagged by design
 *
 * @param key
 * @param value
 * @return {string} type of token
 */
const getTypeByKeyOrValue = (key, value) => {
  // font section first
  // find font-family
  if (
    key.indexOf("font-family") !== -1 ||
    value.indexOf("font-family") !== -1
  ) {
    return TYPE.FONT_FAMILIES;
  }
  // find font-weight
  else if (
    key.indexOf("font-weight") !== -1 ||
    value.indexOf("font-weight") !== -1
  ) {
    return TYPE.FONT_WEIGHTS;
  }
  // find font-size
  else if (
    key.indexOf("font-size") !== -1 ||
    value.indexOf("font-size") !== -1
  ) {
    return TYPE.FONT_SIZES;
  }
  // find line-height
  else if (
    key.indexOf("line-height") !== -1 ||
    value.indexOf("line-height") !== -1
  ) {
    return TYPE.LINE_HEIGHTS;
  }
  // find letter-spacing
  else if (
    key.indexOf("letter-spacing") !== -1 ||
    value.indexOf("letter-spacing") !== -1
  ) {
    return TYPE.LETTER_SPACING;
  }

  // spacing section next

  // find key with border-radius or corner-radius:
  if (key.indexOf("radius") !== -1) {
    return TYPE.BORDER_RADIUS;
  }
  // find key with *border-width*
  else if (key.indexOf("border-width") !== -1) {
    return TYPE.BORDER_WIDTH;
  }
  // find key with *height* or *size* // omg: exclude font-size
  else if (
    (key.indexOf("height") !== -1 || key.indexOf("size") !== -1) &&
    key.indexOf("font-size") === -1
  ) {
    return TYPE.SIZING;
  }
  // find key with opacity; exclude opacity-checkerboard
  else if (
    key.indexOf("opacity") !== -1 &&
    key.indexOf("opacity-checkerboard") === -1
  ) {
    return TYPE.OPACITY;
  }

  // color section

  if (
    // exclude section
    // exclude *-color-opacity
    (key.indexOf("-color-opacity") === -1 ||
      key.indexOf("color-loupe-height") === -1 ||
      key.indexOf("color-loupe-width") === -1 ||
      key.indexOf("color-area-border-opacity") === -1 ||
      key.indexOf("color-slider-border-opacity") === -1 ||
      key.indexOf("color-loupe-drop-shadow-y") === -1 ||
      key.indexOf("color-loupe-drop-shadow-blur") === -1 ||
      key.indexOf("color-loupe-inner-border") === -1 ||
      key.indexOf("color-loupe-outer-border") === -1 ||
      key.indexOf("color-control-track-width") === -1 ||
      key.indexOf("card-selection-background-color-opacity") === -1) &&
    // find value starting with "rgb" or key contains 'color',
    // TODO: look for the type of the alias source maybe?!
    ((value && value.indexOf("rgb") === 0) || key.indexOf("-color") !== -1)
  ) {
    return TYPE.COLOR;
  }

  // default type 'spacing'
  return TYPE.SPACING;
};

/**
 * generic storing helper
 *
 * @param target json
 * @param {string} key key
 * @param entry value data object with "value" and "type" property}
 * @param [component] component group (optional)
 */
const storeToken = (target, key, entry, component) => {
  debug(
    "---------------------------------------------------------------------------------",
  );
  debug(
    `storeToken component: ${component}, key: ${key}, entry: ${JSON.stringify(
      entry,
    )}`,
  );

  // store key for mapping new alias
  let pristineKey = key;

  // store convertedKey for mapping aliases
  let convertedToken;

  // split entry if token has numeric info and "dash syntax", e.g. gray-100
  const tokenWithNumberRegex = /^(.+)(?:-)(\d+$)/;
  const tokenNumericMatch = key.match(tokenWithNumberRegex);
  if (tokenNumericMatch && tokenNumericMatch[1] && tokenNumericMatch[2]) {
    const baseToken = tokenNumericMatch[1];
    const numericValue = tokenNumericMatch[2];

    // convert token for alias replacement
    convertedToken = component
      ? // safe nested group token alias (e.g. thumbnail-size-500' -> 'thumbnail.thumbnail-size.500')
        component + "." + baseToken + "." + numericValue
      : // otherwise safe nested value (gray-100 -> 'gray.100') or (accent-color-100 -> accent-color.100)
        baseToken + "." + numericValue;

    debug("new convertedToken : " + JSON.stringify(convertedToken));

    // store converted keys / entries
    convertedKeysToAlias.set(key, convertedToken);

    // overwrite / extend key and entry
    const convertedEntry = Object.assign(
      {},
      {
        [numericValue]: entry,
      },
    );
    key = baseToken;
    entry = convertedEntry;

    debug("new key: " + key);
    debug("new entry: " + JSON.stringify(entry));
  }

  // split entry if token has size info and "dash syntax", e.g. field-top-to-alert-icon-large
  // workaround 'large vs extra-large' 'small vs extra-small' regex issue
  const tokenWithExtraSizeRegex = /^(.+)(?:-)(extra-small|extra-large)$/;
  // another bad decision: to fetch the "extra" sizes properly
  const tokenExtraSizeMatch = key.match(tokenWithExtraSizeRegex);

  const tokenWithSizeRegex =
    /^(.+)(?:-)((small|medium|large)|(xxxs|xxs|xs|s|m|l|xl|xxl|xxxl))$/;
  const tokenSizeMatch = key.match(tokenWithSizeRegex);
  if (
    (tokenExtraSizeMatch && tokenExtraSizeMatch[1] && tokenExtraSizeMatch[2]) ||
    (tokenSizeMatch && tokenSizeMatch[1] && tokenSizeMatch[2])
  ) {
    let baseToken =
      (tokenExtraSizeMatch && tokenExtraSizeMatch[1]) ||
      (tokenSizeMatch && tokenSizeMatch[1]);
    let sizeValue =
      (tokenExtraSizeMatch && tokenExtraSizeMatch[2]) ||
      (tokenSizeMatch && tokenSizeMatch[2]);

    if (convertedToken) {
      debug("already converted token: " + convertedToken);
      debug(JSON.stringify(convertedToken));
    } else {
      debug("convert for size");
      // convert token for size replacement, size is always at the end
      convertedToken = component
        ? component + "." + baseToken + "." + sizeValue
        : // safe nested group token alias (e.g. field-top-to-alert-icon-large' -> 'field-top-to-alert-icon.large')
          baseToken + "." + sizeValue;
      debug("new converted token: " + convertedToken);
    }

    // store converted keys / entries
    convertedKeysToAlias.set(pristineKey, convertedToken);

    // overwrite / extend key and entry
    const convertedEntry = Object.assign(
      {},
      {
        [sizeValue]: entry,
      },
    );
    key = baseToken;
    entry = convertedEntry;
    debug("new key: " + key);
    debug("new entry : " + JSON.stringify(entry));
  }

  // split entry if token has semantic info and "dash syntax",
  //   e.g. neutral-content-color-default -> neutral.content-color-default
  //   e.g. neutral-visual-color -> neutral.visual-color
  //   e.g. disabled-background-color -> disabled.background-color
  const tokenWithSemanticRegex =
    /^(neutral|disabled|accent|informative|negative|positive|notice)(?:-)(.+)/;
  const tokenSemanticMatch = key.match(tokenWithSemanticRegex);
  // BUT NOT: positive-color.100
  const skipTokenWithSemanticRegex =
    /^(neutral|disabled|accent|informative|negative|positive|notice)(-color)(?:-)(.+)/;
  const skipTokenSemanticMatch = key.match(skipTokenWithSemanticRegex);
  console.log({ key });
  console.log({ skipTokenSemanticMatch });
  if (
    skipTokenSemanticMatch == null &&
    tokenSemanticMatch &&
    tokenSemanticMatch[1] &&
    tokenSemanticMatch[2]
  ) {
    let semanticValue = tokenSemanticMatch[1];
    let restToken = tokenSemanticMatch[2];
    debug("convert semantic");
    // was converted before
    if (convertedToken) {
      debug("already converted token to : " + JSON.stringify(convertedToken));
      // accent-color.100 should stay accent-color.100
      debug(JSON.stringify(convertedToken));
    } else {
      // safe nested group token alias (e.g. neutral-content-color-default' -> 'neutral.content-color-default')
      debug("not converted token before");
      // for semantic replacement, semantic is always at the start
      convertedToken = component
        ? component + "." + semanticValue + "." + restToken
        : semanticValue + "." + restToken;

      debug("modified converted token to: " + convertedToken);
      // store converted keys / entries
      convertedKeysToAlias.set(key, convertedToken);
      // overwrite / extend key and entry
      const convertedEntry = Object.assign(
        {},
        {
          [restToken]: entry,
        },
      );
      key = semanticValue;
      entry = convertedEntry;

      debug("new key: " + key);
      debug("new entry : " + JSON.stringify(entry));
    }
  }

  // split/group token if name is matching keywords, like 'background-color', 'border-color', 'content-color',
  const tokenWithKeywordsRegex =
    /((.+)(?:-))?(static-black|static-white|background-color|background-opacity|border-color|border-opacity|content-color|visual-color)((?:-)(.+))?/;

  let groupName;
  let preGroupKey;
  let postGroupKey;

  // look into original key name
  const tokenKeywordMatch = pristineKey.match(tokenWithKeywordsRegex);
  if (tokenKeywordMatch) {
    preGroupKey = tokenKeywordMatch[2];
    groupName = tokenKeywordMatch[3];
    postGroupKey = tokenKeywordMatch[5];

    console.log({ groupName });
    console.log({ preGroupKey });
    console.log({ postGroupKey });

    debug(
      `found token group in: ${pristineKey}; rewriting token to group ${groupName}`,
    );

    // if modified before pristine key != key
    if (convertedToken) {
      // e.g. neutral.content-color.default-> neutral.content-color.default
      // disabled.static-white-background-color -> disabled.static-white.background-color
      debug("modify converted token: " + convertedToken);
      convertedToken = convertedToken
        .replace(groupName + "-", groupName + ".")
        .replace("-" + groupName, "." + groupName);
    } else {
      // nested group token alias (e.g. indigo-background-color-default' -> 'indigo.background-color.default')
      debug("converted token created via pristine key?! : " + pristineKey);
      convertedToken = pristineKey
        .replace("-" + groupName + "-", "." + groupName + ".")
        .replace(groupName + "-", groupName + ".")
        .replace("-" + groupName, "." + groupName);
    }

    convertedToken = component
      ? component + "." + convertedToken
      : convertedToken;
    debug("converted token modified: " + convertedToken);
    // store converted keys / entries
    convertedKeysToAlias.set(pristineKey, convertedToken);

    // now scan the innerEntry for the groupName..
    const foundGroupNameInEntry = Object.entries(entry).find((innerEntry) => {
      return innerEntry[0].indexOf(groupName) !== -1;
    });

    // group name can be in key or in entry,
    // key can be:
    // e.g. 'cyan-background-color-default' -> 'cyan.background-color.default'
    if (key.indexOf(groupName) !== -1) {
      debug("found in key: ", key);
      // modified key before, e.g.  notice.background-color-default
      if (pristineKey != key) {
        // convert key
        const splitKey = key
          .replace("-" + groupName + "-", "-")
          .replace(groupName + "-", "")
          .replace("-" + groupName, "");
        key = splitKey;
        debug("new key: " + key);
        entry = Object.assign(
          {},
          {
            [groupName]: entry,
          },
        );
      }
      // not modified key before, e.g. background-color-default
      else {
        let splitEntry = entry;
        // split entry by postGroup e.g. background-color.default
        if (postGroupKey) {
          splitEntry = Object.assign(
            {},
            {
              [postGroupKey]: entry,
            },
          );
        }

        // split key by preGroup
        let splitKey;
        if (preGroupKey) {
          splitKey = preGroupKey;
          splitEntry = Object.assign(
            {},
            {
              [groupName]: splitEntry,
            },
          );
        } else {
          // no preGroup
          splitKey = groupName;
        }

        key = splitKey;
        entry = splitEntry;
        debug("new key: " + key);
        debug("new entry: " + JSON.stringify(entry));
      }
    }
    // entry can be
    // e.g. 'content-color-default' -> ' content-color.default'
    // e.g. 'static-black-background-color'-> 'static-black.background-color'
    //   visual-color
    else if (entry && foundGroupNameInEntry) {
      debug(`found in entry: ${JSON.stringify(foundGroupNameInEntry)}`);
      // convert entry
      const entryKey = foundGroupNameInEntry[0];
      let entryValue = foundGroupNameInEntry[1];

      // e.g disabled-content-color
      if (entryKey == groupName) {
        debug("already split by groupName");
      } else {
        // works for: notice.background-color-default
        // or negative-border-color-key-focus
        // but not for static-black-background-color
        const splitEntryKey = entryKey
          .replace("-" + groupName + "-", "-")
          .replace(groupName + "-", "")
          .replace("-" + groupName, "");

        // split entry if postGroup match, e.g. border-color-default
        if (postGroupKey) {
          debug("postGroupKey match");
          entryValue = Object.assign(
            {},
            {
              [postGroupKey]: entryValue,
            },
          );
          debug("split entryValue: " + JSON.stringify(entryValue));
        }

        if (splitEntryKey === postGroupKey) {
          debug("already split up");
          entryValue = Object.assign(
            {},
            {
              [groupName]: entryValue,
            },
          );
        } else {
          // split entry if entryKey starts with match, e.g. // does start with groupName ,e.g. 'border-color-focus'
          if (entryKey.startsWith(groupName)) {
            debug("startwidth  match");
            entryValue = Object.assign(
              {},
              {
                [groupName]: {
                  [splitEntryKey]: entryValue,
                },
              },
            );
          }
          // does not start with groupName ,e.g. static-black-background-color
          else {
            debug("not startwidth match");
            // overwrite / extend key and entry
            entryValue = Object.assign(
              {},
              {
                [splitEntryKey]: {
                  [groupName]: entryValue,
                },
              },
            );
          }
        }
        entry = entryValue;

        debug("new entry : " + JSON.stringify(entry));
      }
    }
  }

  debug(`really store key: ${key} with entry: ${JSON.stringify(entry)}`);

  // for nested component groups...
  if (component) {
    // (if not already done before like heading.heading-size-m) safe nested group token alias, e.g.
    //   color-handle-inner-border-width -> color-handle.color-handle-inner-border-width
    if (key == pristineKey) {
      const convertedNestedAlias = component + "." + key;
      convertedKeysToAlias.set(key, convertedNestedAlias);
    }
    debug(`store with nested component group: ${component}`);
    // create new nested entry for group named by component
    const groupJson = {
      [key]: entry,
    };
    target[component] = _.merge(target[component], groupJson);
  } else {
    // default: safe token in no nested group
    target[key] = _.merge(target[key], entry);
  }
};

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
    const currentValue = getConvertedTokenValue(
      set[JSON_SET_NODE_NAMES.MOBILE].value,
    );
    const mobileTokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetMobile, key, mobileTokenEntry, component);
  }
  if (_.has(set, JSON_SET_NODE_NAMES.DESKTOP)) {
    const currentValue = getConvertedTokenValue(
      set[JSON_SET_NODE_NAMES.DESKTOP].value,
    );
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
    let currentValue = getConvertedTokenValue(
      set[JSON_SET_NODE_NAMES.LIGHT][JSON_SET_NODE_NAMES.VALUE],
    );
    const tokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetLight, key, tokenEntry, component);
  }

  if (_.has(set, JSON_SET_NODE_NAMES.DARK)) {
    let currentValue = getConvertedTokenValue(
      set[JSON_SET_NODE_NAMES.DARK][JSON_SET_NODE_NAMES.VALUE],
    );
    const tokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetDark, key, tokenEntry, component);
  }

  if (_.has(set, JSON_SET_NODE_NAMES.DARKEST)) {
    let currentValue = getConvertedTokenValue(
      set[JSON_SET_NODE_NAMES.DARKEST][JSON_SET_NODE_NAMES.VALUE],
    );
    const tokenEntry = {
      value: currentValue,
      type: getTypeByKeyOrValue(key, currentValue),
    };
    storeToken(targetDarkest, key, tokenEntry, component);
  }

  if (_.has(set, JSON_SET_NODE_NAMES.WIREFRAME)) {
    let currentValue = getConvertedTokenValue(
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
      const currentValue = getConvertedTokenValue(
        expressNode[JSON_SET_NODE_NAMES.VALUE],
      );
      const expressTokenEntry = {
        value: currentValue,
        type: getTypeByKeyOrValue(key, currentValue),
      };
      storeToken(expressJson, key, expressTokenEntry, component);
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
      const currentValue = getConvertedTokenValue(
        spectrumNode[JSON_SET_NODE_NAMES.VALUE],
      );
      const spectrumTokenEntry = {
        value: currentValue,
        type: getTypeByKeyOrValue(key, currentValue),
      };
      storeToken(spectrumJson, key, spectrumTokenEntry, component);
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
 * for simple global values, like:
 *
 *   "android-elevation": {
 *     "value": "2dp"
 *   },
 *
 * or
 *
 *   "picker-minimum-width-multiplier": {
 *     "component": "picker",
 *     "value": "2"
 *   },
 *
 * or
 *
 *   "black": {
 *     "value": "rgb(0, 0, 0)"
 *   },
 *
 * @param key
 * @param value
 * @param [component]
 */
const storeGlobalValue = (key, value, component = undefined) => {
  debug("found global key / value: " + key + "/" + value);
  const currentValue = getConvertedTokenValue(value);
  const globalToken = {
    value: currentValue,
    type: getTypeByKeyOrValue(key, currentValue),
  };

  storeToken(globalJson, key, globalToken, component);
};

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
    // store component data...
    allGroupNodes.add(component);
  }

  // look for a value in the first level -> global token found
  if (_.has(entry, JSON_SET_NODE_NAMES.VALUE)) {
    // e.g. a global value
    storeGlobalValue(key, entry[JSON_SET_NODE_NAMES.VALUE], component);
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

const resetWorkingJson = () => {
  // reset jsons
  globalJson = {};
  globalLightJson = {};
  globalDarkJson = {};
  globalDarkestJson = {};
  globalWireframeJson = {};
  globalMobileJson = {};
  globalDesktopJson = {};
  globalMobileJson = {};

  expressJson = {};
  expressLightJson = {};
  expressDarkJson = {};
  expressDarkestJson = {};
  expressWireframeJson = {};
  expressDesktopJson = {};
  expressMobileJson = {};

  spectrumJson = {};
  spectrumLightJson = {};
  spectrumDarkJson = {};
  spectrumDarkestJson = {};
  spectrumWireframeJson = {};
  spectrumDesktopJson = {};
  spectrumMobileJson = {};
};

const mergeWorkingJson = () => {
  // merge data into token studio data
  completeTokenData[TokensStudioSetsNodeNames.GlobalCore] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.GlobalCore],
    globalJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.GlobalLight] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.GlobalLight],
    globalLightJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.GlobalDark] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.GlobalDark],
    globalDarkJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.GlobalDarkest] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.GlobalDarkest],
    globalDarkestJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.GlobalWireframe] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.GlobalWireframe],
    globalWireframeJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.GlobalDesktop] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.GlobalDesktop],
    globalDesktopJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.GlobalMobile] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.GlobalMobile],
    globalMobileJson,
  );

  completeTokenData[TokensStudioSetsNodeNames.SpectrumCore] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.SpectrumCore],
    spectrumJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.SpectrumLight] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.SpectrumLight],
    spectrumLightJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.SpectrumDark] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.SpectrumDark],
    spectrumDarkJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.SpectrumDarkest] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.SpectrumDarkest],
    spectrumDarkestJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.SpectrumWireframe] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.SpectrumWireframe],
    spectrumWireframeJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.SpectrumDesktop] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.SpectrumDesktop],
    spectrumDesktopJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.SpectrumMobile] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.SpectrumMobile],
    spectrumMobileJson,
  );

  completeTokenData[TokensStudioSetsNodeNames.ExpressCore] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.ExpressCore],
    expressJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.ExpressLight] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.ExpressLight],
    expressLightJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.ExpressDark] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.ExpressDark],
    expressDarkJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.ExpressDarkest] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.ExpressDarkest],
    expressDarkestJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.ExpressWireframe] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.ExpressWireframe],
    expressWireframeJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.ExpressDesktop] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.ExpressDesktop],
    expressDesktopJson,
  );
  completeTokenData[TokensStudioSetsNodeNames.ExpressMobile] = _.merge(
    completeTokenData[TokensStudioSetsNodeNames.ExpressMobile],
    expressMobileJson,
  );
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

  for (const file of files) {
    console.log(file);
    console.log(path.join(process.cwd(), "..", file));
    const jsonData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), file), "utf-8"),
    );
    gatherTokenFromJson(jsonData);
  }

  // finalize json
  completeTokenData = _.merge(completeTokenData, additionalTokenStudioData);

  // write data
  await writeFile(destFile, JSON.stringify(completeTokenData, null, 2));
  console.log(
    `Wrote ${destFile} with ${Object.keys(completeTokenData).length} entries.`,
  );

  console.log(convertedKeysToAlias.get("accent-color-100"));
  //
  // console.log({allGroupNodes});

  // test data
  // todo: apply token type of alias source to alias ?

  // todo: check if an alias is used before it is defined...

  // todo: check if a token is referenced by alias and types do not match

  // todo: check if a token is referencing a token, that does not exists (or the syntax is wrong, dash vs period notation)?
};

await main();
