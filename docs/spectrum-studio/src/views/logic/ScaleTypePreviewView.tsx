// Copyright 2026 Adobe. All rights reserved.
import { NumberField, Picker, PickerItem } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import { ScaleTypeGraph } from "../../components/logic/ScaleTypeGraph";
import { rulesAtom } from "../../features/logic/library";
import { NO_ROUNDING_RULE_ID } from "../../features/logic/model";
import {
  generateScale,
  scaleIssues,
  SCALE_ABOVE_MAX,
  SCALE_BELOW_MAX,
} from "../../features/scales/generate";
import type { ScaleType } from "../../features/scales/scaleType";
import { TypeScaleComparison } from "./TypeScaleComparison";
import "../chartLayout.css";

const viewStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const controlsStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 12,
});
const panelStyles = style({
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 16,
  minWidth: 0,
});
const headingStyles = style({ font: "title", margin: 0 });
const graphHeadingStyles = style({
  font: "title-sm",
  fontSize: "[14px]",
  margin: 0,
});
const noteStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});
const tableWrapperStyles = style({ overflow: "auto", maxHeight: 360 });
const tableStyles = style({
  width: "full",
  borderCollapse: "collapse",
  font: "code-sm",
});
const headerCellStyles = style({
  textAlign: "end",
  font: "detail",
  color: "neutral-subdued",
  paddingY: 4,
  paddingX: 8,
  position: "sticky",
  top: 0,
  backgroundColor: "layer-1",
});
const cellStyles = style({
  textAlign: "end",
  paddingY: 4,
  paddingX: 8,
  borderTopWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
});
const baseCellStyles = style({
  textAlign: "end",
  paddingY: 4,
  paddingX: 8,
  borderTopWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
  fontWeight: "bold",
});

function format(value: number) {
  return Number.isFinite(value)
    ? String(Math.round(value * 10000) / 10000)
    : "invalid";
}

/** A large graph and a table of sample outputs for the scale type being edited, using throwaway preview inputs. */
export function ScaleTypePreviewView({ scaleType }: { scaleType: ScaleType }) {
  const rules = useAtomValue(rulesAtom).filter(
    (rule) => rule.type === "rounding",
  );
  const [below, setBelow] = useState(4);
  const [above, setAbove] = useState(12);
  const [roundingRuleId, setRoundingRuleId] = useState(NO_ROUNDING_RULE_ID);

  const values = useMemo(
    () =>
      scaleType.kind === "type-scale"
        ? []
        : generateScale(
            {
              scaleTypeId: scaleType.id,
              below,
              above,
              parameters: {},
              roundingRuleId,
            },
            { scaleTypes: [scaleType], rules },
          ),
    [scaleType, below, above, roundingRuleId, rules],
  );
  const issues = scaleIssues(values);

  return (
    <div
      className={`${viewStyles} chartViewContainer`}
      data-component="ScaleTypePreviewView"
    >
      <section className={panelStyles} aria-label="Preview settings">
        <h3 className={headingStyles}>Preview</h3>
        <p className={noteStyles}>
          The preview uses this formula's own values. The steps below are only
          for the preview; each foundation sets its own.
        </p>
        <div className={controlsStyles}>
          <NumberField
            label="Smaller values"
            value={below}
            minValue={0}
            maxValue={SCALE_BELOW_MAX}
            onChange={(value) => Number.isFinite(value) && setBelow(value)}
          />
          <NumberField
            label="Larger values"
            value={above}
            minValue={0}
            maxValue={SCALE_ABOVE_MAX}
            onChange={(value) => Number.isFinite(value) && setAbove(value)}
          />
          <Picker
            label="Rounding"
            selectedKey={roundingRuleId}
            onSelectionChange={(key) =>
              key != null && setRoundingRuleId(String(key))
            }
          >
            {rules.map((rule) => (
              <PickerItem key={rule.id} id={rule.id} textValue={rule.name}>
                {rule.name}
              </PickerItem>
            ))}
          </Picker>
        </div>
      </section>
      {scaleType.kind === "type-scale" ? (
        <TypeScaleComparison
          formula={scaleType}
          below={below}
          above={above}
          roundingRuleId={roundingRuleId}
          rules={rules}
        />
      ) : (
        <>
          <section className={panelStyles} aria-label="Graph">
            <h3 className={graphHeadingStyles}>Graph</h3>
            <ScaleTypeGraph
              label={`${scaleType.name} values by index`}
              points={values}
            />
            <p className={noteStyles}>
              The line is the calculated value. Open circles are values after
              rounding.
            </p>
          </section>
          <section className={panelStyles} aria-label="Sample outputs">
            <h3 className={headingStyles}>Sample outputs</h3>
            {issues.includes("invalid") && (
              <p role="alert">
                Some values could not be calculated. Check the formula.
              </p>
            )}
            <div className={tableWrapperStyles}>
              <table className={tableStyles}>
                <thead>
                  <tr>
                    <th scope="col" className={headerCellStyles}>
                      Index
                    </th>
                    <th scope="col" className={headerCellStyles}>
                      Token step
                    </th>
                    <th scope="col" className={headerCellStyles}>
                      Calculated
                    </th>
                    <th scope="col" className={headerCellStyles}>
                      Rounded
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {values.map((point) => {
                    const cell =
                      point.index === 0 ? baseCellStyles : cellStyles;
                    return (
                      <tr key={point.index}>
                        <td className={cell}>{point.index}</td>
                        <td className={cell}>{point.step}</td>
                        <td className={cell}>{format(point.raw)}</td>
                        <td className={cell}>{format(point.value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
