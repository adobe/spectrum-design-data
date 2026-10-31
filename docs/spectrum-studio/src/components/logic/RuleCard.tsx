// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../notifications/notificationContext";
import { ActionButton, Badge, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Delete from "@react-spectrum/s2/icons/Delete";
import Edit from "@react-spectrum/s2/icons/Edit";
import Lock from "@react-spectrum/s2/icons/Lock";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { EditOnly } from "../editable";
import type { Rule } from "../../features/logic/model";
import { ruleTypeLabel } from "../../features/logic/registry";
import {
  removeRuleAtom,
  replaceRuleAtom,
  restoreRuleAtom,
  ruleConsumersAtom,
  saveGeneratorDraftAtom,
} from "../../features/logic/state";
import { RuleEditorDialog } from "./RuleEditorDialog";
import { UsedByTags } from "./UsedByTags";

const cardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 20,
  minWidth: 0,
});
const headerStyles = style({
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: 12,
});
const titleRowStyles = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  minWidth: 0,
});
const titleStyles = style({ font: "title-lg", margin: 0 });
const actionsStyles = style({ display: "flex", gap: 4, flexShrink: 0 });

export function RuleCard({ rule, index }: { rule: Rule; index: number }) {
  const consumers = useAtomValue(ruleConsumersAtom).filter(
    (consumer) => consumer.ruleId === rule.id,
  );
  const replaceRule = useSetAtom(replaceRuleAtom);
  const saveGenerator = useSetAtom(saveGeneratorDraftAtom);
  const store = useStore();
  const notify = useNotify();

  function deleteRule() {
    notify.remove({
      kind: "rule",
      noun: rule.name,
      run: (store) => store.set(removeRuleAtom, rule.id),
      undo: (removed) => {
        if (removed) store.set(restoreRuleAtom, removed);
      },
    });
  }

  return (
    <article
      className={cardStyles}
      data-component="RuleCard"
      aria-label={rule.name}
      data-rule-id={rule.id}
      data-index={index}
    >
      <header className={headerStyles}>
        <div className={titleRowStyles}>
          <h3 className={titleStyles}>{rule.name}</h3>
          <Badge size="S" variant="neutral" fillStyle="subtle">
            {ruleTypeLabel(rule.type)}
          </Badge>
          {rule.locked && (
            <Badge size="S" variant="neutral" fillStyle="outline">
              <Lock />
              <Text>Built-in</Text>
            </Badge>
          )}
        </div>
        {!rule.locked && (
          <EditOnly>
            <div className={actionsStyles}>
              <RuleEditorDialog
                trigger={
                  <ActionButton isQuiet aria-label={`Edit rule ${rule.name}`}>
                    <Edit />
                  </ActionButton>
                }
                title="Edit rule"
                createDraft={() => structuredClone(rule)}
                onSave={(rule, edit) =>
                  edit ? saveGenerator({ rule, edit }) : replaceRule(rule)
                }
                onDelete={deleteRule}
              />
              <ActionButton
                isQuiet
                aria-label={`Delete rule ${rule.name}`}
                onPress={deleteRule}
              >
                <Delete />
              </ActionButton>
            </div>
          </EditOnly>
        )}
      </header>
      <UsedByTags consumers={consumers} />
    </article>
  );
}
