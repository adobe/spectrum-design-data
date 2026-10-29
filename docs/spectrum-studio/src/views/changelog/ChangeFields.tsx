// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Badge } from "@react-spectrum/s2";
import MagicWand from "@react-spectrum/s2/icons/MagicWand";
import Revert from "@react-spectrum/s2/icons/Revert";
import { useId } from "react";
import { ValuePreview } from "../../components/value-preview/ValuePreview";
import type { ChangeField, ChangeItem } from "../../features/changelog/changes";
import {
  fieldResetDisabledReason,
  generatedSourceDescription,
  groupChangedFields,
} from "./logPresentation";
import "./ChangeFields.css";

export interface ChangeFieldsProps {
  item: ChangeItem;
  editing: boolean;
  onReset: (field: ChangeField) => void;
}

export function ChangeFields({ item, editing, onReset }: ChangeFieldsProps) {
  const prefix = useId();
  const groups = groupChangedFields(item.fields);
  const row = (field: ChangeField, index: number) => {
    const disabledReason = fieldResetDisabledReason(field, editing);
    const reasonId = `${prefix}-${item.fields.indexOf(field)}`;
    const name = `${field.key}${field.context ? `, ${field.context.label}` : ""}`;
    return (
      <div
        className="changeFieldRow"
        key={field.id ?? `${field.key}:${field.context?.key ?? index}`}
      >
        {field.context && (
          <span className="changeFieldContext">{field.context.label}</span>
        )}
        <span className="changeFieldValues">
          {field.before !== undefined && (
            <span className="changelogValueSide changeFieldBefore">
              {field.beforePreview && (
                <ValuePreview preview={field.beforePreview} />
              )}
              <span>{field.before}</span>
            </span>
          )}
          {field.before !== undefined && field.after !== undefined && (
            <span aria-label="changed to">→</span>
          )}
          {field.after !== undefined && (
            <span className="changelogValueSide changeFieldAfter">
              {field.afterPreview && (
                <ValuePreview preview={field.afterPreview} />
              )}
              <span>{field.after}</span>
            </span>
          )}
          {field.generated && (
            <span
              role="img"
              aria-label={generatedSourceDescription(item)}
              title={generatedSourceDescription(item)}
            >
              <Badge
                size="S"
                variant="accent"
                fillStyle="subtle"
                aria-hidden="true"
              >
                <MagicWand />
              </Badge>
            </span>
          )}
        </span>
        <span title={disabledReason}>
          <ActionButton
            isQuiet
            isDisabled={!!disabledReason}
            aria-describedby={disabledReason ? reasonId : undefined}
            aria-label={`Reset ${name}`}
            onPress={() => onReset(field)}
          >
            <Revert />
          </ActionButton>
        </span>
        {disabledReason && (
          <span id={reasonId} className="changeFieldResetReason">
            {disabledReason}
          </span>
        )}
      </div>
    );
  };
  return (
    <dl className="changeFields">
      {[...groups].map(([label, fields]) => (
        <div className="changeFieldGroup" key={label}>
          <dt>{label}</dt>
          <dd>{fields.map(row)}</dd>
        </div>
      ))}
    </dl>
  );
}
