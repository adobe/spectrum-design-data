import { debug } from "./debug.js";

// map style-dictionary tokens 'keys' to tokens studio alias syntax, like
//   gray-100 -> gray.100
//   heading-size-m -> heading.heading-size-m
//   thumbnail-size-500 -> thumbnail.thumbnail-size.500
export let convertedKeysToAlias = new Map();

/**
 * get converted alias if exists, otherwise return value untouched
 *
 * @param value value to check for existing conversion
 * @return {string} value converted or untouched
 */
export const getTokenAlias = (value) => {
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

export function storeTokenAlias(key, alias) {
  debug(`Store Token ${key} as alias ${alias}`);
  convertedKeysToAlias.set(key, alias);
}
