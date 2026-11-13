// Copyright 2026 Adobe. All rights reserved.
import {
  setColorScheme,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import { useLayoutEffect } from "react";
import type { AppColorScheme } from "../features/modes/capabilities";

export function spectrumChromeClassName(colorScheme: AppColorScheme): string {
  return `spectrum spectrum--${colorScheme}`;
}

/** Default S2 text color for plain elements inside the Provider. */
export const providerTextStyles = style({ color: "neutral" });

const bodyTextStyles = style({ ...setColorScheme(), color: "neutral" });

/**
 * Gives `<body>` the S2 color scheme and default text color, so plain text in
 * popovers, dialogs and toasts (which render outside the Provider) follows it.
 */
export function useBodyTextStyles(colorScheme: AppColorScheme): void {
  useLayoutEffect(() => {
    const classes = bodyTextStyles({ colorScheme }).split(" ").filter(Boolean);
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [colorScheme]);
}
