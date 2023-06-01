/**
 * https://docs.tokens.studio/available-tokens/available-tokens
 *
 * @type {{BORDER_RADIUS: string, FONT_WEIGHTS: string, FONT_SIZES: string, OPACITY: string, LETTER_SPACING: string, SIZING: string, TEXT_DECORATION: string, DIMENSION: string, FONT_FAMILIES: string, COLOR: string, TYPOGRAPHY: string, TEXT_CASE: string, LINE_HEIGHTS: string, BORDER_WIDTH: string, SPACING: string}}
 */
export const TOKENS_STUDIO_TOKEN_TYPE = {
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
export const JSON_SET_NODE_NAMES = {
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
  UUID: "uuid",
};
export const TOKENS_STUDIO_SETS_NODE_NAMES = {
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
