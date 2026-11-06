// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Label text and content icon controls: which of them a component's recipe supports,
// the choices for the icon picker, and their round trip through the URL query string.

export const DEFAULT_LABEL = "Label";
export const NO_ICON = "none";

const parts = (compiled) =>
  Object.values(compiled?.variants ?? {}).flatMap((v) => Object.values(v));

// What the recipe lets the demo change: `label` when a part draws text, `icon` (with
// whether "none" is allowed) when a part holds a swappable content icon.
export function contentSupport(compiled) {
  const all = parts(compiled);
  const icons = all.filter((p) => p.icon?.content);
  return {
    label: all.some((p) => p.kind === "text"),
    icon: icons.length
      ? { optional: icons.every((p) => p.icon.optional) }
      : null,
  };
}

// Picker choices as [value, text]; the empty value keeps the recipe's own icon.
export function iconChoices(icons, optional) {
  const names = Object.keys(icons ?? {}).sort();
  return [
    ["", "Default"],
    ...(optional ? [[NO_ICON, "None"]] : []),
    ...names.map((k) => [k, k.split(":").pop().replace(/-/g, " ")]),
  ];
}

// A request's `icon` value: undefined (recipe icon), "none", or {set, name}.
export function iconRequest(value) {
  if (!value) return undefined;
  if (value === NO_ICON) return NO_ICON;
  const [set, name] = value.split(":");
  return set && name ? { set, name } : undefined;
}

export function readContentParams(params) {
  return {
    label: params.has("label") ? params.get("label") : DEFAULT_LABEL,
    icon: params.get("icon") ?? "",
  };
}

// Defaults stay out of the URL so links to an untouched component stay short.
export function writeContentParams(params, { label, icon }) {
  if (label !== DEFAULT_LABEL && label !== undefined)
    params.set("label", label);
  else params.delete("label");
  if (icon) params.set("icon", icon);
  else params.delete("icon");
}

// The scene request for the options `o`: unset values are dropped, but an empty label is
// kept, since it asks for an icon-only render.
export const sceneQuery = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([k, v]) =>
        v !== undefined &&
        v !== false &&
        v !== null &&
        (v !== "" || k === "label"),
    ),
  );
