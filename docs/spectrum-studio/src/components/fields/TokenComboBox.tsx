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
  useMemo,
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
import { exactTokenEntryMatch, type ValueNormalizer } from "./tokenEntry";
import {
  menuMeasurementChoices,
  tokenMenuChoices,
  tokenOptionDescription,
} from "./tokenMenuChoices";

export interface TokenComboBoxOption {
  id: string;
  kind: "preset" | "token";
  name: string;
  displayValue: string;
  matchValue?: string;
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
  normalizeValue?: ValueNormalizer;
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
const tokenMenuItem = (option: TokenComboBoxOption) => (
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
      <Text slot="description">{tokenOptionDescription(option)}</Text>
    )}
  </ComboBoxItem>
);

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
  normalizeValue,
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
  const draft = useRef<{ text: string; dirty: boolean } | null>(null);
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
  // Availability checks can be costly, so a closed, unfocused field skips them.
  // Choosing or typing a value still checks availability before accepting it.
  const allowed = menuOpen || editing ? isOptionAllowed : undefined;
  const { choices, disabled, presets, tokens } = useMemo(
    () => tokenMenuChoices(options, selectedKey, allowed),
    [options, selectedKey, allowed],
  );
  const probeRows = useMemo(() => menuMeasurementChoices(choices), [choices]);
  const items = useMemo(
    () =>
      presets.length > 0 ? (
        <>
          <ComboBoxSection aria-label="System options">
            {presets.map(tokenMenuItem)}
          </ComboBoxSection>
          <ComboBoxSection aria-label="Foundation tokens">
            {tokens.map(tokenMenuItem)}
          </ComboBoxSection>
        </>
      ) : (
        tokens.map(tokenMenuItem)
      ),
    [presets, tokens],
  );
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
  }, [probeRows, menuOpen, menuWidth, inlineEditing]);
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
  function finishEditing(focusTrigger = false) {
    draft.current = null;
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
  function acceptCustomValue() {
    if (!customValue || isDisabled) return;
    try {
      const text = draft.current?.text ?? query;
      if (customValue.isAllowed && !customValue.isAllowed(text))
        throw new Error("This value is not available. Enter another value.");
      customValue.onAccept(text);
      finishEditing(true);
    } catch (failure) {
      setCustomError(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  }
  function acceptOption(id: string | null) {
    try {
      onChange(id);
      committed.current = id;
      finishEditing(true);
    } catch (failure) {
      setCustomError(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  }
  function clearValue() {
    if (isDisabled) return;
    if (isRequired) {
      draft.current = { text: "", dirty: true };
      setEditing(true);
      setQuery("");
      setCustomError("Enter a value or choose an option.");
      return;
    }
    acceptOption(null);
  }
  function acceptEntry() {
    if (isDisabled || !draft.current?.dirty) {
      finishEditing();
      return;
    }
    const text = draft.current.text;
    if (!text.trim()) {
      clearValue();
      return;
    }
    const match = exactTokenEntryMatch(
      options,
      text,
      isOptionAllowed,
      normalizeValue,
    );
    if (match) {
      acceptOption(match.id);
    } else if (customValue) {
      acceptCustomValue();
    } else {
      setCustomError("Choose an available option.");
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
        if (isDisabled || event.nativeEvent.isComposing) return;
        if (event.target !== input.current?.getInputElement()) return;
        if (
          (event.key === "Delete" || event.key === "Backspace") &&
          selectedKey !== null &&
          !draft.current?.dirty &&
          (!selected || selected.kind === "token")
        ) {
          event.preventDefault();
          event.stopPropagation();
          clearValue();
          return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp")
          keyboardSelection.current = true;
        if (event.key === "Enter" && !keyboardSelection.current) {
          event.preventDefault();
          event.stopPropagation();
          acceptEntry();
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
            if (draft.current) return;
            draft.current = { text: inputValue, dirty: false };
            setQuery(inputValue);
            setEditing(true);
          }}
          onBlur={() => {
            acceptEntry();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              if (inline) event.stopPropagation();
              finishEditing(true);
            }
          }}
          onInputChange={(text) => {
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
            draft.current = { text, dirty: true };
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
            acceptOption(option.id);
          }}
        >
          {customValue &&
            editing &&
            query.trim() &&
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
          {items}
        </ComboBox>
        {hasClearAction && (
          <div className="tokenComboBoxClear">
            <ActionButton
              size={size ?? "S"}
              isQuiet
              isDisabled={isDisabled}
              aria-label={`Clear ${ariaLabel ?? label ?? "token"}`}
              onPress={clearValue}
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
          {probeRows.map((option) => (
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
                  {tokenOptionDescription(option)}
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
