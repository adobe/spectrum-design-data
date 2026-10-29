// Copyright 2026 Adobe. All rights reserved.
import { StatusLight } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type {
  AttentionItem,
  AttentionSeverity,
  HealthPillar,
} from "../../features/insights/model";
import { ModuleHeading, PillarBadge } from "./shared";
import { foundationLabel, platformName } from "./labels";

const SEVERITY = {
  critical: { variant: "negative", label: "Critical" },
  warning: { variant: "notice", label: "Warning" },
  info: { variant: "informative", label: "Info" },
} as const satisfies Record<
  AttentionSeverity,
  { variant: string; label: string }
>;

function scopeLabel(item: AttentionItem) {
  return (
    [
      item.foundationId && foundationLabel(item.foundationId),
      item.platformId && platformName(item.platformId),
    ]
      .filter(Boolean)
      .join(" · ") || "System-wide"
  );
}

export function AttentionQueue({
  items,
  pillars,
}: {
  items: AttentionItem[];
  pillars: HealthPillar[];
}) {
  return (
    <section
      aria-labelledby="attention-heading"
      className={style({
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      })}
    >
      <ModuleHeading
        id="attention-heading"
        title="Needs attention"
        description={`${items.length} items, most urgent first`}
      />
      <ol className="homeAttentionList">
        {items.map((item) => {
          const pillar = pillars.find(
            (candidate) => candidate.id === item.pillarId,
          );
          return (
            <li key={item.id} className="homeAttentionItem">
              <div
                className={style({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                })}
              >
                <StatusLight size="S" variant={SEVERITY[item.severity].variant}>
                  {SEVERITY[item.severity].label}
                </StatusLight>
                {pillar && <PillarBadge pillar={pillar} />}
              </div>
              <p className={style({ font: "title-sm", margin: 0 })}>
                {item.title}
              </p>
              <p
                className={style({
                  font: "body-sm",
                  color: "gray-700",
                  margin: 0,
                })}
              >
                {item.impact}
              </p>
              <p
                className={style({
                  font: "detail-sm",
                  color: "gray-700",
                  margin: 0,
                })}
              >
                {scopeLabel(item)} ·{" "}
                <span
                  className={style({ color: "gray-900", fontWeight: "bold" })}
                >
                  {item.suggestedAction}
                </span>
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
