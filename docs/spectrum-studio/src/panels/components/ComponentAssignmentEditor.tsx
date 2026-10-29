// Copyright 2026 Adobe. All rights reserved.
import { useId, useState } from "react";
import { v4 as uuid } from "uuid";
import {
  ActionButton,
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  Content,
  Dialog,
  DialogContainer,
  Form,
  Heading,
  Picker,
  PickerItem,
  TextArea,
  TextField,
} from "@react-spectrum/s2";
import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2/TableView";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import type {
  ComponentAssignment,
  ComponentRecord,
  LiteralValue,
} from "../../features/components/model";
import { parseLiteral } from "../../features/components/model";
import {
  propertyValueIssue,
  type ComponentToken,
} from "../../features/components/references";
import { canonicalJson } from "../../features/design-data/canonicalJson";
import { reorderIds } from "../../features/components/ordering";
import { useComponentReordering } from "./useComponentReordering";

type AcceptedValue =
  | { kind: "literal"; value: LiteralValue }
  | { kind: "reference"; id: string };
const statesTableStyles = style({ width: "full", height: 180, minWidth: 0 });
export function ComponentAssignmentEditor({
  component,
  assignment,
  taxonomy,
  tokens,
  onApply,
  onCancel,
}: {
  component: ComponentRecord;
  assignment?: ComponentAssignment;
  taxonomy: TaxonomyDocument;
  tokens: readonly ComponentToken[];
  onApply: (row: ComponentAssignment) => void;
  onCancel: () => void;
}) {
  const category = taxonomy.categories.find(
    (category) => category.key === "property",
  )!;
  const properties = taxonomy.terms.filter(
    (term) => term.categoryId === category.id,
  );
  const [id] = useState(() => assignment?.id ?? uuid());
  const [propertyId, setPropertyId] = useState(
    assignment?.property.termId ?? properties[0]?.id ?? "",
  );
  const [partId, setPartId] = useState(assignment?.partId ?? "whole");
  const [description, setDescription] = useState(assignment?.description ?? "");
  const [context, setContext] = useState(assignment?.context ?? "");
  const [valueType, setValueType] = useState(assignment?.$valueType ?? "");
  const [states, setStates] = useState<string[]>(
    Array.isArray(assignment?.options?.state) ? assignment.options.state : [],
  );
  const [conditions, setConditions] = useState(() =>
    Object.entries(assignment?.options ?? {})
      .filter(([key]) => key !== "state")
      .map(([key, value]) => ({ key, value: String(value) })),
  );
  const [accepted, setAccepted] = useState<AcceptedValue | undefined>(() =>
    assignment
      ? "$ref" in assignment
        ? { kind: "reference", id: assignment.$ref! }
        : { kind: "literal", value: assignment.value }
      : undefined,
  );
  const [literalType, setLiteralType] = useState<
    "string" | "number" | "boolean" | "json"
  >(() => {
    if (!assignment || "$ref" in assignment) return "string";
    return typeof assignment.value === "number"
      ? "number"
      : typeof assignment.value === "boolean"
        ? "boolean"
        : typeof assignment.value === "string"
          ? "string"
          : "json";
  });
  const [error, setError] = useState("");
  const formId = useId();
  const stateRows = states.map((name) => ({
    id: component.identities.states[name],
    name,
  }));
  const dragAndDropHooks = useComponentReordering<{ id: string; name: string }>(
    true,
    `${component.id}-${id}-conditions`,
    (keys, target, position) => {
      const names = new Map(stateRows.map((row) => [row.id, row.name]));
      setStates(
        reorderIds(
          stateRows.map((row) => row.id),
          keys,
          target,
          position,
        ).map((id) => names.get(id)!),
      );
      setError("");
    },
    setError,
  );
  const property = String(
    properties.find((term) => term.id === propertyId)?.value ?? "",
  );
  const displayValue =
    accepted?.kind === "literal"
      ? typeof accepted.value === "string"
        ? accepted.value
        : canonicalJson(accepted.value)
      : "";
  return (
    <DialogContainer onDismiss={onCancel}>
      <Dialog size="L">
        <Heading slot="title">
          {assignment ? "Edit property assignment" : "Add property assignment"}
        </Heading>
        <Content>
          <Form
            id={formId}
            aria-label={
              assignment
                ? "Edit property assignment"
                : "Add property assignment"
            }
            UNSAFE_className="componentForm"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                if (!accepted)
                  throw new Error(
                    "Accept a value or choose a token before applying this assignment.",
                  );
                if (
                  new Set(conditions.map((condition) => condition.key)).size !==
                    conditions.length ||
                  conditions.some(
                    (condition) =>
                      !condition.key.trim() ||
                      !condition.value.trim() ||
                      condition.key === "state",
                  )
                )
                  throw new Error(
                    "Use distinct condition names and nonempty values. Choose states in the state list.",
                  );
                const options = {
                  ...Object.fromEntries(
                    conditions.map((condition) => [
                      condition.key,
                      condition.value,
                    ]),
                  ),
                  ...(states.length && { state: states }),
                };
                onApply({
                  id,
                  property: { categoryId: category.id, termId: propertyId },
                  ...(partId !== "whole" && { partId }),
                  ...(Object.keys(options).length && { options }),
                  description,
                  ...(context && { context }),
                  ...(valueType && { $valueType: valueType }),
                  ...(accepted.kind === "reference"
                    ? { $ref: accepted.id }
                    : { value: accepted.value }),
                });
                setError("");
              } catch (failure) {
                setError(
                  failure instanceof Error ? failure.message : String(failure),
                );
              }
            }}
          >
            <Picker
              label="Part"
              selectedKey={partId}
              onSelectionChange={(key) => setPartId(String(key))}
            >
              <PickerItem id="whole">Whole component</PickerItem>
              {Object.entries(component.identities.parts).map(([name, id]) => (
                <PickerItem key={id} id={id}>
                  {name}
                </PickerItem>
              ))}
            </Picker>
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- Focus follows the user's Add or Edit property action. */}
            <Picker
              label="Property"
              selectedKey={propertyId}
              onSelectionChange={(key) => setPropertyId(String(key))}
              autoFocus
            >
              {properties.map((term) => (
                <PickerItem key={term.id} id={term.id}>
                  {String(term.value)}
                </PickerItem>
              ))}
            </Picker>
            <Picker
              label="Literal type"
              selectedKey={literalType}
              onSelectionChange={(key) => {
                if (
                  key === "string" ||
                  key === "number" ||
                  key === "boolean" ||
                  key === "json"
                )
                  setLiteralType(key);
              }}
            >
              <PickerItem id="string">Text or length</PickerItem>
              <PickerItem id="number">Number</PickerItem>
              <PickerItem id="boolean">Boolean</PickerItem>
              <PickerItem id="json">Structured JSON</PickerItem>
            </Picker>
            <TokenComboBox
              label="Value"
              selectedKey={accepted?.kind === "reference" ? accepted.id : null}
              isRequired
              options={tokens.map((token) => ({
                id: token.id,
                kind: "token",
                name: token.name,
                displayValue: `${token.displayValue}${
                  Object.keys(token.context).length
                    ? ` (${Object.entries(token.context)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(", ")})`
                    : ""
                }`,
              }))}
              isOptionAllowed={(option) => {
                const token = tokens.find((token) => token.id === option.id);
                return (
                  !!token &&
                  !token.outputError &&
                  !propertyValueIssue(property, token.value)
                );
              }}
              onChange={(id) => {
                setAccepted(id ? { kind: "reference", id } : undefined);
                const target = tokens.find((token) => token.id === id);
                if (target)
                  setConditions((previous) => [
                    ...previous.filter(
                      (condition) => !(condition.key in target.context),
                    ),
                    ...Object.entries(target.context).map(([key, value]) => ({
                      key,
                      value: String(value),
                    })),
                  ]);
              }}
              customValue={{
                displayValue,
                onAccept: (text) => {
                  const value = parseLiteral(text, literalType);
                  const issue = propertyValueIssue(property, value);
                  if (issue) throw new Error(issue);
                  setAccepted({ kind: "literal", value });
                },
              }}
            />
            <p>
              Accept typed values with Use this value. Apply this form before
              saving the application.
            </p>
            <p>
              Choose published dimension, color, shadow or Structure tokens.
              Typography references are not supported in this first version.
            </p>
            {(component.declaration.states?.length ?? 0) > 0 && (
              <>
                <CheckboxGroup
                  label="States"
                  value={states}
                  onChange={setStates}
                >
                  {component.declaration.states!.map((state) => (
                    <Checkbox key={state.name} value={state.name}>
                      {state.name}
                    </Checkbox>
                  ))}
                </CheckboxGroup>
                {states.length > 0 && (
                  <TableView
                    aria-label="Selected state order"
                    styles={statesTableStyles}
                    dragAndDropHooks={dragAndDropHooks}
                  >
                    <TableHeader>
                      <Column id="state" isRowHeader>
                        State
                      </Column>
                    </TableHeader>
                    <TableBody items={stateRows}>
                      {(row) => (
                        <Row id={row.id} textValue={row.name}>
                          <Cell>{row.name}</Cell>
                        </Row>
                      )}
                    </TableBody>
                  </TableView>
                )}
              </>
            )}
            {conditions.map((condition, index) => (
              <div className="componentCondition" key={index}>
                <TextField
                  label="Condition name"
                  value={condition.key}
                  onChange={(key) =>
                    setConditions(
                      conditions.map((entry, position) =>
                        position === index ? { ...entry, key } : entry,
                      ),
                    )
                  }
                />
                <TextField
                  label="Condition value"
                  value={condition.value}
                  onChange={(value) =>
                    setConditions(
                      conditions.map((entry, position) =>
                        position === index ? { ...entry, value } : entry,
                      ),
                    )
                  }
                />
                <ActionButton
                  aria-label={`Remove condition ${index + 1}`}
                  onPress={() =>
                    setConditions(
                      conditions.filter((_, position) => position !== index),
                    )
                  }
                >
                  Remove
                </ActionButton>
              </div>
            ))}
            <ActionButton
              onPress={() =>
                setConditions([...conditions, { key: "", value: "" }])
              }
            >
              Add condition
            </ActionButton>
            <p>
              Conditions use text values. Boolean API options do not
              automatically become state conditions.
            </p>
            <TextField
              label="Context label"
              value={context}
              onChange={setContext}
              description="A human-readable note, not a matching condition."
            />
            <TextArea
              label="Description"
              value={description}
              onChange={setDescription}
            />
            <TextField
              label="Value schema URI"
              value={valueType}
              onChange={setValueType}
              description="Optional. Only a known, compatible schema can be used."
            />
            {error && <p role="alert">{error}</p>}
          </Form>
        </Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={onCancel}>
            Cancel changes
          </Button>
          <Button type="submit" form={formId} variant="primary">
            Apply changes
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogContainer>
  );
}
