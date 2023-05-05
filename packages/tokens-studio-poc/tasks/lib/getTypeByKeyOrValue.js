import { TOKENS_STUDIO_TOKEN_TYPE } from "./common.js";

/**
 * try to define a token type by gathering information from the key (or value)
 * not good... needed until all tokens are tagged by design
 *
 * @param key
 * @param value
 * @return {string} type of token
 */
export const getTypeByKeyOrValue = (key, value) => {
  // font section first
  // find font-family
  if (
    key.indexOf("font-family") !== -1 ||
    value.indexOf("font-family") !== -1
  ) {
    return TOKENS_STUDIO_TOKEN_TYPE.FONT_FAMILIES;
  }
  // find font-weight
  else if (
    key.indexOf("font-weight") !== -1 ||
    value.indexOf("font-weight") !== -1
  ) {
    return TOKENS_STUDIO_TOKEN_TYPE.FONT_WEIGHTS;
  }
  // find font-size
  else if (
    key.indexOf("font-size") !== -1 ||
    value.indexOf("font-size") !== -1
  ) {
    return TOKENS_STUDIO_TOKEN_TYPE.FONT_SIZES;
  }
  // find line-height
  else if (
    key.indexOf("line-height") !== -1 ||
    value.indexOf("line-height") !== -1
  ) {
    return TOKENS_STUDIO_TOKEN_TYPE.LINE_HEIGHTS;
  }
  // find letter-spacing
  else if (
    key.indexOf("letter-spacing") !== -1 ||
    value.indexOf("letter-spacing") !== -1
  ) {
    return TOKENS_STUDIO_TOKEN_TYPE.LETTER_SPACING;
  }

  // spacing section next

  // find key with border-radius or corner-radius:
  if (key.indexOf("radius") !== -1) {
    return TOKENS_STUDIO_TOKEN_TYPE.BORDER_RADIUS;
  }
  // find key with *border-width*
  else if (key.indexOf("border-width") !== -1) {
    return TOKENS_STUDIO_TOKEN_TYPE.BORDER_WIDTH;
  }
  // find key with *height* or *size* // omg: exclude font-size
  else if (
    (key.indexOf("height") !== -1 || key.indexOf("size") !== -1) &&
    key.indexOf("font-size") === -1
  ) {
    return TOKENS_STUDIO_TOKEN_TYPE.SIZING;
  }
  // find key with opacity; exclude opacity-checkerboard
  else if (
    key.indexOf("opacity") !== -1 &&
    key.indexOf("opacity-checkerboard") === -1
  ) {
    return TOKENS_STUDIO_TOKEN_TYPE.OPACITY;
  }

  // color section

  if (
    // exclude section
    // exclude *-color-opacity
    (key.indexOf("-color-opacity") === -1 ||
      key.indexOf("color-loupe-height") === -1 ||
      key.indexOf("color-loupe-width") === -1 ||
      key.indexOf("color-area-border-opacity") === -1 ||
      key.indexOf("color-slider-border-opacity") === -1 ||
      key.indexOf("color-loupe-drop-shadow-y") === -1 ||
      key.indexOf("color-loupe-drop-shadow-blur") === -1 ||
      key.indexOf("color-loupe-inner-border") === -1 ||
      key.indexOf("color-loupe-outer-border") === -1 ||
      key.indexOf("color-control-track-width") === -1 ||
      key.indexOf("card-selection-background-color-opacity") === -1) &&
    // find value starting with "rgb" or key contains 'color',
    // TODO: look for the type of the alias source maybe?!
    ((value && value.indexOf("rgb") === 0) || key.indexOf("-color") !== -1)
  ) {
    return TOKENS_STUDIO_TOKEN_TYPE.COLOR;
  }

  // default type 'spacing'
  return TOKENS_STUDIO_TOKEN_TYPE.SPACING;
};
