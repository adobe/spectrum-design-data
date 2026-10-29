// Copyright 2026 Adobe. All rights reserved.
import { createIconsFromGlob } from "../utils/createIconsFromGlob";

const svgs = import.meta.glob(
  "/node_modules/@a4u/a4u-workfront-s2/assets/svg/S2_Icon_*_20_N.svg",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

export const workfrontIcons = createIconsFromGlob(svgs);
