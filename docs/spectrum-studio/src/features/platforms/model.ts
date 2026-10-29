// Copyright 2026 Adobe. All rights reserved.
export const PLATFORMS_SCHEMA_VERSION = 1;

export interface Platform {
  id: string;
  name: string;
}

function isPlatform(value: unknown): value is Platform {
  if (!value || typeof value !== "object") return false;
  const platform = value as Partial<Platform>;
  return (
    typeof platform.id === "string" &&
    platform.id.trim().length > 0 &&
    typeof platform.name === "string"
  );
}

export function isPlatformList(data: unknown): data is Platform[] {
  return (
    Array.isArray(data) &&
    data.every(isPlatform) &&
    new Set(data.map((platform) => platform.id)).size === data.length
  );
}

export function resolvePlatforms(
  platforms: Platform[],
  platformIds: string[],
): Platform[] {
  return platformIds
    .map((id) => platforms.find((platform) => platform.id === id))
    .filter((platform): platform is Platform => Boolean(platform));
}
