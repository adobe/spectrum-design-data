// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Label text and content icon controls: the choices for the icon picker and their round trip
// through the URL query string. What a recipe supports comes from data.json (`content`).

export const DEFAULT_LABEL = "Label";
export const NO_ICON = "none";

// A free-text option gets a text box: a string with no listed values. Label text has its own
// control and `$ref` options are icon presence toggles.
export const isTextOption = (name, def) =>
  name !== "label" && !def.$ref && def.type === "string" && !def.values;

// A number option with no listed values gets a number box; `width` has its own control.
export const isNumberOption = (name, def) =>
  name !== "width" && !def.$ref && def.type === "number" && !def.values;

const DEMO_ITEMS = 3;
const DEMO_COLORS = ["#9197fe", "#e68619", "#2d9d78"];

// Demo content for the explorer: a slot's `demo` fills, as the component data declares them (the
// request `slots` shape). A slot with a part and `accepts` but no `demo` falls back to an interim
// heuristic: fills of the first accepted component labeled "<Component> n" (a `preview` option,
// as a swatch has, gets a color); the `default` slot gets three, any other named slot its `min`,
// at least one; `max` caps both. Slots that accept nothing in particular (free content) stay
// empty. `byName` is the site data's component map.
export function demoSlots(def, byName) {
  const slots = {};
  for (const s of def?.slots ?? []) {
    if (!s.part || s.collection) continue;
    if (s.demo) {
      slots[s.name] = s.demo;
      continue;
    }
    const name = s.accepts?.[0];
    if (!name) continue;
    const options = byName[name]?.options ?? {};
    const title =
      name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
    slots[s.name] = Array.from(
      {
        length: Math.min(
          s.max ?? DEMO_ITEMS,
          s.name === "default" ? DEMO_ITEMS : (s.min ?? 1),
        ),
      },
      (_, i) => ({
        component: name,
        options: {
          label: `${title} ${i + 1}`,
          ...(options.preview && {
            preview: DEMO_COLORS[i % DEMO_COLORS.length],
          }),
        },
      }),
    );
  }
  return slots;
}

// Demo entries of a component's collection slots, keyed by the collection option: the slot's
// `demo` is the option's array value (item objects), so a host sets it as `options[<option>]`,
// not as `slots`. An option the user sets replaces it.
export function demoOptions(def) {
  const options = {};
  for (const s of def?.slots ?? []) {
    if (s.part && s.collection && s.demo) options[s.collection] = s.demo;
  }
  return options;
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

// The text to put back in the label input for a request's label, or undefined to leave it.
// With a Label switch, an off switch also sends "", and the typed text must survive that.
export const labelText = (label, hasSwitch) =>
  label === undefined || (hasSwitch && label === "") ? undefined : label;
