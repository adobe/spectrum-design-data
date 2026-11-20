// Copyright 2026 Adobe. All rights reserved.
import { Button, Tab, TabList, TabPanel, Tabs, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useNotify } from "../../components/notifications/notificationContext";
import { EditOnly } from "../../components/editable";
import { RuleCard } from "../../components/logic/RuleCard";
import { RuleEditorDialog } from "../../components/logic/RuleEditorDialog";
import { createRule } from "../../features/logic/model";
import {
  groupRulesByType,
  rulePresentation,
  RULE_SECTIONS,
} from "../../features/logic/rulePresentation";
import { rulesTabAtom } from "../../state/view/logicView";
import {
  addRuleAtom,
  rulesAtom,
  saveGeneratorDraftAtom,
} from "../../features/logic/state";

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
const tabPanelStyles = style({ marginTop: 16 });
const gridStyles = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fill, minmax(280px, 1fr))]",
  gap: 16,
});
const emptyStyles = style({ font: "body", color: "neutral-subdued" });

export function RulesView() {
  const [tab, setTab] = useAtom(rulesTabAtom);
  const notify = useNotify();
  const rules = useAtomValue(rulesAtom);
  const addRule = useSetAtom(addRuleAtom);
  const saveGenerator = useSetAtom(saveGeneratorDraftAtom);

  return (
    <section aria-label="Rule library">
      <Tabs
        density="compact"
        aria-label="Rule types"
        selectedKey={tab}
        onSelectionChange={(key) => {
          const section = RULE_SECTIONS.find((section) => section.type === key);
          if (section) setTab(section.type);
        }}
      >
        <TabList>
          {RULE_SECTIONS.map((section) => (
            <Tab key={section.type} id={section.type}>
              {section.tabLabel}
            </Tab>
          ))}
        </TabList>
        {groupRulesByType(rules).map((section) => (
          <TabPanel
            key={section.type}
            id={section.type}
            styles={tabPanelStyles}
          >
            <section className={sectionStyles} aria-label={section.label}>
              <EditOnly>
                <RuleEditorDialog
                  trigger={
                    <Button variant="accent">
                      <Add />
                      <Text>Add rule</Text>
                    </Button>
                  }
                  title="New rule"
                  createDraft={() => createRule(section.type)}
                  onSave={(rule, edit) =>
                    notify.added("rule", () => {
                      if (edit) saveGenerator({ rule, edit });
                      else addRule(rule);
                      setTab(rulePresentation(rule.type).type);
                      return true;
                    })
                  }
                />
              </EditOnly>
              {section.rules.length === 0 ? (
                <p className={emptyStyles}>No rules yet.</p>
              ) : (
                <div className={gridStyles}>
                  {section.rules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      index={rules.indexOf(rule)}
                    />
                  ))}
                </div>
              )}
            </section>
          </TabPanel>
        ))}
      </Tabs>
    </section>
  );
}
