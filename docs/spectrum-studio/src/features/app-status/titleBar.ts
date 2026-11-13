// Copyright 2026 Adobe. All rights reserved.

// The installed app's title bar takes its colour from the theme-color meta tag.
export function setTitleBarColor(
  meta: { content: string } | null,
  color: string,
): boolean {
  if (!meta || !color || meta.content === color) return false;
  meta.content = color;
  return true;
}
