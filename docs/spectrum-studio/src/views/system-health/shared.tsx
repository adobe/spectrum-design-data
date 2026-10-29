// Copyright 2026 Adobe. All rights reserved.
import { Badge } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type {
  HealthPillar,
  HealthPillarId,
} from "../../features/insights/model";

const PILLAR_BADGE_VARIANTS = {
  systematicity: "indigo",
  accessibility: "seafoam",
  consistency: "fuchsia",
  adaptivity: "yellow",
  conformance: "cyan",
} as const satisfies Record<HealthPillarId, string>;

/** Pillar colors tie actions and evidence back to the health summary. */
export function PillarBadge({ pillar }: { pillar: HealthPillar }) {
  return (
    <Badge
      size="S"
      variant={PILLAR_BADGE_VARIANTS[pillar.id]}
      fillStyle="subtle"
    >
      {pillar.label}
    </Badge>
  );
}

export function ModuleHeading({
  id,
  title,
  description,
  pillar,
}: {
  id: string;
  title: string;
  description: string;
  pillar?: HealthPillar;
}) {
  return (
    <header
      className={style({
        display: "flex",
        flexDirection: "column",
        gap: 4,
        marginBottom: 16,
      })}
    >
      <div
        className={style({
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        })}
      >
        <h3 id={id} className={style({ font: "title", margin: 0 })}>
          {title}
        </h3>
        {pillar && <PillarBadge pillar={pillar} />}
      </div>
      <p className={style({ font: "body-sm", color: "gray-700", margin: 0 })}>
        {description}
      </p>
    </header>
  );
}
