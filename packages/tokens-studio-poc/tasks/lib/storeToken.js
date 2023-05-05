import { debug } from "./debug.js";
import _ from "lodash";
import { storeTokenAlias } from "./alias.js";

/**
 * generic storing helper
 *
 * @param targetJson json
 * @param {string} key key
 * @param entry value data object with "value" and "type" property}
 * @param [component] component group (optional)
 */
export const storeToken = (targetJson, key, entry, component) => {
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
    storeTokenAlias(key, convertedToken);

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
    storeTokenAlias(pristineKey, convertedToken);

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
      storeTokenAlias(key, convertedToken);

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
    storeTokenAlias(pristineKey, convertedToken);

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
      storeTokenAlias(key, convertedNestedAlias);
    }
    debug(`store with nested component group: ${component}`);
    // create new nested entry for group named by component
    const groupJson = {
      [key]: entry,
    };
    targetJson[component] = _.merge(targetJson[component], groupJson);
  } else {
    // default: safe token in no nested group
    targetJson[key] = _.merge(targetJson[key], entry);
  }
};
