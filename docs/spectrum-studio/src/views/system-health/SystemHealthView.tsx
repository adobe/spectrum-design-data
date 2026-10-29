// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { BentoCard } from "../../components/BentoCard";
import { BentoGrid } from "../../components/BentoGrid";
import type { HealthPillarId } from "../../features/insights/model";
import { systemInsightsAtom } from "../../features/insights/state";
import { appColorSchemeAtom } from "../../features/modes/capabilities";
import { spectrumChromeClassName } from "../../utils/spectrumChrome";
import { AttentionQueue } from "./AttentionQueue";
import { DerivationBreakdown } from "./DerivationBreakdown";
import { FoundationCoverage } from "./FoundationCoverage";
import { HealthSummary } from "./HealthSummary";
import { ModeAccessibility } from "./ModeAccessibility";
import { PlatformDivergence } from "./PlatformDivergence";
import "./SystemHealth.css";

export default function SystemHealthView() {
  const insights = useAtomValue(systemInsightsAtom);
  const colorScheme = useAtomValue(appColorSchemeAtom);
  const pillar = (id: HealthPillarId) =>
    insights.pillars.find((candidate) => candidate.id === id);

  return (
    <div
      data-component="SystemHealth"
      className={`${spectrumChromeClassName(colorScheme)} ${style({
        display: "flex",
        flexDirection: "column",
        height: "full",
        overflowY: "auto",
      })}`}
    >
      <BentoGrid>
        <header
          className={style({
            gridColumnStart: "[1]",
            gridColumnEnd: "[span 4]",
          })}
        >
          <h1 className={style({ font: "heading-lg", margin: 0 })}>
            System health
          </h1>
          <p
            className={style({
              font: "body-sm",
              color: "gray-700",
              marginTop: 8,
              marginBottom: 0,
            })}
          >
            Sample data previews system health. Live metrics are not connected
            yet.
          </p>
        </header>
        <BentoCard colSpan={4}>
          <HealthSummary pillars={insights.pillars} />
        </BentoCard>
        <BentoCard colSpan={2} rowSpan={2}>
          <AttentionQueue
            items={insights.attention}
            pillars={insights.pillars}
          />
        </BentoCard>
        <BentoCard colSpan={2} rowSpan={2}>
          <PlatformDivergence
            cells={insights.divergence.cells}
            topTokens={insights.divergence.topTokens}
            pillar={pillar("consistency")}
          />
        </BentoCard>
        <BentoCard colSpan={2}>
          <DerivationBreakdown
            derivation={insights.derivation}
            pillar={pillar("systematicity")}
          />
        </BentoCard>
        <BentoCard colSpan={2}>
          <ModeAccessibility
            combinations={insights.accessibility}
            pillar={pillar("accessibility")}
          />
        </BentoCard>
        <BentoCard colSpan={4}>
          <FoundationCoverage
            coverage={insights.coverage}
            pillar={pillar("adaptivity")}
          />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
