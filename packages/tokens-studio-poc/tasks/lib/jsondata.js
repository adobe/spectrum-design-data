// collecting data
import { TOKENS_STUDIO_SETS_NODE_NAMES } from "./common.js";
import _ from "lodash";

export let globalCoreJson = {};
export let globalLightJson = {};
export let globalDarkJson = {};
export let globalDarkestJson = {};
export let globalWireframeJson = {};
export let globalDesktopJson = {};
export let globalMobileJson = {};
export let expressCoreJson = {};
export let expressLightJson = {};
export let expressDarkJson = {};
export let expressDarkestJson = {};
export let expressWireframeJson = {};
export let expressDesktopJson = {};
export let expressMobileJson = {};
export let spectrumCoreJson = {};
export let spectrumLightJson = {};
export let spectrumDarkJson = {};
export let spectrumDarkestJson = {};
export let spectrumWireframeJson = {};
export let spectrumDesktopJson = {};
export let spectrumMobileJson = {};
export const resetWorkingJson = () => {
  // reset jsons
  globalCoreJson = {};
  globalLightJson = {};
  globalDarkJson = {};
  globalDarkestJson = {};
  globalWireframeJson = {};
  globalMobileJson = {};
  globalDesktopJson = {};
  globalMobileJson = {};

  expressCoreJson = {};
  expressLightJson = {};
  expressDarkJson = {};
  expressDarkestJson = {};
  expressWireframeJson = {};
  expressDesktopJson = {};
  expressMobileJson = {};

  spectrumCoreJson = {};
  spectrumLightJson = {};
  spectrumDarkJson = {};
  spectrumDarkestJson = {};
  spectrumWireframeJson = {};
  spectrumDesktopJson = {};
  spectrumMobileJson = {};
}; // final token data object (might be split into individual sets/files)
export let completeTokensStudioTokensJsonData = {
  [TOKENS_STUDIO_SETS_NODE_NAMES.GlobalCore]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.GlobalLight]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDark]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDarkest]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.GlobalWireframe]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDesktop]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.GlobalMobile]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumCore]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumLight]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDark]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDarkest]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumWireframe]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDesktop]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumMobile]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressCore]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressLight]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDark]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDarkest]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressWireframe]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDesktop]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressMobile]: {},
}; // additional data for token studio,
// .e.g. set order
export let additionalTokenStudioData = {
  $themes: [],
  $metadata: {
    tokenSetOrder: [
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalCore,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalLight,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDark,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDarkest,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalWireframe,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDesktop,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalMobile,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumCore,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumLight,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDark,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDarkest,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumWireframe,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDesktop,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumMobile,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressCore,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressLight,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDark,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDarkest,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressWireframe,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDesktop,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressMobile,
    ],
  },
};
export const mergeWorkingJson = () => {
  // merge data into token studio data
  completeTokensStudioTokensJsonData[TOKENS_STUDIO_SETS_NODE_NAMES.GlobalCore] =
    _.merge(
      completeTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.GlobalCore
      ],
      globalCoreJson,
    );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.GlobalLight
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalLight
    ],
    globalLightJson,
  );
  completeTokensStudioTokensJsonData[TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDark] =
    _.merge(
      completeTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDark
      ],
      globalDarkJson,
    );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDarkest
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDarkest
    ],
    globalDarkestJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.GlobalWireframe
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalWireframe
    ],
    globalWireframeJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDesktop
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDesktop
    ],
    globalDesktopJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.GlobalMobile
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalMobile
    ],
    globalMobileJson,
  );

  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumCore
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumCore
    ],
    spectrumCoreJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumLight
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumLight
    ],
    spectrumLightJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDark
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDark
    ],
    spectrumDarkJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDarkest
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDarkest
    ],
    spectrumDarkestJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumWireframe
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumWireframe
    ],
    spectrumWireframeJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDesktop
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDesktop
    ],
    spectrumDesktopJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumMobile
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumMobile
    ],
    spectrumMobileJson,
  );

  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.ExpressCore
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressCore
    ],
    expressCoreJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.ExpressLight
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressLight
    ],
    expressLightJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDark
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDark
    ],
    expressDarkJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDarkest
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDarkest
    ],
    expressDarkestJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.ExpressWireframe
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressWireframe
    ],
    expressWireframeJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDesktop
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDesktop
    ],
    expressDesktopJson,
  );
  completeTokensStudioTokensJsonData[
    TOKENS_STUDIO_SETS_NODE_NAMES.ExpressMobile
  ] = _.merge(
    completeTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressMobile
    ],
    expressMobileJson,
  );
};

export function finalizeTokensStudioJsonData() {
  completeTokensStudioTokensJsonData = _.merge(
    completeTokensStudioTokensJsonData,
    additionalTokenStudioData,
  );
}
