// Copyright 2026 Adobe. All rights reserved.
import {
  ComboBox,
  ComboBoxItem,
  ProgressCircle,
  Text,
  type TextFieldRef,
} from "@react-spectrum/s2";
import {
  iconStyle as spectrumIconStyle,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  spectrumIconLoaders,
  type SpectrumIconName,
} from "../../features/icons/spectrumIconCatalog.generated";
import { useIconSample } from "../../features/icons/useIconSample";
import { SPECTRUM_ICON_OPTIONS } from "../../features/icons/iconSearch";
import { fittedMenuWidth } from "./menuSizing";
import "./IconSamplePicker.css";

const iconStyle = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  flexShrink: 0,
  gridArea: "[icon]",
});
const toneStyles = {
  white: spectrumIconStyle({ color: "white" }),
  black: spectrumIconStyle({ color: "black" }),
};

/** White or black icon color for a preview surface, matching its text color. */
export function surfaceIconTone(textColor: string | undefined) {
  return textColor?.toLowerCase() === "#ffffff" ? "white" : "black";
}

/** A Spectrum icon that loads only once it scrolls into view. */
export function LazySpectrumIcon({
  name,
  size = 20,
  inheritColor = false,
  tone,
}: {
  name: SpectrumIconName;
  size?: number;
  /** Use the surrounding text color, for previews on custom surfaces. */
  inheritColor?: boolean;
  /** Fill for icons on a themed preview surface; see `surfaceIconTone`. */
  tone?: keyof typeof toneStyles;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const icon = useIconSample(name, visible);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <span
      ref={ref}
      className={iconStyle}
      style={size === 20 ? undefined : { width: size, height: size }}
      data-icon-name={name}
    >
      {icon.status === "ready" ? (
        <icon.Icon
          aria-hidden="true"
          styles={tone ? toneStyles[tone] : undefined}
          UNSAFE_style={{
            width: size,
            height: size,
            ...((inheritColor || tone) && { color: "inherit" }),
          }}
        />
      ) : icon.status === "error" ? (
        <span role="alert" aria-label={icon.message} title={icon.message}>
          !
        </span>
      ) : visible ? (
        <ProgressCircle
          size="S"
          isIndeterminate
          aria-label={`Loading ${name} icon`}
        />
      ) : null}
    </span>
  );
}

export function IconSamplePicker({
  selectedIcon,
  onChange,
  allowedIcons,
  isDisabled = false,
  isCompact = false,
  menuWidth,
  size,
}: {
  selectedIcon: SpectrumIconName;
  onChange: (icon: SpectrumIconName) => void;
  allowedIcons?: readonly SpectrumIconName[];
  isDisabled?: boolean;
  isCompact?: boolean;
  menuWidth?: number;
  size?: "S" | "M" | "L" | "XL";
}) {
  const input = useRef<TextFieldRef>(null),
    measurement = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const offered = allowedIcons
    ? SPECTRUM_ICON_OPTIONS.filter((item) => allowedIcons.includes(item.id))
    : SPECTRUM_ICON_OPTIONS;
  useLayoutEffect(() => {
    const probe = measurement.current,
      trigger = input.current?.getInputElement()?.parentElement;
    if (!probe || !trigger) return;
    const measure = () =>
      setWidth(
        fittedMenuWidth(
          trigger.getBoundingClientRect().width,
          probe.getBoundingClientRect().width + 84,
          window.innerWidth,
          menuWidth,
        ),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(probe);
    observer.observe(trigger);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [allowedIcons, menuWidth]);
  return (
    <>
      <ComboBox
        label="Sample icon"
        size={size}
        labelPosition={isCompact ? "top" : "side"}
        defaultItems={offered}
        ref={input}
        menuWidth={width || undefined}
        isDisabled={isDisabled}
        styles={
          isCompact
            ? style({ width: "full", minWidth: 0 })
            : style({ minWidth: 280, flexShrink: 0 })
        }
        selectedKey={selectedIcon}
        onSelectionChange={(key) => {
          if (
            typeof key === "string" &&
            Object.hasOwn(spectrumIconLoaders, key) &&
            (!allowedIcons || allowedIcons.some((name) => name === key))
          ) {
            onChange(key as SpectrumIconName);
          }
        }}
      >
        {(item) => (
          <ComboBoxItem id={item.id} textValue={item.label}>
            <LazySpectrumIcon name={item.id} />
            <Text slot="label">{item.label}</Text>
          </ComboBoxItem>
        )}
      </ComboBox>
      <div
        ref={measurement}
        className="iconSampleMenuMeasurement"
        aria-hidden="true"
      >
        {offered.map((item) => (
          <div key={item.id}>{item.label}</div>
        ))}
      </div>
    </>
  );
}
