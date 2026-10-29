// Copyright 2026 Adobe. All rights reserved.
import "./RadiusElements.css";

export function RadiusSample({
  radius,
  label,
}: {
  radius: number;
  label: string;
}) {
  const valid = Number.isFinite(radius) && radius >= 0;
  return (
    <span
      className="radiusSample"
      role="img"
      aria-label={`${label}: ${valid ? `${radius}px radius` : "unavailable radius"}`}
      data-component="RadiusSample"
      data-radius={valid ? radius : undefined}
      style={valid ? { borderTopRightRadius: radius } : undefined}
    >
      {!valid && <span>Unavailable</span>}
    </span>
  );
}
