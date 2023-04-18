export function isDefined(...args: any[]) {
  return args.reduce((bool, arg: any) => {
    if (!bool) {
      return bool;
    }
    return typeof arg !== "undefined";
  }, true);
}
