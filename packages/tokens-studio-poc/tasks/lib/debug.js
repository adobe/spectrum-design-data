export function debug(msg) {
  const debugIt = true;
  if (debugIt) {
    console.log(msg.toString() || msg);
  }
}
