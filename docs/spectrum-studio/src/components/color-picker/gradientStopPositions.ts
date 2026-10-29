// Copyright 2026 Adobe. All rights reserved.
export function gradientPointerPosition(
  clientX: number,
  left: number,
  width: number,
  minimum = 0,
  maximum = 1,
) {
  if (
    ![clientX, left, width, minimum, maximum].every(Number.isFinite) ||
    width <= 0 ||
    minimum > maximum
  ) {
    throw new Error("The gradient needs valid bounds before moving a stop.");
  }
  return Math.min(maximum, Math.max(minimum, (clientX - left) / width));
}
