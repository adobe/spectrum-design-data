// Copyright 2026 Adobe. All rights reserved.
import type { AppColorScheme } from "../features/modes/capabilities";

export function spectrumChromeClassName(colorScheme: AppColorScheme): string {
  return `spectrum spectrum--${colorScheme}`;
}
