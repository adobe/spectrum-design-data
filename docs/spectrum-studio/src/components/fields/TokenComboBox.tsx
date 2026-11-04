// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../notifications/notificationContext";
import {
  ActionButton,
  ComboBox,
  ComboBoxItem,
  ComboBoxSection,
  Text,
  type TextFieldRef,
} from "@react-spectrum/s2";
import Close from "@react-spectrum/s2/icons/Close";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
} from "react";
import { TokenNameTag } from "../tokens/TokenNameTag";
import "./TokenComboBox.css";
import { fittedMenuWidth } from "./menuSizing";

export interface TokenComboBoxOption {
  id: string;
  kind: "preset" | "token";
  name: string;
  displayValue: string;
  hidden?: boolean;
  error?: string;
}
export type TokenDisplayMode = "tokens" | "values";
export interface TokenComboBoxProps {
  placeholder?: string;
  size?: ComponentProps<typeof ComboBox>["size"];
  label?: string;
  ariaLabel?: string;
  prefix?: ReactNode;
  options: readonly TokenComboBoxOption[];
  selectedKey: string | null;
  onChange: (id: string | null) => void;
  displayMode?: TokenDisplayMode;
  isDisabled?: boolean;
  isRequired?: boolean;
  isMixed?: boolean;
  error?: string;
  isOptionAllowed?: (option: TokenComboBoxOption) => boolean;
  menuWidth?: number;
  inline?: boolean;
  customValue?: {
    displayValue: string;
    onAccept: (text: string) => void;
    inputType?: "number";
    isAllowed?: (text: string) => boolean;
  };
}
const fieldStyles = style({ width: "full", minWidth: 0, flexGrow: 1 });
const inlineValueStyles = style({
  width: "full",
  maxWidth: "[9ch]",
  minWidth: 0,
});
const menuLabelStyles = style({ font: "ui", fontWeight: "medium" });
const menuDescriptionStyles = style({ font: "ui-sm" });
const subscribeViewport = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const viewportWidth = () => window.innerWidth;
const serverViewportWidth = () => 360;

export function TokenComboBox({
  placeholder,
  size,
  label,
  ariaLabel,
  prefix,
  options,
  selectedKey,
  onChange,
  displayMode = "tokens",
  isDisabled = false,
  isRequired = false,
  isMixed = false,
  error,
  isOptionAllowed,
  menuWidth,
  inline = false,
  customValue,
}: TokenComboBoxProps) {
  const notify = useNotify();
  if (
    menuWidth !== undefined &&
    (!Number.isFinite(menuWidth) || menuWidth <= 0)
  )
    throw new Error("Token ComboBox menuWidth must be a positive pixel value.");
  const availableWidth = useSyncExternalStore(
    subscribeViewport,
    viewportWidth,
    serverViewportWidth,
  );
  const measurement = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [triggerWidth, setTriggerWidth] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [customError, setCustomError] = useState<string>();
  const input = useRef<TextFieldRef>(null);
  const inlineTrigger = useRef<ComponentRef<typeof ActionButton>>(null);
  const restoreFocus = useRef(false);
  const committed = useRef(selectedKey);
  const keyboardSelection = useRef(false);
  committed.current = selectedKey;
  const labelId = useId();
  const valueId = useId();
  const customKey = useId();
  const literalKey = useId();
  const selected = options.find((option) => option.id === selectedKey);
  const numeric = customValue?.inputType === "number";
  useLayoutEffect(() => {
    if (inlineEditing) {
      input.current?.focus();
      input.current?.getInputElement()?.select();
    } else if (restoreFocus.current) {
      inlineTrigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [inlineEditing]);
  const offered = options.filter(
    (option) => !isOptionAllowed || isOptionAllowed(option),
  );
  const choices =
    selected && !offered.some((option) => option.id === selected.id)
      ? [...offered, selected]
      : offered;
  const disabled = choices
    .filter(
      (option) =>
        option.error || !offered.some((item) => item.id === option.id),
    )
    .map((option) => option.id);
  const presets = choices.filter((option) => option.kind === "preset");
  const tokens = choices.filter((option) => option.kind === "token");
  const descriptionFor = (option: TokenComboBoxOption) =>
    option.error ??
    `${option.displayValue}${option.hidden ? " - Not published" : ""}`;
  const fieldError =
    customError ??
    error ??
    selected?.error ??
    (selectedKey && !selected
      ? "This token is no longer available."
      : undefined);
  useLayoutEffect(() => {
    const probe = measurement.current;
    const trigger = input.current?.getInputElement()?.parentElement;
    if (!trigger) return;
    const measure = () => {
      // Medium S2 menus reserve 44 px for row chrome and 16 px for the virtualizer gutter.
      if (probe)
        setContentWidth(Math.ceil(probe.getBoundingClientRect().width + 60));
      setTriggerWidth(Math.ceil(trigger.getBoundingClientRect().width));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (probe) observer.observe(probe);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [options, isOptionAllowed, selectedKey, menuOpen, menuWidth]);
  const showTag =
    !editing && displayMode === "tokens" && selected?.kind === "token";
  const accessibleSuffix =
    label && ariaLabel?.startsWith(label) ? ariaLabel.slice(label.length) : "";
  const fieldLabel = label ? (
    <>
      {label}
      {accessibleSuffix && (
        <span className="tokenComboBoxAnnouncement">{accessibleSuffix}</span>
      )}
    </>
  ) : undefined;
  const inputValue = editing
    ? query
    : selected?.kind === "preset"
      ? selected.name
      : selectedKey === null && customValue
        ? customValue.displayValue
        : displayMode === "values"
          ? (selected?.displayValue ?? "")
          : "";
  const acceptedLiteral = selectedKey === null && !!customValue?.displayValue;
  const hasClearAction =
    !isRequired &&
    (selectedKey !== null || isMixed || !!customValue?.displayValue);
  const renderOption = (option: TokenComboBoxOption) => (
    <ComboBoxItem
      key={option.id}
      id={option.id}
      textValue={
        option.kind === "preset"
          ? option.name
          : `${option.name} ${option.displayValue}`
      }
    >
      <Text slot="label">
        {option.kind === "preset" ? (
          option.name
        ) : (
          <TokenNameTag name={option.name} />
        )}
      </Text>
      {option.kind === "token" && (
        <Text slot="description">{descriptionFor(option)}</Text>
      )}
    </ComboBoxItem>
  );
  function finishEditing(focusTrigger = false) {
    keyboardSelection.current = false;
    setEditing(false);
    setQuery("");
    setCustomError(undefined);
    if (inline) {
      restoreFocus.current = focusTrigger;
      setInlineEditing(false);
      setMenuOpen(false);
    }
  }
  function acceptCustomValue(reportError = false) {
    if (!customValue || isDisabled) return;
    try {
      customValue.onAccept(query);
      finishEditing(!reportError);
    } catch (failure) {
      setCustomError(
        failure instanceof Error ? failure.message : String(failure),
      );
      if (reportError) notify.error(failure);
    }
  }
  if (inline && !inlineEditing) {
    return (
      <ActionButton
        ref={inlineTrigger}
        isQuiet
        size={size}
        styles={inlineValueStyles}
        aria-label={ariaLabel ?? label}
        isDisabled={isDisabled}
        onPress={() => setInlineEditing(true)}
      >
        <Text>{selected?.displayValue ?? customValue?.displayValue}</Text>
      </ActionButton>
    );
  }
  return (
    <div
      className="tokenComboBox"
      data-component="TokenComboBox"
      data-clearable={hasClearAction || undefined}
      data-invalid={!!fieldError || undefined}
      data-show-tag={showTag || undefined}
      onKeyDownCapture={(event) => {
        if (!numeric || event.nativeEvent.isComposing) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp")
          keyboardSelection.current = true;
        if (
          event.key === "Enter" &&
          !keyboardSelection.current &&
          event.target === input.current?.getInputElement()
        ) {
          event.preventDefault();
          event.stopPropagation();
          acceptCustomValue();
        }
      }}
    >
      <div className="tokenComboBoxControls">
        <ComboBox
          size={size}
          label={fieldLabel}
          aria-labelledby={label ? undefined : labelId}
          ref={input}
          styles={fieldStyles}
          aria-describedby={valueId}
          selectedKey={acceptedLiteral ? literalKey : selectedKey}
          inputValue={inputValue}
          menuWidth={fittedMenuWidth(
            triggerWidth,
            contentWidth,
            availableWidth,
            menuWidth,
          )}
          onOpenChange={setMenuOpen}
          isRequired={isRequired}
          isDisabled={isDisabled}
          isInvalid={!!fieldError}
          errorMessage={fieldError}
          validationBehavior={customValue ? "aria" : undefined}
          placeholder={
            isMixed
              ? "Mixed"
              : selectedKey && !selected
                ? "Unavailable token"
                : selected
                  ? ""
                  : (placeholder ??
                    (customValue
                      ? "Enter a value or choose a token"
                      : "Choose a token"))
          }
          allowsCustomValue={!!customValue}
          disabledKeys={disabled}
          prefix={
            prefix || showTag ? (
              <span className="tokenComboBoxPrefix">
                {prefix}
                {showTag && <TokenNameTag name={selected.name} />}
              </span>
            ) : undefined
          }
          onFocus={() => {
            setQuery(inputValue);
            setEditing(true);
          }}
          onBlur={() => {
            if (inline) {
              if (
                editing &&
                query !==
                  (selected?.displayValue ?? customValue?.displayValue ?? "")
              )
                acceptCustomValue(true);
              finishEditing();
            } else if (!customValue) finishEditing();
          }}
          onKeyDown={(event) => {
            if (customValue && event.key === "Escape") {
              if (inline) event.stopPropagation();
              finishEditing(true);
            }
          }}
          onInputChange={(text) => {
            if (numeric && !/^(?:\d+(?:\.\d*)?|\.\d*)?$/.test(text)) return;
            keyboardSelection.current = false;
            if (!editing && customValue && text === customValue.displayValue)
              return;
            const current = options.find(
              (option) => option.id === committed.current,
            );
            if (
              text === `${current?.name} ${current?.displayValue}` ||
              (!editing && text === current?.name)
            )
              return;
            setEditing(true);
            setQuery(text);
            setCustomError(undefined);
          }}
          onSelectionChange={(key) => {
            if (key === null) return;
            if (key === customKey) {
              acceptCustomValue();
              return;
            }
            if (key === literalKey) {
              finishEditing(true);
              return;
            }
            const option = options.find((item) => item.id === key);
            if (
              !option ||
              option.error ||
              (isOptionAllowed && !isOptionAllowed(option))
            ) {
              notify.error(
                option?.error ??
                  "This option is no longer available. Choose a compatible value.",
              );
              return;
            }
            committed.current = option.id;
            onChange(option.id);
            finishEditing(true);
          }}
        >
          {customValue &&
            editing &&
            query.trim() &&
            (!numeric ||
              (Number(query) > 0 &&
                !choices.some(
                  (option) => Number(option.name) === Number(query),
                ))) &&
            (!customValue.isAllowed || customValue.isAllowed(query)) && (
              <ComboBoxItem id={customKey} textValue={query}>
                <Text slot="label">{numeric ? query : "Use this value"}</Text>
                {!numeric && <Text slot="description">{query}</Text>}
              </ComboBoxItem>
            )}
          {acceptedLiteral && customValue && (
            <ComboBoxItem id={literalKey} textValue={customValue.displayValue}>
              <Text slot="label">Current value</Text>
              <Text slot="description">{customValue.displayValue}</Text>
            </ComboBoxItem>
          )}
          {presets.length > 0 ? (
            <>
              <ComboBoxSection aria-label="System options">
                {presets.map(renderOption)}
              </ComboBoxSection>
              <ComboBoxSection aria-label="Foundation tokens">
                {tokens.map(renderOption)}
              </ComboBoxSection>
            </>
          ) : (
            tokens.map(renderOption)
          )}
        </ComboBox>
        {hasClearAction && (
          <div className="tokenComboBoxClear">
            <ActionButton
              size={size ?? "S"}
              isQuiet
              isDisabled={isDisabled}
              aria-label={`Clear ${ariaLabel ?? label ?? "token"}`}
              onPress={() => {
                committed.current = null;
                onChange(null);
                setEditing(false);
                setQuery("");
                setCustomError(undefined);
              }}
            >
              <Close />
            </ActionButton>
          </div>
        )}
      </div>
      {menuOpen && menuWidth === undefined && (
        <div
          ref={measurement}
          className="tokenComboBoxMenuMeasurement"
          aria-hidden="true"
        >
          {choices.map((option) => (
            <div key={option.id}>
              <Text styles={menuLabelStyles}>
                {option.kind === "token" ? (
                  <span className="tokenNameTag">{option.name}</span>
                ) : (
                  option.name
                )}
              </Text>
              {option.kind === "token" && (
                <Text styles={menuDescriptionStyles}>
                  {descriptionFor(option)}
                </Text>
              )}
            </div>
          ))}
        </div>
      )}
      {!label && (
        <span id={labelId} className="tokenComboBoxAnnouncement">
          {ariaLabel}
        </span>
      )}
      <span id={valueId} className="tokenComboBoxAnnouncement">
        {isMixed
          ? "Mixed token references."
          : selected
            ? `Selected ${selected.kind}: ${selected.name}. Value: ${selected.displayValue}.`
            : customValue?.displayValue
              ? `Literal value: ${customValue.displayValue}.`
              : "No token selected."}
      </span>
    </div>
  );
}
