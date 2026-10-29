// Copyright 2026 Adobe. All rights reserved.
export type TokenValue = string | number;

export interface BrowserTokenEdit {
  name?: string;
  description?: string;
  status?: "draft" | "deprecated";
  nameBaseline?: string;
  values: { [modeKey: string]: { value: TokenValue; baseline: TokenValue } };
}

export interface BrowserTokenEdits {
  [tokenId: string]: BrowserTokenEdit;
}
