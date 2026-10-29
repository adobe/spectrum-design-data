// Copyright 2026 Adobe. All rights reserved.
import { css } from "@react-spectrum/s2/style" with { type: "macro" };

export const popoverDialogStyles = css(`
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;

  & > * {
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
  }
`);
