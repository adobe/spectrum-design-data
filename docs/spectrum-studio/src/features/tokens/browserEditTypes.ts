// Copyright 2026 Adobe. All rights reserved.
import type { TokenTier } from "./tier";
export type TokenValue = string | number;

export interface TokenShadowLayer {
  x: string;
  y: string;
  blur: string;
  spread: string;
  color: string;
}

export type TokenAssignment =
  | { kind: "literal"; value: TokenValue; shadows?: TokenShadowLayer[] }
  | { kind: "reference"; targetId: string };

export interface TokenAuthoring {
  identity?: import("./canonicalIdentity").TokenIdentity;
  assignments: { [modeKey: string]: TokenAssignment };
  baselines?: { [modeKey: string]: TokenValue };
  classification?: Record<string, string | string[]>;
  manual?: {
    tier?: TokenTier;
    type:
      | "colors"
      | "typography"
      | "spacing"
      | "size"
      | "radius"
      | "opacity"
      | "elevation";
    unit: "px" | "";
    /** Missing for new tokens that do not reference another token yet. */
    targetId?: string;
    groupId: string;
    scope?: "structures";
  };
  lifecycle?: {
    introduced?: string;
    deprecatedIn?: string;
    deprecatedComment: string;
    replacementIds: string[];
    frozen?: Record<string, Extract<TokenAssignment, { kind: "literal" }>>;
  };
}

export interface BrowserTokenEdit {
  name?: string;
  description?: string;
  status?: "draft" | "deprecated";
  nameBaseline?: string;
  values: { [modeKey: string]: { value: TokenValue; baseline: TokenValue } };
  authoring?: TokenAuthoring;
}

export interface BrowserTokenEdits {
  [tokenId: string]: BrowserTokenEdit;
}
