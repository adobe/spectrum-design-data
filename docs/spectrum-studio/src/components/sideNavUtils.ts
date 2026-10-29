// Copyright 2026 Adobe. All rights reserved.
export const sidebarTransitionMs = 180;
export const sidebarTransitionTiming = `${sidebarTransitionMs}ms cubic-bezier(0.2, 0, 0, 1)`;

export function getSidebarLabelClassName(isCollapsed: boolean): string {
  return isCollapsed ? "sidebarLabel is-collapsed" : "sidebarLabel";
}
