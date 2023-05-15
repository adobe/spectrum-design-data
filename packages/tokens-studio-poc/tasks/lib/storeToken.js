import { debug, debugTable } from "./debug.js";
import _ from "lodash";
import { storeTokenAlias } from "./alias.js";

const storeWorkingKeyAlias = (
  preGroupKey,
  groupName,
  postGroupKey,
  pristineKey,
  workingKey,
  component,
) => {
  let convertedToken;

  // nested group token alias, e.g.
  //   indigo-background-color-default' -> 'indigo.background-color.default')
  //   heading-size-s' -> 'heading-size.s')
  if (preGroupKey && postGroupKey) {
    convertedToken = preGroupKey + "." + groupName + "." + postGroupKey;
  } else if (preGroupKey) {
    convertedToken = preGroupKey + "." + groupName;
  } else if (postGroupKey) {
    convertedToken = groupName + "." + postGroupKey;
  } else {
    throw Error("storeWorkingKeyAlias failed");
  }

  // attach with component group
  // e.g. heading-size-s' -> 'heading.heading-size.s')
  // but not
  //   code-font-family -> code.code.font-family
  if (component && component !== convertedToken.split(".")[0]) {
    convertedToken = component + "." + convertedToken;
    debug(`Storing token alias with extra component group ${convertedToken}`);
  }

  debug(`Converted token modified to ${convertedToken}`);
  // store converted keys / entries
  storeTokenAlias(pristineKey, convertedToken);
};

/**
 *
 * @param pristineKey
 * @param entry
 * @param component
 * @return {{convertedEntry, convertedKey}}
 */
const splitTokenByKeyword = (pristineKey, entry, component) => {
  // split entry if token has numeric info and "dash syntax", e.g. gray-100
  const tokenWithNumberRegex = /^(.+)(?:-)(\d+$)/;

  // split entry if token has size info and "dash syntax", e.g. field-top-to-alert-icon-large
  // workaround 'large vs extra-large' 'small vs extra-small' regex issue
  const tokenWithExtraSizeRegex = /^(.+)(?:-)(extra-(small|large))$/;

  const tokenWithSizeRegex =
    /^(.+)(?:-)((small|medium|large)|(xxxs|xxs|xs|s|m|l|xl|xxl|xxxl))$/;

  // split entry if token has semantic info and "dash syntax",
  //   e.g. neutral-content-color-default -> neutral.content-color-default
  //   e.g. neutral-visual-color -> neutral.visual-color
  //   e.g. disabled-background-color -> disabled.background-color
  const tokenWithSemanticRegex =
    /^(neutral|disabled|accent|informative|negative|positive|notice)(?:-)(.+)/;

  // BUT NOT: positive-color.100
  const skipTokenWithSemanticRegex =
    /^(neutral|disabled|accent|informative|negative|positive|notice)(-color)(?:-)(.+)/;

  const skipTokenWithFontStuffRegex =
    /^(small|medium|large)(-font-weight)(?:-)(.+)/;

  // do not split 'opacity-checkerboard'
  const skipTokenWithKeywordsRegex = /^(opacity-checkerboard)((?:-)(.+))?/;

  // split/group token if name is matching keywords, like 'background-color', 'border-color', 'content-color',
  const tokenWithKeywordsFirstPriorityRegex =
    /((.+)(?:-))?(static-black|static-white|background-color|background-opacity|base-color|border-color|border-opacity|content-color|visual-color)((?:-)(.+))?/;
  // split/group token if name is matching keywords, like 'background-color', 'border-color', 'content-color',
  const tokenWithKeywordsSecondPriorityRegex =
    /((.+)(?:-))?(background|opacity)((?:-)(.+))?/;

  // e.g.
  //   heading.sans-serif.m
  //   heading.serif.strong-emphasized.xxl
  //   heading.cjk.heavy.emphasized.l
  //   heading.serif.light.strong.xs
  //   heading-cjk-heavy-strong-emphasized-font-weight -> heading.cjk.heavy.strong-emphasized.font-weight
  // but not
  //   status-light.*
  const skipTokenWithTypographyKeywordsRegex = /^(status-light)((?:-)(.+))?/;

  // special reg-ex needed for force match keywords that are using '-' as separator.
  const tokenWithTypographyKeywordsFirstPriorityRegex =
    /((.+)(?:-))?(cjk|light|heavy|strong-emphasized|sans-serif|font-family|font-weight|font-style)((?:-)(.+))?/;

  // no need to split "heading|body|code|detail", cause those are done via "component": "heading|body|code|detail" entry
  const tokenWithTypographyKeywordsSecondPriorityRegex =
    /((.+)(?:-))?(cjk|light|heavy|strong|emphasized|serif|font-family|font-weight|font-style)((?:-)(.+))?/;

  let groupName;
  let preGroupKey;
  let postGroupKey;

  let workingKey = pristineKey;

  while (
    // global skip pattern
    workingKey.match(skipTokenWithFontStuffRegex) == null &&
    // match patterns

    // numeric
    (workingKey.match(tokenWithNumberRegex) ||
      // keywords
      (workingKey.match(skipTokenWithKeywordsRegex) == null &&
        (workingKey.match(tokenWithKeywordsFirstPriorityRegex) ||
          workingKey.match(tokenWithKeywordsSecondPriorityRegex))) ||
      // typography
      (workingKey.match(skipTokenWithTypographyKeywordsRegex) == null &&
        (workingKey.match(tokenWithTypographyKeywordsFirstPriorityRegex) ||
          workingKey.match(tokenWithTypographyKeywordsSecondPriorityRegex))) ||
      // semantic
      (workingKey.match(skipTokenWithSemanticRegex) == null &&
        workingKey.match(tokenWithSemanticRegex)) ||
      // size
      workingKey.match(tokenWithExtraSizeRegex) ||
      workingKey.match(tokenWithSizeRegex))
  ) {
    // look into working key name
    let tokenKeywordMatch;

    if (
      workingKey.match(tokenWithKeywordsFirstPriorityRegex) ||
      workingKey.match(tokenWithKeywordsSecondPriorityRegex) ||
      workingKey.match(tokenWithTypographyKeywordsFirstPriorityRegex) ||
      workingKey.match(tokenWithTypographyKeywordsSecondPriorityRegex) ||
      workingKey.match(tokenWithSemanticRegex)
    ) {
      tokenKeywordMatch =
        workingKey.match(tokenWithKeywordsFirstPriorityRegex) ||
        workingKey.match(tokenWithKeywordsSecondPriorityRegex) ||
        workingKey.match(tokenWithTypographyKeywordsFirstPriorityRegex) ||
        workingKey.match(tokenWithTypographyKeywordsSecondPriorityRegex) ||
        workingKey.match(tokenWithSemanticRegex);
      preGroupKey = tokenKeywordMatch[2];
      groupName = tokenKeywordMatch[3];
      postGroupKey = tokenKeywordMatch[5];
    }

    // overwrite matches with higher priority matched
    if (
      workingKey.match(tokenWithNumberRegex) ||
      workingKey.match(tokenWithExtraSizeRegex) ||
      workingKey.match(tokenWithSizeRegex)
    ) {
      tokenKeywordMatch =
        workingKey.match(tokenWithNumberRegex) ||
        workingKey.match(tokenWithExtraSizeRegex) ||
        workingKey.match(tokenWithSizeRegex);
      preGroupKey = tokenKeywordMatch[1];
      groupName = tokenKeywordMatch[2];
      postGroupKey = null;
    }
    // didn't find anything to split, exit loop
    if (
      (!preGroupKey && !postGroupKey) ||
      !groupName ||
      groupName === postGroupKey
    ) {
      // cancel loop
      // workingKey = '';
      debug("Exit loop.");
      break;
    }

    debug(
      `found keyword in: ${workingKey}; rewriting token to group ${groupName}`,
    );

    // store this key as alias
    storeWorkingKeyAlias(
      preGroupKey,
      groupName,
      postGroupKey,
      pristineKey,
      workingKey,
      component,
    );

    // now scan the innerEntry for the groupName...
    const foundGroupNameInEntry = Object.entries(entry).find((innerEntry) => {
      return innerEntry[0].indexOf(groupName) !== -1;
    });

    // console.log({foundGroupNameInEntry});

    // group name can be in key; key can be:
    // e.g. 'cyan-background-color-default' -> 'cyan.background-color.default'
    if (workingKey.indexOf(groupName) !== -1) {
      debug(`found in workingKey: ${workingKey}`);
      debug(`pristineKey: ${pristineKey}`);

      // modified key before, e.g.  notice.background-color-default
      if (workingKey !== pristineKey) {
        debug(`split workingKey: ${workingKey}`);
        // convert workingKey and overwrite workingKey
        workingKey = workingKey
          .replace("-" + groupName + "-", "-")
          .replace(groupName + "-", "")
          .replace("-" + groupName, "");
        debug(`new workingKey: ${workingKey}`);
        // overwrite entry
        entry = Object.assign(
          {},
          {
            [groupName]: entry,
          },
        );
        debug(`new entry: ${JSON.stringify(entry)}`);
      }
      // not modified key before, e.g. background-color-default
      else {
        debug(`split entry: ${JSON.stringify(entry)}`);
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
        debug(`split workingKey: ${workingKey}`);
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

        workingKey = splitKey;
        entry = splitEntry;
        debug(`new workingKey: ${workingKey}`);
        debug(`new entry: ${JSON.stringify(entry)}`);
      }
    }

    // group name can be in entry; entry can be
    // e.g. 'content-color-default' -> ' content-color.default'
    // e.g. 'static-black-background-color'-> 'static-black.background-color'
    //   visual-color
    else if (entry && foundGroupNameInEntry) {
      debug(`found in entry: ${JSON.stringify(foundGroupNameInEntry)}`);
      // convert entry
      const entryKey = foundGroupNameInEntry[0];
      let entryValue = foundGroupNameInEntry[1];

      // e.g disabled-content-color
      if (entryKey === groupName) {
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
            debug("startsWith  match");
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
            debug("not startsWith match");
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

  // if (workingKey == 'heading' && groupName === 'sans-serif' && postGroupKey == 'light-strong-font-weight') {process.exit(0)}
  //
  // debug("return workingKey: " + workingKey);
  // debug("return entry: " + JSON.stringify(entry));

  return { convertedKey: workingKey, convertedEntry: entry };
};

/**
 * generic storing helper
 *
 * @param targetJson json
 * @param {string} key key
 * @param entry value data object with "value" and "type" property
 * @param [component] component group (optional)
 */
export const storeToken = (targetJson, key, entry, component) => {
  debug(
    "---------------------------------------------------------------------------------",
  );
  debug(
    `storing component: "${component}", key: "${key}", entry: ${JSON.stringify(
      entry,
    )}...`,
  );

  // preserve key for mapping new alias
  let pristineKey = key;

  let { convertedKey, convertedEntry } = splitTokenByKeyword(
    pristineKey,
    entry,
    component,
  );

  debug(
    `really store key: "${convertedKey}" with entry: ${JSON.stringify(
      convertedEntry,
    )}`,
  );

  // for nested component groups:
  if (component) {
    // if not already split before before (like heading.heading-size-m), safe nested group token alias,
    // e.g.
    //   color-handle-inner-border-width -> color-handle.color-handle-inner-border-width
    if (convertedKey === pristineKey) {
      debug(`store extra component group: ${component}`);
      const convertedNestedAlias = component + "." + convertedKey;
      storeTokenAlias(convertedKey, convertedNestedAlias);
    }
    // if key was already split up, so that the component name is first part, don't split extra component group
    if (convertedKey !== component) {
      debug(`store with nested component group: ${component}`);
      // create new nested entry for group named by component
      const groupJson = {
        [convertedKey]: convertedEntry,
      };
      targetJson[component] = _.merge(targetJson[component], groupJson);
    } else {
      // default: safe token in no nested group
      targetJson[convertedKey] = _.merge(
        targetJson[convertedKey],
        convertedEntry,
      );
    }
  } else {
    // default: safe token in no nested group
    targetJson[convertedKey] = _.merge(
      targetJson[convertedKey],
      convertedEntry,
    );
  }
  debug("DONE");
  debug(
    "---------------------------------------------------------------------------------",
  );
};
