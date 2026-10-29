// Copyright 2026 Adobe. All rights reserved.
export type ComponentSize = "xs" | "s" | "m" | "l" | "xl";

export const COMPONENT_SIZES: readonly {
  id: ComponentSize;
  label: string;
  index: number;
}[] = [
  { id: "xs", label: "Extra small", index: -2 },
  { id: "s", label: "Small", index: -1 },
  { id: "m", label: "Medium", index: 0 },
  { id: "l", label: "Large", index: 1 },
  { id: "xl", label: "Extra large", index: 2 },
];

export const componentSizeIndex = (size: ComponentSize) =>
  COMPONENT_SIZES.find((item) => item.id === size)!.index;
export const isComponentSize = (value: unknown): value is ComponentSize =>
  COMPONENT_SIZES.some((item) => item.id === value);
