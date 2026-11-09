// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "./model";

const SCALE_MODE_SET_ID = "mode-set-platform-scale";
const DESKTOP_MODE_ID = "mode-platform-scale-default";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function upgradeScaleKeys<T extends { modeSets: ModeSet[] }>(
  value: T,
  reportIssue?: (message: string) => void,
): T;
export function upgradeScaleKeys(
  value: unknown,
  reportIssue?: (message: string) => void,
): unknown;
export function upgradeScaleKeys(
  value: unknown,
  reportIssue: (message: string) => void = console.warn,
): unknown {
  if (!isRecord(value) || !Array.isArray(value.modeSets)) return value;
  const sets: unknown[] = value.modeSets;
  const scale = sets.find(
    (set) =>
      isRecord(set) &&
      set.id === SCALE_MODE_SET_ID &&
      (set.key === "platformScale" || set.key === "scale"),
  );
  if (!isRecord(scale) || !Array.isArray(scale.modes)) return value;
  const modes: unknown[] = scale.modes;
  const desktop = modes.find(
    (mode) =>
      isRecord(mode) && mode.id === DESKTOP_MODE_ID && mode.key === "default",
  );
  const renameSet = scale.key === "platformScale";
  if (!renameSet && !desktop) return value;
  if (
    (renameSet &&
      sets.some(
        (set) => set !== scale && isRecord(set) && set.key === "scale",
      )) ||
    (desktop &&
      modes.some(
        (mode) => mode !== desktop && isRecord(mode) && mode.key === "desktop",
      ))
  ) {
    reportIssue(
      "Scale keys were preserved because another mode set uses scale or another mode uses desktop. Resolve the conflicting key before migrating Scale.",
    );
    return value;
  }
  const modeValue = (entry: unknown) =>
    desktop && entry === "default" ? "desktop" : entry;
  let conflictingScope = false;
  const components =
    isRecord(value.components) && Array.isArray(value.components.components)
      ? {
          ...value.components,
          components: value.components.components.map((component: unknown) => {
            if (!isRecord(component) || !Array.isArray(component.assignments))
              return component;
            return {
              ...component,
              assignments: component.assignments.map((assignment: unknown) => {
                if (!isRecord(assignment) || !isRecord(assignment.options))
                  return assignment;
                const options = assignment.options;
                const previousKey = renameSet ? "platformScale" : "scale";
                if (!(previousKey in options)) return assignment;
                if (renameSet && "scale" in options) {
                  conflictingScope = true;
                  return assignment;
                }
                const selected = options[previousKey];
                return {
                  ...assignment,
                  options: Object.fromEntries(
                    Object.entries(options).map(([key, entry]) =>
                      key === previousKey
                        ? [
                            "scale",
                            Array.isArray(selected)
                              ? selected.map(modeValue)
                              : modeValue(selected),
                          ]
                        : [key, entry],
                    ),
                  ),
                };
              }),
            };
          }),
        }
      : undefined;
  if (conflictingScope) {
    reportIssue(
      "Scale keys were preserved because a component condition uses both platformScale and scale. Resolve the conflicting conditions before migrating Scale.",
    );
    return value;
  }
  return {
    ...value,
    modeSets: sets.map((set) =>
      set === scale
        ? {
            ...scale,
            key: "scale",
            modes: modes.map((mode) =>
              mode === desktop && isRecord(mode)
                ? { ...mode, key: "desktop" }
                : mode,
            ),
          }
        : set,
    ),
    ...(components && { components }),
  };
}

export function upgradeScaleSelection(
  selection: Record<string, string>,
  modeSets: readonly ModeSet[],
): Record<string, string> {
  const selected = selection.platformScale;
  if (
    !selected ||
    !modeSets.some(
      (set) =>
        set.id === SCALE_MODE_SET_ID &&
        set.key === "scale" &&
        set.modes.some((mode) => mode.id === selected),
    )
  )
    return selection;
  const remaining = { ...selection };
  delete remaining.platformScale;
  return { ...remaining, scale: selection.scale ?? selected };
}

/** Preserve published token UUID seeds while output uses the authored keys. */
export function scaleIdentityContext(
  context: Record<string, string>,
  modeSets: readonly ModeSet[],
): Record<string, string> {
  const scale = modeSets.find(
    (set) => set.id === SCALE_MODE_SET_ID && set.key === "scale",
  );
  if (!scale || !context.scale) return context;
  const mode = scale.modes.find((mode) => mode.key === context.scale);
  const remaining = { ...context };
  delete remaining.scale;
  return {
    ...remaining,
    platformScale: mode?.id === DESKTOP_MODE_ID ? "default" : context.scale,
  };
}
