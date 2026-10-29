// Copyright 2026 Adobe. All rights reserved.
import { Button, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import { useAtomValue, useSetAtom } from "jotai";
import { EditOnly } from "../../components/editable";
import { RuleCard } from "../../components/logic/RuleCard";
import { RuleEditorDialog } from "../../components/logic/RuleEditorDialog";
import { createRule } from "../../features/logic/model";
import { addRuleAtom, rulesAtom } from "../../features/logic/state";

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
const sectionHeaderStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
});
const sectionHeadingStyles = style({ font: "heading", margin: 0 });
const gridStyles = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fill, minmax(280px, 1fr))]",
  gap: 16,
});
const emptyStyles = style({ font: "body", color: "neutral-subdued" });

export function RulesView() {
  const rules = useAtomValue(rulesAtom);
  const addRule = useSetAtom(addRuleAtom);

  return (
    <section className={sectionStyles} aria-labelledby="logic-rules-heading">
      <div className={sectionHeaderStyles}>
        <h3 id="logic-rules-heading" className={sectionHeadingStyles}>
          Rules
        </h3>
        <EditOnly>
          <RuleEditorDialog
            trigger={
              <Button variant="accent">
                <Add />
                <Text>Add rule</Text>
              </Button>
            }
            title="New rule"
            createDraft={() => createRule("rounding")}
            onSave={addRule}
          />
        </EditOnly>
      </div>
      {rules.length === 0 ? (
        <p className={emptyStyles}>No rules yet.</p>
      ) : (
        <div className={gridStyles}>
          {rules.map((rule, index) => (
            <RuleCard key={rule.id} rule={rule} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
