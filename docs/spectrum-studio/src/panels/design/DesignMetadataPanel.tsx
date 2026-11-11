// Copyright 2026 Adobe. All rights reserved.
import {
  Accordion,
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  Text,
  TextArea,
} from "@react-spectrum/s2";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Panel } from "../../components/Panel";
import { FieldLabel } from "../../components/fields/FieldLabel";
import { EditableTextField } from "../../components/editable";
import "./DesignPanels.css";

export function DesignMetadataPanel({
  label,
  name,
  onRename,
  description,
  usedIn,
  generation,
  layers,
  isReadOnly,
  report,
}: {
  label: string;
  name: string;
  onRename: (name: string) => void;
  description?: { value: string; onChange: (value: string) => void };
  usedIn: ReactNode;
  generation?: ReactNode;
  layers?: ReactNode;
  isReadOnly: boolean;
  report: (error: unknown) => void;
}) {
  const [draft, setDraft] = useState(name);
  const usedInId = useId();
  useEffect(() => setDraft(name), [name]);
  return (
    <Panel label={label} className="designMetadataPanel">
      <Accordion
        size="S"
        density="spacious"
        allowsMultipleExpanded
        defaultExpandedKeys={["metadata", "generation", "layers"]}
      >
        <AccordionItem id="metadata">
          <AccordionItemTitle>Metadata</AccordionItemTitle>
          <AccordionItemPanel>
            <div className="structureEditorFields">
              <EditableTextField
                size="S"
                label="Name"
                isRequired
                value={draft}
                onChange={setDraft}
                isReadOnly={isReadOnly}
                onBlur={() => {
                  if (isReadOnly || draft === name) return;
                  try {
                    onRename(draft);
                  } catch (failure) {
                    setDraft(name);
                    report(failure);
                  }
                }}
              />
              {description && (
                <TextArea
                  size="S"
                  label="Description"
                  value={description.value}
                  isReadOnly={isReadOnly}
                  onChange={(value) => {
                    try {
                      description.onChange(value);
                    } catch (failure) {
                      report(failure);
                    }
                  }}
                />
              )}
              <FieldLabel size="S" id={usedInId}>
                Used in
              </FieldLabel>
              <Text aria-labelledby={usedInId}>{usedIn}</Text>
            </div>
          </AccordionItemPanel>
        </AccordionItem>
        {generation && (
          <AccordionItem id="generation">
            <AccordionItemTitle>Generated variants</AccordionItemTitle>
            <AccordionItemPanel>{generation}</AccordionItemPanel>
          </AccordionItem>
        )}
        {layers && (
          <AccordionItem id="layers">
            <AccordionItemTitle>Layers</AccordionItemTitle>
            <AccordionItemPanel>{layers}</AccordionItemPanel>
          </AccordionItem>
        )}
      </Accordion>
    </Panel>
  );
}
