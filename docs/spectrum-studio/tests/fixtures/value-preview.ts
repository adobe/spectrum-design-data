// Copyright 2026 Adobe. All rights reserved.
import {
  createValuePreview,
  unavailablePreview,
} from "../../src/features/tokens/valuePreview";

export const valuePreviewExamples = [
  { label: "Color", preview: createValuePreview("color", "#f08080") },
  {
    label: "Transparent color",
    preview: createValuePreview("color", "rgb(255 0 0 / 0.4)"),
  },
  {
    label: "Wide gamut color",
    preview: createValuePreview("color", "color(display-p3 1 0 0)"),
  },
  {
    label: "OKLCH text color",
    preview: createValuePreview("text-color", "oklch(60% 0.2 40)"),
  },
  { label: "Text color", preview: createValuePreview("text-color", "#c40000") },
  {
    label: "Border color",
    preview: createValuePreview("border-color", "#c40000"),
  },
  {
    label: "Border thickness",
    preview: createValuePreview("border-width", 3, "px"),
  },
  { label: "Text size", preview: createValuePreview("font-size", 20, "px") },
  { label: "Font weight", preview: createValuePreview("font-weight", 700) },
  { label: "Font family", preview: createValuePreview("font-family", "serif") },
  {
    label: "Unitless line height",
    preview: createValuePreview("line-height", 1.5, "multiplier"),
  },
  {
    label: "Absolute line height",
    preview: createValuePreview("line-height", 20, "px"),
  },
  { label: "Icon size", preview: createValuePreview("icon-size", 22, "px") },
  { label: "Icon color", preview: createValuePreview("icon-color", "#c40000") },
  { label: "Spacing", preview: createValuePreview("block", 30, "px") },
  { label: "Zero spacing", preview: createValuePreview("block", 0, "px") },
  {
    label: "Fractional spacing",
    preview: createValuePreview("block", 0.5, "px"),
  },
  { label: "Large spacing", preview: createValuePreview("block", 2048, "px") },
  { label: "Large text", preview: createValuePreview("font-size", 128, "px") },
  { label: "Radius", preview: createValuePreview("radius", 8, "px") },
  {
    label: "Complete shadow",
    preview: createValuePreview("shadow", "0 2px 4px #0008, 0 6px 12px #0004"),
  },
  { label: "Shadow blur", preview: createValuePreview("shadow-blur", 8, "px") },
  {
    label: "Shadow offset",
    preview: createValuePreview("shadow-offset-y", 4, "px"),
  },
  {
    label: "Shadow color",
    preview: createValuePreview("shadow-color", "#c4000080"),
  },
  { label: "Invalid length", preview: createValuePreview("block", -1, "px") },
  {
    label: "Invalid color",
    preview: createValuePreview("color", "not-a-color"),
  },
  {
    label: "Unavailable classification",
    preview: unavailablePreview(
      "No visual preview is defined for this classification.",
    ),
  },
];
