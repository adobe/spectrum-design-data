// Copyright 2026 Adobe. All rights reserved.
import { createIconsFromGlob } from "../utils/createIconsFromGlob";

const svgs = import.meta.glob(
  "/node_modules/@a4u/a4u-md-desktop-workflow-icons-s2/assets/svg/S2_Icon_*_20_N.svg",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

export const mdDesktopWorkflowIcons = createIconsFromGlob(svgs);
