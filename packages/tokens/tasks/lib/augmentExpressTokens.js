/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

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
