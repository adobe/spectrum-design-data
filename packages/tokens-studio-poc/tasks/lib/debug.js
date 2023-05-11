const debugIt = true;
export function debug(msg) {
  if (debugIt) {
    console.log(msg?.toString() || msg);
  }
}

export function debugTable(obj) {
  if (debugIt) {
    console.table(obj);
  }
}
