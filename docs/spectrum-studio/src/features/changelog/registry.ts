// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import {
  FOUNDATION_MODE_ATTACHMENT_DEFAULTS,
  pruneFoundationModeAttachments,
  type FoundationModeAttachments,
} from "../../state/view/foundationModeAttachments";
import type {
  ChangeField,
  ChangeGroup,
  ChangeItem,
  ChangeTopic,
} from "./changes";
import { pathId, readPath, sameValue, type SourcePath } from "./contract";
import { createValuePreview } from "../tokens/valuePreview";

export type OverviewId = "system" | "foundations" | "design" | "components";
export interface DomainDefinition {
  topic: ChangeTopic;
  category: string;
  label: string;
  sourceKind: ChangeItem["sourceKind"];
  collection?: string;
  identity?: "id" | "conceptId";
}

export const CHANGE_DOMAINS = {
  colorSystem: {
    topic: "foundations",
    category: "color",
    label: "Color",
    sourceKind: "settings",
  },
  typography: {
    topic: "foundations",
    category: "typography",
    label: "Typography",
    sourceKind: "typography",
  },
  spacing: {
    topic: "foundations",
    category: "spacing",
    label: "Spacing",
    sourceKind: "spacing-scale",
    collection: "scales",
  },
  size: {
    topic: "foundations",
    category: "size",
    label: "Size",
    sourceKind: "size-scale",
    collection: "scales",
  },
  radius: {
    topic: "foundations",
    category: "radius",
    label: "Corner radius",
    sourceKind: "radius-scale",
    collection: "scales",
  },
  elevation: {
    topic: "foundations",
    category: "elevation",
    label: "Elevation",
    sourceKind: "elevation",
  },
  opacity: {
    topic: "foundations",
    category: "opacity",
    label: "Opacity",
    sourceKind: "opacity",
    collection: "levels",
  },
  taxonomy: {
    topic: "registry",
    category: "registry",
    label: "Registry",
    sourceKind: "taxonomy",
  },
  structures: {
    topic: "structures",
    category: "structures",
    label: "Structures",
    sourceKind: "structure",
    collection: "structures",
    identity: "conceptId",
  },
  components: {
    topic: "components",
    category: "components",
    label: "Components",
    sourceKind: "component",
    collection: "components",
  },
  rules: {
    topic: "logic",
    category: "rules",
    label: "Rules",
    sourceKind: "rule",
  },
  scaleTypes: {
    topic: "logic",
    category: "formulas",
    label: "Formulas",
    sourceKind: "scale-type",
  },
  interpolations: {
    topic: "logic",
    category: "interpolations",
    label: "Interpolations",
    sourceKind: "interpolation",
  },
  modeSets: {
    topic: "modes",
    category: "modes",
    label: "Modes",
    sourceKind: "mode-set",
  },
  platforms: {
    topic: "platforms",
    category: "platforms",
    label: "Platforms",
    sourceKind: "platform",
  },
  adaptiveClaims: {
    topic: "modes",
    category: "modes",
    label: "Adaptive claims",
    sourceKind: "adaptive-claim",
  },
  tokenOverrides: {
    topic: "tokens",
    category: "token-edits",
    label: "Token overrides",
    sourceKind: "token",
  },
  browserTokenEdits: {
    topic: "tokens",
    category: "token-edits",
    label: "Token edits",
    sourceKind: "token",
  },
  aliases: {
    topic: "tokens",
    category: "aliases",
    label: "Compatibility aliases",
    sourceKind: "compatibility-alias",
    collection: "tokens",
  },
} satisfies Record<keyof EditSessionSnapshot, DomainDefinition>;

const TOPIC_LABELS: Record<ChangeTopic, string> = {
  foundations: "Foundations",
  tokens: "Tokens",
  modes: "Modes",
  logic: "Logic",
  registry: "Registry",
  structures: "Structures",
  components: "Components",
  platforms: "Platforms",
};
export const FOUNDATION_LABELS: Record<string, string> = {
  color: "Color",
  typography: "Typography",
  spacing: "Spacing",
  size: "Size",
  radius: "Corner radius",
  elevation: "Elevation",
  opacity: "Opacity",
  motion: "Motion",
};
export const FIELD_EXCLUSIONS: Readonly<Record<string, string>> = {
  schemaVersion: "Storage format marker, not an authored value.",
  id: "Immutable collection identity; membership is tracked by its authored fields.",
  conceptId:
    "Immutable concept identity; membership is tracked by its authored fields.",
  nameBaseline:
    "Recovery baseline for manual editing, not an independent authored value.",
  baseline:
    "Recovery baseline for manual editing, not an independent authored value.",
  editedAt: "Edit timestamp, not design data.",
  semanticIdentities:
    "Stored random output identities; authored bindings and options own their Changes fields.",
};
export interface AuthoredSlot {
  id: string;
  category: string;
  foundation?: string;
  overview?: "design" | "components";
  changed: boolean;
  manual: boolean;
  manualCount?: number;
}
export interface AuthoringComparison {
  slots: AuthoredSlot[];
  groups: ChangeGroup[];
}
export function assertDomainCoverage(snapshot: EditSessionSnapshot): void {
  for (const key of Object.keys(snapshot)) {
    if (!(key in CHANGE_DOMAINS))
      throw new Error(
        `Changes has no registered coverage for authored domain "${key}".`,
      );
  }
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const label = (key: string) =>
  key
    .replace(
      /([a-z])([A-Z])/g,
      (_match, first: string, second: string) =>
        `${first} ${second.toLowerCase()}`,
    )
    .replace(/^./, (letter) => letter.toUpperCase());
const display = (value: unknown): string | undefined =>
  value === undefined
    ? undefined
    : typeof value === "string"
      ? value
      : JSON.stringify(value);

export function compareAuthoring(
  shipped: EditSessionSnapshot,
  working: EditSessionSnapshot,
  attachments: FoundationModeAttachments = pruneFoundationModeAttachments(
    FOUNDATION_MODE_ATTACHMENT_DEFAULTS,
    working.modeSets,
  ),
): AuthoringComparison {
  assertDomainCoverage(shipped);
  assertDomainCoverage(working);
  const slots: AuthoredSlot[] = [];
  const items: ChangeItem[] = [];
  function compareObject(
    definition: DomainDefinition,
    path: SourcePath,
    before: unknown,
    after: unknown,
    title: string,
    sourceKind = definition.sourceKind,
  ) {
    const fields: ChangeField[] = [];
    function walk(
      left: unknown,
      right: unknown,
      fieldPath: SourcePath,
      names: string[],
      collectionOrder = false,
    ) {
      const ruleMembers = (value: unknown): value is { id: string }[] =>
        Array.isArray(value) &&
        value.every(
          (item: unknown) => record(item) && typeof item.id === "string",
        );
      if (
        definition.category === "rules" &&
        !collectionOrder &&
        ruleMembers(left) &&
        ruleMembers(right) &&
        ["children", "branches"].includes(names.at(-1) ?? "")
      ) {
        const originals = new Map(left.map((item) => [item.id, item]));
        const latest = new Map(right.map((item) => [item.id, item]));
        for (const id of new Set([...originals.keys(), ...latest.keys()]))
          walk(
            originals.get(id),
            latest.get(id),
            [...fieldPath, { key: "id", id }],
            [...names, String([...latest.keys()].indexOf(id) + 1)],
          );
        walk(left, right, fieldPath, [...names, "order"], true);
        return;
      }
      const newStructureBinding =
        definition.topic === "structures" &&
        names[0] === "editor" &&
        ["visibilityBindings", "elements", "slots"].includes(
          names.at(-2) ?? "",
        ) &&
        (left === undefined || right === undefined);
      if ((record(left) || record(right)) && !newStructureBinding) {
        const keys = new Set([
          ...Object.keys(record(left) ? left : {}),
          ...Object.keys(record(right) ? right : {}),
        ]);
        for (const key of keys) {
          if (FIELD_EXCLUSIONS[key]) continue;
          if (definition.category === "opacity" && key === "rows") continue;
          // Source names with registered references are projections, not extra authored fields.
          if (
            key === "name" &&
            (record(right)
              ? right.nameRef
              : record(left)
                ? left.nameRef
                : undefined)
          )
            continue;
          walk(
            record(left) ? left[key] : undefined,
            record(right) ? right[key] : undefined,
            [...fieldPath, key],
            [...names, key],
          );
        }
        return;
      }
      const changed =
        collectionOrder && ruleMembers(left) && ruleMembers(right)
          ? !sameValue(
              left.map((item) => item.id),
              right.map((item) => item.id),
            )
          : !sameValue(left, right);
      const pathStrings = fieldPath.filter(
        (part): part is string => typeof part === "string",
      );
      const foundationIndex = pathStrings.indexOf("foundations");
      const foundation =
        definition.topic === "foundations"
          ? definition.category
          : foundationIndex >= 0
            ? pathStrings[foundationIndex + 1]
            : undefined;
      let manual =
        names.includes("overrideValue") ||
        (names.includes("overrides") &&
          !(definition.topic === "structures" && names[0] === "editor"));
      if (
        definition.topic === "foundations" &&
        (names[0] === "base" || names[0] === "parameters")
      ) {
        const scale = readPath(working, path);
        const formula = record(scale)
          ? working.scaleTypes?.find((item) => item.id === scale.scaleTypeId)
          : undefined;
        const part =
          names[0] === "base"
            ? formula?.base
            : formula?.parameters.find((item) => item.id === names[1]);
        manual ||=
          right !== undefined &&
          part?.overridable === true &&
          !sameValue(right, part.default);
      }
      const manualCount = Array.isArray(right)
        ? right.filter(
            (entry: unknown) =>
              record(entry) && entry.overrideValue !== undefined,
          ).length
        : undefined;
      slots.push({
        id: pathId(fieldPath),
        category: definition.category,
        foundation,
        overview:
          definition.topic === "structures"
            ? "design"
            : definition.topic === "components"
              ? "components"
              : undefined,
        changed,
        manual: manual && right !== undefined,
        manualCount,
      });
      if (!changed) return;
      const key = names.map(label).join(" / ") || "Value";
      const previewKind =
        typeof (right ?? left) === "number" && foundation === "opacity"
          ? "opacity"
          : typeof (right ?? left) === "number" && foundation === "radius"
            ? "radius"
            : names.at(-1) === "color" && typeof (right ?? left) === "string"
              ? "color"
              : undefined;
      fields.push({
        id: pathId(fieldPath),
        key,
        address: {
          path: fieldPath,
          expected: right,
          ...(collectionOrder && { collectionOrder: true }),
        },
        before: display(left),
        after: display(right),
        ...(previewKind &&
          (typeof left === "string" || typeof left === "number") && {
            beforePreview: createValuePreview(previewKind, left),
          }),
        ...(previewKind &&
          (typeof right === "string" || typeof right === "number") && {
            afterPreview: createValuePreview(previewKind, right),
          }),
      });
    }
    walk(before, after, path, []);
    if (fields.length)
      items.push({
        id: pathId(path),
        topic: definition.topic,
        sourceKind,
        title,
        kind:
          before === undefined
            ? "new"
            : after === undefined
              ? "removed"
              : "modified",
        fields,
        addresses: fields.flatMap((field) =>
          field.address ? [field.address] : [],
        ),
        ...(sameValue(after, readPath(working, path)) && {
          address: { path, expected: after },
        }),
      });
  }
  function collection(
    definition: DomainDefinition,
    path: SourcePath,
    before: unknown,
    after: unknown,
    sourceKind = definition.sourceKind,
  ) {
    const key = definition.identity ?? "id";
    const originals = new Map(
      (Array.isArray(before) ? before : [])
        .filter(record)
        .map((item) => [String(item[key]), item]),
    );
    const latest = new Map(
      (Array.isArray(after) ? after : [])
        .filter(record)
        .map((item) => [String(item[key]), item]),
    );
    for (const id of new Set([...originals.keys(), ...latest.keys()])) {
      const left = originals.get(id),
        right = latest.get(id),
        value = right ?? left;
      const name = record(value?.declaration)
        ? value.declaration.displayName
        : value?.name;
      compareObject(
        definition,
        [...path, { key, id }],
        left,
        right,
        typeof name === "string"
          ? name
          : sourceKind === "contrast"
            ? `Contrast ${String(value?.value)}`
            : `${definition.label} / ${id}`,
        sourceKind,
      );
    }
  }
  for (const [domain, definition] of Object.entries(CHANGE_DOMAINS)) {
    const before = readPath(shipped, [domain]),
      after = readPath(working, [domain]);
    if (domain === "colorSystem") {
      const colorCollections = {
        palette: "palette-color",
        scales: "scale",
        dataVisScales: "data-vis-scale",
        contrasts: "contrast",
        surfaces: "surface",
      } as const;
      for (const [key, kind] of Object.entries(colorCollections))
        collection(
          definition,
          [domain, key],
          readPath(before, [key]),
          readPath(after, [key]),
          kind,
        );
      const settingsBefore = record(before)
        ? Object.fromEntries(
            Object.entries(before).filter(
              ([key]) => !(key in colorCollections),
            ),
          )
        : before;
      const settingsAfter = record(after)
        ? Object.fromEntries(
            Object.entries(after).filter(([key]) => !(key in colorCollections)),
          )
        : after;
      compareObject(
        definition,
        [domain],
        settingsBefore,
        settingsAfter,
        "Color settings",
      );
    } else if (domain === "taxonomy") {
      for (const key of ["categories", "terms"])
        collection(
          definition,
          [domain, key],
          readPath(before, [key]),
          readPath(after, [key]),
        );
      for (const key of ["order", "classifications"])
        compareObject(
          definition,
          [domain, key],
          readPath(before, [key]),
          readPath(after, [key]),
          `Registry ${key}`,
        );
    } else if ("collection" in definition) {
      collection(
        definition,
        [domain, definition.collection],
        readPath(before, [definition.collection]),
        readPath(after, [definition.collection]),
      );
      if (domain === "opacity") {
        const left = readPath(before, ["levels"]);
        const right = readPath(after, ["levels"]);
        const ids = (value: unknown) =>
          Array.isArray(value)
            ? value.filter(record).map((level) => level.id)
            : [];
        const changed = !sameValue(ids(left), ids(right));
        slots.push({
          id: pathId([domain, "levelOrder"]),
          category: "opacity",
          foundation: "opacity",
          changed,
          manual: false,
        });
        if (changed) {
          const address = {
            path: [domain, "levels"],
            expected: right,
            collectionOrder: true,
          };
          items.push({
            id: pathId([domain, "levelOrder"]),
            topic: "foundations",
            sourceKind: "opacity",
            title: "Opacity order",
            kind: "modified",
            address,
            fields: [
              {
                key: "Level order",
                before: display(ids(left)),
                after: display(ids(right)),
                address,
              },
            ],
          });
        }
      }
      // Pending rule documents and other document fields must not disappear behind a collection.
      const rest = (value: unknown) =>
        record(value)
          ? Object.fromEntries(
              Object.entries(value).filter(
                ([key]) => key !== definition.collection,
              ),
            )
          : value;
      compareObject(
        definition,
        [domain],
        rest(before),
        rest(after),
        `${definition.label} settings`,
      );
    } else if (Array.isArray(before) || Array.isArray(after)) {
      collection(definition, [domain], before, after);
      if (domain === "modeSets") {
        // Mode values belong to their foundation as well as their System storage owner.
        const left = Array.isArray(before) ? before.filter(record) : [],
          right = Array.isArray(after) ? after.filter(record) : [];
        for (const setId of new Set(
          [...left, ...right].map((set) => String(set.id)),
        )) {
          const original = left.find((set) => set.id === setId),
            latest = right.find((set) => set.id === setId);
          // Replace the bundled modes field with individual mode cards and mode-specific slots.
          const parent = items.find(
            (item) => item.id === pathId([domain, { key: "id", id: setId }]),
          );
          if (parent) {
            parent.fields = parent.fields.filter(
              (field) => field.key !== "Modes",
            );
            parent.addresses = parent.fields.flatMap((field) =>
              field.address ? [field.address] : [],
            );
            if (parent.kind === "modified") delete parent.address;
          }
          for (let index = slots.length - 1; index >= 0; index--) {
            if (
              slots[index].id ===
              pathId([domain, { key: "id", id: setId }, "modes"])
            )
              slots.splice(index, 1);
          }
          collection(
            { ...definition, sourceKind: "mode" },
            [domain, { key: "id", id: setId }, "modes"],
            original?.modes,
            latest?.modes,
            "mode",
          );
        }
      }
    } else if (
      domain === "tokenOverrides" ||
      domain === "browserTokenEdits" ||
      domain === "adaptiveClaims"
    ) {
      const keys = new Set([
        ...Object.keys(record(before) ? before : {}),
        ...Object.keys(record(after) ? after : {}),
      ]);
      for (const key of keys)
        compareObject(
          definition,
          [domain, key],
          readPath(before, [key]),
          readPath(after, [key]),
          `${definition.label} / ${key}`,
        );
    } else {
      compareObject(definition, [domain], before, after, definition.label);
    }
  }
  compareObject(
    {
      topic: "modes",
      category: "modes",
      label: "Mode attachments",
      sourceKind: "mode-attachment",
    },
    ["attachments"],
    pruneFoundationModeAttachments(
      FOUNDATION_MODE_ATTACHMENT_DEFAULTS,
      shipped.modeSets,
    ),
    attachments,
    "Foundation mode attachments",
  );
  return {
    slots,
    groups: Object.entries(TOPIC_LABELS).flatMap(([topic, title]) => {
      const groupItems = items.filter(
        (item) => item.topic === topic && item.fields.length,
      );
      return groupItems.length
        ? [
            {
              id: topic as ChangeTopic,
              label: title,
              count: groupItems.reduce(
                (count, item) => count + item.fields.length,
                0,
              ),
              items: groupItems,
            },
          ]
        : [];
    }),
  };
}
