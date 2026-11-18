// Copyright 2026 Adobe. All rights reserved.
import { Badge } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ItemLifecycle } from "../features/edit-session/lifecycle";

/** Matches the Token Browser's Deprecated status badge. */
export function DeprecatedBadge({ lifecycle }: { lifecycle?: ItemLifecycle }) {
  if (!lifecycle?.deprecated) return null;
  const release = lifecycle.deprecatedIn
    ? `Deprecated in ${lifecycle.deprecatedIn}`
    : "Deprecated, pending release";
  return (
    <Badge
      variant="notice"
      fillStyle="subtle"
      aria-label={release}
      styles={style({ width: "fit", flexShrink: 0 })}
    >
      Deprecated
    </Badge>
  );
}
