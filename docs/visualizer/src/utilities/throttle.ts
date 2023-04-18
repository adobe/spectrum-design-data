export function throttle(func: any, wait = 100) {
  let timer: any = null;
  return function (...args: any) {
    if (timer === null) {
      timer = setTimeout(function (this: any) {
        func.apply(this, args);
        timer = null;
      }, wait);
    }
  };
}
