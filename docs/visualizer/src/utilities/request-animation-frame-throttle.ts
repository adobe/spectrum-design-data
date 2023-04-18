//
// Throttle the execution of the provided
// callback function to the next animationFrame
//
export function requestAnimationFrameThrottle(callback: any) {
  let pending = false;

  function throttled() {
    pending = false;
    callback();
  }

  return function unthrottled() {
    if (pending) {
      return;
    }
    pending = true;
    window.requestAnimationFrame(throttled);
  };
}
