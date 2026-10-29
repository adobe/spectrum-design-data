// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  ContextualHelp,
  Form,
  PickerItem,
  Provider,
  type TextFieldRef,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Provider as AtomProvider } from "jotai";
import { useRef, useState, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { EditablePicker } from "../../../src/components/editable/EditablePicker";
import { EditableNumberField } from "../../../src/components/editable/EditableNumberField";
import { NumberField } from "../../../src/components/fields/NumberField";
import { Picker } from "../../../src/components/fields/Picker";
import "../../../src/index.css";

const values = [
  { id: "px", name: "Pixels" },
  { id: "rem", name: "Root em" },
  {
    id: "long",
    name: "AnUnusuallyLongSelectedValueThatMustStayInsideItsAllocatedColumn",
  },
];
const callerStyles = style({ marginTop: 8 });
const colorScheme =
  new URLSearchParams(window.location.search).get("theme") === "dark"
    ? "dark"
    : "light";

export function Fixture() {
  const [readOnly, setReadOnly] = useState(false);
  const [selectedKey, setSelectedKey] = useState("px");
  const [editCount, setEditCount] = useState(0);
  const [number, setNumber] = useState(14);
  const numberRef = useRef<TextFieldRef>(null);
  const displayValue = values.find((value) => value.id === selectedKey)!.name;
  const common = {
    selectedKey,
    displayValue,
    isReadOnly: readOnly,
    onSelectionChange: (key: string | number | null) => {
      if (key !== null) setSelectedKey(String(key));
    },
    children: values.map((value) => (
      <PickerItem key={value.id} id={value.id}>
        {value.name}
      </PickerItem>
    )),
  };
  const fields: {
    id: string;
    props: Omit<
      ComponentProps<typeof EditablePicker>,
      "displayValue" | "children"
    >;
  }[] = [
    {
      id: "default-grid",
      props: { label: "Output format", labelPosition: "side" },
    },
    {
      id: "explicit-grid",
      props: { label: "Explicit grid", labelPosition: "side", layout: "grid" },
    },
    {
      id: "legacy-flex",
      props: { label: "Compact", labelPosition: "side", layout: "flex" },
    },
    {
      id: "top",
      props: { label: "Top label", labelPosition: "top", layout: "grid" },
    },
    { id: "omitted", props: { label: "Default side label" } },
    {
      id: "quiet-grid",
      props: { label: "Quiet grid", labelPosition: "side", isQuiet: true },
    },
    {
      id: "quiet-long",
      props: {
        label: "Quiet long value",
        labelPosition: "side",
        isQuiet: true,
        selectedKey: "long",
      },
    },
    {
      id: "quiet-flex",
      props: {
        label: "Quiet compact",
        labelPosition: "side",
        isQuiet: true,
        layout: "flex",
      },
    },
    {
      id: "long",
      props: {
        label:
          "AnUnusuallyLongUnbrokenLabelThatMustWrapInsideItsAllocatedColumn",
        labelPosition: "side",
        selectedKey: "long",
      },
    },
    {
      id: "small",
      props: { label: "Small field", labelPosition: "side", size: "S" },
    },
    {
      id: "large",
      props: {
        label: "Large field",
        labelPosition: "side",
        size: "XL",
        labelAlign: "end",
      },
    },
    {
      id: "styled",
      props: {
        label: "Caller styling",
        labelPosition: "side",
        styles: callerStyles,
        UNSAFE_className: "caller-class",
        UNSAFE_style: {
          width: "fit-content",
          gridTemplateColumns: "auto 1fr",
          opacity: 0.9,
        },
      },
    },
    {
      id: "disabled",
      props: {
        label: "Disabled field",
        labelPosition: "side",
        isDisabled: true,
      },
    },
    {
      id: "validation",
      props: {
        label: "Required field",
        labelPosition: "side",
        isRequired: true,
        isInvalid: true,
        description: "Choose the format for exported sizes.",
        errorMessage: "Check the output format.",
      },
    },
    {
      id: "description",
      props: {
        label: "Description field",
        labelPosition: "side",
        description: "Choose the format for exported sizes.",
      },
    },
    {
      id: "help",
      props: {
        label: "Help field",
        labelPosition: "side",
        contextualHelp: (
          <ContextualHelp aria-label="Output format information">
            <Content>Output units do not change the source sizes.</Content>
          </ContextualHelp>
        ),
      },
    },
  ];
  const numberFields: {
    id: string;
    props: ComponentProps<typeof NumberField>;
  }[] = [
    { id: "number-default", props: { label: "Native number" } },
    {
      id: "number-grid",
      props: { label: "Explicit number grid", layout: "grid" },
    },
    { id: "number-flex", props: { label: "Compact number", layout: "flex" } },
    { id: "number-top", props: { label: "Top number", labelPosition: "top" } },
    { id: "number-unlabeled", props: { "aria-label": "Unlabeled number" } },
    {
      id: "number-long",
      props: {
        label: "AnUnusuallyLongNumberFieldLabelThatMustWrapInsideItsColumn",
      },
    },
    {
      id: "number-disabled",
      props: { label: "Disabled number", isDisabled: true },
    },
    {
      id: "number-readonly",
      props: { label: "Read-only number", isReadOnly: true },
    },
    {
      id: "number-stepper-hidden",
      props: { label: "Hidden stepper", hideStepper: true },
    },
    {
      id: "number-styled",
      props: {
        label: "Styled number",
        size: "S",
        labelAlign: "end",
        styles: callerStyles,
        UNSAFE_className: "number-caller-class",
        UNSAFE_style: { width: "fit-content", opacity: 0.9 },
      },
    },
    {
      id: "number-required",
      props: {
        label: "Required number",
        isRequired: true,
        isInvalid: true,
        errorMessage: "Check this number.",
      },
    },
    {
      id: "number-help",
      props: {
        label: "Number help",
        contextualHelp: (
          <ContextualHelp aria-label="Number field information">
            <Content>
              Number formatting does not change the source value.
            </Content>
          </ContextualHelp>
        ),
      },
    },
  ];

  return (
    <Provider colorScheme={colorScheme}>
      <AtomProvider>
        <main
          style={{
            width: 620,
            maxWidth: "100%",
            padding: 16,
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 20,
          }}
        >
          <ButtonGroup UNSAFE_style={{ flexWrap: "wrap" }}>
            <Button onPress={() => setReadOnly((value) => !value)}>
              {readOnly ? "Make editable" : "Make read-only"}
            </Button>
            <Button onPress={() => setSelectedKey("long")}>
              Use long value
            </Button>
            <Button
              onPress={() => {
                numberRef.current?.focus();
                numberRef.current?.select();
              }}
            >
              Focus number
            </Button>
          </ButtonGroup>
          {fields.map(({ id, props }) => (
            <div key={id} data-testid={id} style={{ minWidth: 0 }}>
              <EditablePicker
                {...common}
                {...props}
                displayValue={
                  props.selectedKey === "long" ? values[2].name : displayValue
                }
              />
            </div>
          ))}
          <div
            data-testid="adjacent"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            <EditablePicker
              {...common}
              label="With edit action"
              labelPosition="side"
              UNSAFE_style={{ flex: "1 1 0%" }}
            />
            <ActionButton
              aria-label="Edit selected rule"
              onPress={() => setEditCount((value) => value + 1)}
            >
              Edit
            </ActionButton>
          </div>
          <output aria-label="Edit action count">{editCount}</output>
          <Form labelPosition="side" aria-label="Side-label form">
            <div
              data-testid="form-side"
              style={{ gridColumn: "1 / -1", minWidth: 0 }}
            >
              <EditablePicker
                {...common}
                label="Explicit side in form"
                labelPosition="side"
              />
            </div>
            <EditablePicker {...common} label="Default side in form" />
          </Form>
          <div data-testid="layout-picker">
            <Picker
              label="Layout picker"
              selectedKey={selectedKey}
              onSelectionChange={common.onSelectionChange}
            >
              {common.children}
            </Picker>
          </div>
          {numberFields.map(({ id, props }) => (
            <div key={id} data-testid={id} style={{ minWidth: 0 }}>
              <NumberField
                value={number}
                minValue={0}
                maxValue={20}
                step={0.25}
                formatOptions={{ maximumFractionDigits: 3 }}
                onChange={setNumber}
                {...props}
              />
            </div>
          ))}
          <div data-testid="number-ref">
            <NumberField
              ref={numberRef}
              label="Number with ref"
              value={number}
              onChange={setNumber}
            />
          </div>
          <div data-testid="number-uncontrolled">
            <NumberField
              label="Uncontrolled number"
              defaultValue={3.5}
              step={0.5}
            />
          </div>
          <div data-testid="editable-number">
            <EditableNumberField
              label="Editable number"
              value={number}
              formatOptions={{ minimumFractionDigits: 2 }}
              isReadOnly={readOnly}
              onChange={setNumber}
            />
          </div>
          <div data-testid="editable-number-flex">
            <EditableNumberField
              label="Compact editable number"
              value={number}
              isReadOnly={readOnly}
              layout="flex"
              onChange={setNumber}
            />
          </div>
          <div data-testid="editable-number-top">
            <EditableNumberField
              label="Top editable number"
              value={number}
              isReadOnly={readOnly}
              labelPosition="top"
              onChange={setNumber}
            />
          </div>
          <div data-testid="editable-number-default">
            <EditableNumberField
              label="Default editable number"
              defaultValue={27.125}
              isReadOnly={readOnly}
            />
          </div>
          <Form labelPosition="top" aria-label="Top-label form">
            <EditablePicker {...common} label="Default side in top form" />
            <EditablePicker
              {...common}
              label="Explicit top in form"
              labelPosition="top"
            />
          </Form>
        </main>
      </AtomProvider>
    </Provider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
