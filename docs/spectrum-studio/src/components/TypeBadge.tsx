// Copyright 2026 Adobe. All rights reserved.
import { Badge } from "@react-spectrum/s2";
import type { ReactNode } from "react";
import { typeBadgeVariant, type TypeBadgeType } from "./typeBadgePresentation";

export function TypeBadge({
  type,
  children,
}: {
  type: TypeBadgeType;
  children: ReactNode;
}) {
  return (
    <Badge
      size="S"
      variant={typeBadgeVariant(type)}
      fillStyle={type === "built-in" ? "outline" : "subtle"}
    >
      {children}
    </Badge>
  );
}
