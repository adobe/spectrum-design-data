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
};

// final token data object (might be split into individual sets/files)
export let allTokensStudioTokensJsonData = {
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

export let spectrumTokensStudioTokensJsonData = {
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumCore]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumLight]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDark]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDarkest]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumWireframe]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDesktop]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumMobile]: {},
  $themes: [],
  $metadata: {
    tokenSetOrder: [
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumCore,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumLight,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDark,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDarkest,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumWireframe,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDesktop,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumMobile,
    ],
  },
};

export let expressTokensStudioTokensJsonData = {
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressCore]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressLight]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDark]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDarkest]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressWireframe]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDesktop]: {},
  [TOKENS_STUDIO_SETS_NODE_NAMES.ExpressMobile]: {},
  $themes: [],
  $metadata: {
    tokenSetOrder: [
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

export let expressOverwritesTokensStudioTokensJsonData = {
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
  $themes: [],
  $metadata: {
    tokenSetOrder: [
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

export const mergeAllWorkingJson = (targetTokensStudioTokensJsonData = {}) => {
  // merge data into token studio data
  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalCore,
    )
  ) {
    targetTokensStudioTokensJsonData[TOKENS_STUDIO_SETS_NODE_NAMES.GlobalCore] =
      _.merge(
        targetTokensStudioTokensJsonData[
          TOKENS_STUDIO_SETS_NODE_NAMES.GlobalCore
        ],
        globalCoreJson,
      );
  }
  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalLight,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalLight
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.GlobalLight
      ],
      globalLightJson,
    );
  }
  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDark,
    )
  ) {
    targetTokensStudioTokensJsonData[TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDark] =
      _.merge(
        targetTokensStudioTokensJsonData[
          TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDark
        ],
        globalDarkJson,
      );
  }
  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDarkest,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDarkest
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDarkest
      ],
      globalDarkestJson,
    );
  }
  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalWireframe,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalWireframe
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.GlobalWireframe
      ],
      globalWireframeJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDesktop,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDesktop
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDesktop
      ],
      globalDesktopJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalDesktop,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.GlobalMobile
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.GlobalMobile
      ],
      globalMobileJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumCore,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumCore
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumCore
      ],
      spectrumCoreJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumLight,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumLight
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumLight
      ],
      spectrumLightJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDark,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDark
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDark
      ],
      spectrumDarkJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDarkest,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDarkest
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDarkest
      ],
      spectrumDarkestJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumWireframe,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumWireframe
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumWireframe
      ],
      spectrumWireframeJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDesktop,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDesktop
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumDesktop
      ],
      spectrumDesktopJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumMobile,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumMobile
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.SpectrumMobile
      ],
      spectrumMobileJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressCore,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressCore
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.ExpressCore
      ],
      expressCoreJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressLight,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressLight
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.ExpressLight
      ],
      expressLightJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDark,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDark
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDark
      ],
      expressDarkJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDarkest,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDarkest
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDarkest
      ],
      expressDarkestJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressWireframe,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressWireframe
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.ExpressWireframe
      ],
      expressWireframeJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDesktop,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDesktop
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.ExpressDesktop
      ],
      expressDesktopJson,
    );
  }

  if (
    _.has(
      targetTokensStudioTokensJsonData,
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressMobile,
    )
  ) {
    targetTokensStudioTokensJsonData[
      TOKENS_STUDIO_SETS_NODE_NAMES.ExpressMobile
    ] = _.merge(
      targetTokensStudioTokensJsonData[
        TOKENS_STUDIO_SETS_NODE_NAMES.ExpressMobile
      ],
      expressMobileJson,
    );
  }
};
