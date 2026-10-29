// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  ComboBox,
  ComboBoxItem,
  ComboBoxSection,
  Text,
  ToastQueue,
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
  customValue?: {
    displayValue: string;
    onAccept: (text: string) => void;
  };
}
const fieldStyles = style({ width: "full", minWidth: 0, flexGrow: 1 });
const menuLabelStyles = style({ font: "ui", fontWeight: "medium" });
const menuDescriptionStyles = style({ font: "ui-sm" });
const subscribeViewport = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const viewportWidth = () => window.innerWidth;
const serverViewportWidth = () => 360;

export function TokenComboBox({
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
  customValue,
}: TokenComboBoxProps) {
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
  const [query, setQuery] = useState("");
  const [customError, setCustomError] = useState<string>();
  const input = useRef<TextFieldRef>(null);
  const committed = useRef(selectedKey);
  committed.current = selectedKey;
  const labelId = useId();
  const valueId = useId();
  const customKey = useId();
  const literalKey = useId();
  const selected = options.find((option) => option.id === selectedKey);
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
  function acceptCustomValue() {
    if (!customValue || isDisabled) return;
    try {
      customValue.onAccept(query);
      setCustomError(undefined);
      setEditing(false);
      setQuery("");
    } catch (failure) {
      setCustomError(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  }
  return (
    <div
      className="tokenComboBox"
      data-component="TokenComboBox"
      data-clearable={hasClearAction || undefined}
      data-invalid={!!fieldError || undefined}
      data-show-tag={showTag || undefined}
    >
      <div className="tokenComboBoxControls">
        <ComboBox
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
                  : customValue
                    ? "Enter a value or choose a token"
                    : "Choose a token"
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
            if (!customValue) {
              setEditing(false);
              setQuery("");
            }
          }}
          onKeyDown={(event) => {
            if (customValue && event.key === "Escape") {
              setEditing(false);
              setQuery("");
              setCustomError(undefined);
            }
          }}
          onInputChange={(text) => {
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
              setEditing(false);
              setQuery("");
              setCustomError(undefined);
              return;
            }
            const option = options.find((item) => item.id === key);
            if (
              !option ||
              option.error ||
              (isOptionAllowed && !isOptionAllowed(option))
            ) {
              ToastQueue.negative(
                option?.error ??
                  "This option is no longer available. Choose a compatible value.",
              );
              return;
            }
            committed.current = option.id;
            onChange(option.id);
            setCustomError(undefined);
            setEditing(false);
            setQuery("");
          }}
        >
          {customValue && editing && query.trim() && (
            <ComboBoxItem id={customKey} textValue={query}>
              <Text slot="label">Use this value</Text>
              <Text slot="description">{query}</Text>
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
              size="S"
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
