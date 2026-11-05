// Copyright 2026 Adobe. All rights reserved.
import { createIcon } from "@react-spectrum/s2";

export const IconArrowRight = createIcon((props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="var(--iconPrimary, currentColor)"
    {...props}
  >
    <path d="M17.53 9.47 12.28 4.22a.75.75 0 1 0-1.06 1.06l3.97 3.97H3a.75.75 0 0 0 0 1.5h12.19l-3.97 3.97a.75.75 0 1 0 1.06 1.06l5.25-5.25a.75.75 0 0 0 0-1.06Z" />
  </svg>
));

export const IconArrowDown = createIcon((props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="var(--iconPrimary, currentColor)"
    {...props}
  >
    <path d="M10.53 17.53l5.25-5.25a.75.75 0 1 0-1.06-1.06l-3.97 3.97V3a.75.75 0 0 0-1.5 0v12.19l-3.97-3.97a.75.75 0 1 0-1.06 1.06l5.25 5.25a.75.75 0 0 0 1.06 0Z" />
  </svg>
));
