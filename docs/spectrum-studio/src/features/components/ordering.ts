// Copyright 2026 Adobe. All rights reserved.
import type { ComponentRecord } from "./model";

export type DeclarationSection = "parts" | "options" | "states";

export function reorderIds(
  order: readonly string[],
  keys: ReadonlySet<string>,
  target: string,
  position: "before" | "after",
): string[] {
  const available = new Set(order);
  if (
    available.size !== order.length ||
    !keys.size ||
    !available.has(target) ||
    [...keys].some((id) => !available.has(id))
  ) {
    throw new Error(
      "These rows changed. Reopen the table before reordering them.",
    );
  }
  if (keys.has(target)) return [...order];
  const moving = order.filter((id) => keys.has(id));
  const remaining = order.filter((id) => !keys.has(id));
  remaining.splice(
    remaining.indexOf(target) + (position === "after" ? 1 : 0),
    0,
    ...moving,
  );
  return remaining;
}

export function declarationNames(
  component: ComponentRecord,
  section: DeclarationSection,
): string[] {
  if (section === "parts")
    return component.declaration.anatomy?.map((part) => part.name) ?? [];
  if (section === "states")
    return component.declaration.states?.map((state) => state.name) ?? [];
  const names = new Map(
    Object.entries(component.identities.options).map(([name, id]) => [
      id,
      name,
    ]),
  );
  return component.optionOrder.map((id) => {
    const name = names.get(id);
    if (name === undefined)
      throw new Error("The option order references an unavailable option.");
    return name;
  });
}

export function reorderDeclarations(
  component: ComponentRecord,
  section: DeclarationSection,
  keys: ReadonlySet<string>,
  target: string,
  position: "before" | "after",
): ComponentRecord {
  const ids = declarationNames(component, section).map(
    (name) => component.identities[section][name],
  );
  const order = reorderIds(ids, keys, target, position);
  const next = structuredClone(component);
  if (section === "options") next.optionOrder = order;
  else if (section === "parts") {
    const parts = new Map(
      next.declaration.anatomy?.map((part) => [
        next.identities.parts[part.name],
        part,
      ]),
    );
    next.declaration.anatomy = order.map((id) => parts.get(id)!);
  } else {
    const states = new Map(
      next.declaration.states?.map((state) => [
        next.identities.states[state.name],
        state,
      ]),
    );
    next.declaration.states = order.map((id) => states.get(id)!);
  }
  return next;
}
