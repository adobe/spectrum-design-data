// Copyright 2026 Adobe. All rights reserved.
import { InlineAlert, Content, Heading } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ConsumerImpact } from "../../features/logic/consumers";

const listStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  margin: 0,
  padding: 0,
  listStyleType: "none",
});
const itemStyles = style({ font: "body-sm" });
const emptyStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});

const ISSUE_TEXT = {
  duplicate:
    "Some values round to the same number, so their tokens would match.",
  "non-positive": "Some values round to zero or below.",
  invalid: "Some values could not be calculated.",
} as const;

/** How the draft would change each foundation that references the rule. */
export function RuleUsedBy({
  impacts,
}: {
  impacts: readonly ConsumerImpact[];
}) {
  if (impacts.length === 0)
    return (
      <p className={emptyStyles}>Not used by any foundation or Structure.</p>
    );
  const issues = impacts.flatMap((impact) =>
    impact.issues.map((issue) => ({
      label: impact.consumer.label,
      issue,
      radius: impact.consumer.slot.foundation === "radius",
    })),
  );
  const errors = [...new Set(impacts.flatMap((impact) => impact.errors ?? []))];
  const warnings = [
    ...new Set(impacts.flatMap((impact) => impact.warnings ?? [])),
  ];
  return (
    <>
      <ul className={listStyles} aria-label="Used by">
        {impacts.map((impact) => (
          <li key={impact.consumer.id} className={itemStyles}>
            {impact.consumer.label}:{" "}
            {impact.errors?.length
              ? "generation needs repair"
              : impact.inactive
                ? "inactive for the selected token value types; binding retained"
                : impact.changed === 0
                  ? "no values change"
                  : `${impact.changed} of ${impact.total} values change`}
          </li>
        ))}
      </ul>
      {errors.length > 0 && (
        <InlineAlert variant="negative">
          <Heading>Check affected generation</Heading>
          <Content>{errors.join(" ")}</Content>
        </InlineAlert>
      )}
      {warnings.length > 0 && (
        <InlineAlert variant="notice">
          <Heading>Nearest available targets</Heading>
          <Content>{warnings.join(" ")}</Content>
        </InlineAlert>
      )}
      {issues.length > 0 && (
        <InlineAlert variant="notice">
          <Heading>Check affected foundations</Heading>
          <Content>
            {issues
              .map(
                ({ label, issue, radius }) =>
                  `${label}: ${radius && issue === "non-positive" ? "Some radii are negative; zero is valid." : ISSUE_TEXT[issue]}`,
              )
              .join(" ")}
          </Content>
        </InlineAlert>
      )}
    </>
  );
}
