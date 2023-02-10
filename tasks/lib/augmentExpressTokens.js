const deprecationObj = {
  deprecated: true,
  deprecated_comment:
    "Express will merge with Spectrum with the release of Spectrum 2.",
};

const findExpressValue = (tokenObj) => {
  if (typeof tokenObj === "object" && tokenObj !== null) {
    if (tokenObj.hasOwnProperty("value")) {
      return {
        ...tokenObj,
        ...deprecationObj,
      };
    } else {
      const result = {};
      Object.keys(tokenObj).forEach((tokenName) => {
        result[tokenName] = findExpressValue(tokenObj[tokenName]);
      });
      return result;
    }
  }
};

const augmentExpressTokens = (tokenObj) => {
  if (typeof tokenObj === "object" && tokenObj !== null) {
    const result = {};
    Object.keys(tokenObj).forEach((tokenName) => {
      if (tokenName === "express") {
        result[tokenName] = findExpressValue(tokenObj[tokenName]);
      } else {
        result[tokenName] = augmentExpressTokens(tokenObj[tokenName]);
      }
    });
    return result;
  } else {
    return tokenObj;
  }
};

export default augmentExpressTokens;
