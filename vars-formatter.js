module.exports = function ({ dictionary, options }) {
  return dictionary.allTokens
    .map((token) => {
      let value = JSON.stringify(token.value);
      // new option added to decide whether or not to output references
      if (options.outputReferences) {
        // the `dictionary` object now has `usesReference()` and
        // `getReferences()` methods. `usesReference()` will return true if
        // the value has a reference in it. `getReferences()` will return
        // an array of references to the whole tokens so that you can access
        // their names or any other attributes.
        if (dictionary.usesReference(token.original.value)) {
          const refs = dictionary.getReferences(token.original.value);
          refs.forEach((ref) => {
            value = value.replace(ref.value, function () {
              return `${ref.name}`;
            });
          });
        }
      }

      return `export const ${token.name} = ${value};`;
    })
    .join(`\n`);
};
