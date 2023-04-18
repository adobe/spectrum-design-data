export function ifDefined(a: any, b: any) {
  return typeof a === "undefined" ? b : a;
}

export default ifDefined;
