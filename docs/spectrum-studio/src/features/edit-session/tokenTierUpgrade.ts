// Copyright 2026 Adobe. All rights reserved.
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** Accepts an authoring snapshot or the system object of an imported dataset. */
export function upgradeTokenTierData(input: unknown): unknown {
  if (!object(input)) return input;
  const taxonomy = input.taxonomy;
  const edits = input.browserTokenEdits;
  return {
    ...input,
    ...(object(taxonomy) &&
      Array.isArray(taxonomy.categories) && {
        taxonomy: {
          ...taxonomy,
          categories: taxonomy.categories.map((category: unknown) => {
            if (!object(category) || !("appliesTo" in category))
              return category;
            if (
              !["raw", "purpose", "both"].includes(String(category.appliesTo))
            )
              return category;
            const { appliesTo, ...rest } = category;
            return {
              ...rest,
              ...(category.allowedTokenTiers === undefined &&
                appliesTo !== "both" && {
                  allowedTokenTiers:
                    appliesTo === "raw"
                      ? ["primitive"]
                      : ["semantic", "component"],
                }),
            };
          }),
        },
      }),
    ...(object(edits) && {
      browserTokenEdits: Object.fromEntries(
        Object.entries(edits).map(([id, edit]) => {
          if (!object(edit) || !object(edit.authoring)) return [id, edit];
          const manual = edit.authoring.manual;
          if (
            !object(manual) ||
            manual.tier !== undefined ||
            manual.scope !== "structures"
          )
            return [id, edit];
          return [
            id,
            {
              ...edit,
              authoring: {
                ...edit.authoring,
                manual: { ...manual, tier: "semantic" },
              },
            },
          ];
        }),
      ),
    }),
  };
}
