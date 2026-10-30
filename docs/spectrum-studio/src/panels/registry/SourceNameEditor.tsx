// Copyright 2026 Adobe. All rights reserved.
import {
  ComboBox,
  ComboBoxItem,
  Content,
  ContextualHelp,
  TextField,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { useRegisteredSourceName } from "../../features/taxonomy/useRegisteredSourceName";
import { useRequestedFieldFocus } from "../../components/fields/useRequestedFieldFocus";
import { termLabel } from "../../features/taxonomy/termPresentation";

export function SourceNameEditor({
  sourceId,
  label,
  contextualHelp,
  presentation = "suggestions",
  focusName = false,
  onNameFocused,
}: {
  sourceId: string;
  label: string;
  contextualHelp?: string;
  presentation?: "suggestions" | "text";
  focusName?: boolean;
  onNameFocused?: () => void;
}) {
  const editable = useAtomValue(editModeAtom);
  const named = useRegisteredSourceName(
    sourceId,
    presentation === "suggestions",
  );
  const nameRef = useRequestedFieldFocus(
    focusName && editable && !!named.source,
    onNameFocused,
  );
  if (!named.source) return null;
  if (presentation === "text")
    return (
      <TextField
        label={label}
        value={named.input}
        onChange={named.setInput}
        ref={nameRef}
        isReadOnly={!editable}
        isRequired
        validationBehavior="aria"
        isInvalid={!!named.error}
        errorMessage={named.error || undefined}
        description={named.help}
        styles={style({ width: "full", minWidth: 0 })}
        onBlur={named.commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") named.commit();
        }}
      />
    );
  return (
    <>
      <ComboBox
        ref={nameRef}
        label={contextualHelp === undefined ? label : undefined}
        aria-label={contextualHelp === undefined ? undefined : label}
        inputValue={named.input}
        selectedKey={named.source.nameRef?.termId ?? null}
        defaultItems={named.terms}
        allowsCustomValue
        isReadOnly={!editable}
        styles={style({ width: "full", minWidth: 0 })}
        onInputChange={named.setInput}
        onSelectionChange={(id) => {
          if (typeof id === "string") named.choose(id);
        }}
        onBlur={named.commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") named.commit();
        }}
        isInvalid={!!named.error}
        errorMessage={named.error || undefined}
        description={contextualHelp === undefined ? named.help : undefined}
      >
        {(term) => (
          <ComboBoxItem id={term.id} textValue={termLabel(term.value)}>
            {termLabel(term.value)}
          </ComboBoxItem>
        )}
      </ComboBox>
      {contextualHelp !== undefined && (
        <ContextualHelp
          aria-label={`Help for palette color ${termLabel(named.source.name)}`}
        >
          <Content>
            {[named.help, contextualHelp].filter(Boolean).join(" ")}
          </Content>
        </ContextualHelp>
      )}
    </>
  );
}
