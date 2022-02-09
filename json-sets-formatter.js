const merge = require("deepmerge");

const isObject = (item) => {
  return typeof item === "object" && !Array.isArray(item) && item !== null;
};

const pathToObj = (pathAr, value) => {
  return (res = pathAr.reduceRight((value, key) => ({ [key]: value }), value));
};

const formatter = ({ dictionary, platform, file, options }) => {
  let resultObj = {};
  dictionary.allTokens.forEach((token) => {
    if (isObject(token.value)) {
      const value = {
        ref: token.original.value,
        sets: {
          mobile: token.value.sets.mobile.value,
          desktop: token.value.sets.desktop.value,
        },
      };
      resultObj = merge(resultObj, pathToObj(token.path, { value }));
    } else {
      resultObj = merge(
        resultObj,
        pathToObj(token.path, { value: token.value })
      );
    }
  });
  return JSON.stringify(resultObj, null, 2);
};

module.exports = {
  name: "json/sets",
  formatter,
};
