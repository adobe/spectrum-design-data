// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import type { Rule } from "../../features/logic/model";
import { interpolationsAtom } from "../../features/logic/scaleTypeLibrary";
import { modeSetsAtom } from "../../features/modes/state";
import type { ScaleType } from "../../features/scales/scaleType";
import { typographyDocumentAtom } from "../../features/typography/state";
import { buildTypeScaleComparisons } from "../../features/typography/comparisons";
import { TypographyComparisonView } from "../typography/TypographyComparisonView";

export function TypeScaleComparison({
  formula,
  below,
  above,
  roundingRuleId,
  rules,
}: {
  formula: ScaleType;
  below: number;
  above: number;
  roundingRuleId: string;
  rules: readonly Rule[];
}) {
  const document = useAtomValue(typographyDocumentAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const result = useMemo(() => {
    try {
      return {
        datasets: buildTypeScaleComparisons(formula, document, modeSets, {
          below,
          above,
          roundingRuleId,
          rules,
          interpolations,
        }),
      };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return { error: error.message };
    }
  }, [
    formula,
    document,
    modeSets,
    below,
    above,
    roundingRuleId,
    rules,
    interpolations,
  ]);
  return (
    <>
      <TypographyComparisonView {...result} />
      <p>
        The lines show calculated formula values. Open circles show values after
        rounding.
      </p>
    </>
  );
}
