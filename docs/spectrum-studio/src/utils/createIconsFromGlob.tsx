// Copyright 2026 Adobe. All rights reserved.
import { createIcon } from "@react-spectrum/s2";

function parseSvg(raw: string): { viewBox: string; inner: string } {
  const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 20 20";
  const inner = raw
    .replace(/<\?xml[^?]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();
  return { viewBox, inner };
}

function iconNameFromPath(path: string): string {
  const match = path.match(/S2_Icon_(.+?)_20_N\.svg$/);
  if (match) return match[1];
  const filename = path.split("/").pop() ?? "";
  return filename.replace(/\.svg$/, "");
}

type IconComponent = ReturnType<typeof createIcon>;

export function createIconsFromGlob(
  modules: Record<string, string>,
): Record<string, IconComponent> {
  const icons: Record<string, IconComponent> = {};

  for (const [path, raw] of Object.entries(modules)) {
    const name = iconNameFromPath(path);
    const { viewBox, inner } = parseSvg(raw);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icons[name] = createIcon((props: any) => (
      <svg
        viewBox={viewBox}
        {...props}
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    ));
  }

  return icons;
}
