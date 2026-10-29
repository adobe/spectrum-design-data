// Copyright 2026 Adobe. All rights reserved.
import "./color-picker.css";

export function ColorLoupe({
  color,
  visible,
}: {
  color: string;
  visible: boolean;
}) {
  return (
    <div
      className={`colorPickerLoupe${visible ? " is-visible" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 38 48" role="presentation">
        <path
          d="M35 19C35 33.2507 19 45 19 45C19 45 3 33.2507 3 19C3 10.1634 10.1634 3 19 3C27.8366 3 35 10.1634 35 19Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
