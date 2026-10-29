// Copyright 2026 Adobe. All rights reserved.
import { createElement, type ReactNode } from "react";
import BrightnessContrast from "@react-spectrum/s2/icons/BrightnessContrast";
import Color from "@react-spectrum/s2/icons/Color";
import Contrast from "@react-spectrum/s2/icons/Contrast";
import DeviceAll from "@react-spectrum/s2/icons/DeviceAll";
import DevicePhone from "@react-spectrum/s2/icons/DevicePhone";
import DeviceTablet from "@react-spectrum/s2/icons/DeviceTablet";
import Lighten from "@react-spectrum/s2/icons/Lighten";
import Star from "@react-spectrum/s2/icons/Star";
import TextSize from "@react-spectrum/s2/icons/TextSize";
import Moon from "../../icons/Moon";
import { type ModeIconId } from "./iconIds";

export { MODE_ICON_IDS, isModeIconId, type ModeIconId } from "./iconIds";

export interface ModeIconOption {
  id: ModeIconId;
  label: string;
  icon: ReactNode;
}

// Modes persist an icon id because icon components cannot be serialized to localStorage.
export const MODE_ICON_OPTIONS: readonly ModeIconOption[] = [
  { id: "none", label: "None", icon: null },
  { id: "light", label: "Light", icon: createElement(Lighten) },
  { id: "dark", label: "Dark", icon: createElement(Moon) },
  { id: "contrast", label: "Contrast", icon: createElement(Contrast) },
  { id: "brightness", label: "Brightness", icon: createElement(BrightnessContrast) },
  { id: "devices", label: "All devices", icon: createElement(DeviceAll) },
  { id: "tablet", label: "Tablet", icon: createElement(DeviceTablet) },
  { id: "phone", label: "Phone", icon: createElement(DevicePhone) },
  { id: "star", label: "Star", icon: createElement(Star) },
  { id: "color", label: "Color", icon: createElement(Color) },
  { id: "textSize", label: "Text size", icon: createElement(TextSize) },
];

export const MODE_ICONS = Object.fromEntries(
  MODE_ICON_OPTIONS.map((option) => [option.id, option.icon]),
) as Record<ModeIconId, ReactNode>;
