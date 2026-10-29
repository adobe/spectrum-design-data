// Copyright 2026 Adobe. All rights reserved.
import {
  ComboBox,
  ComboBoxItem,
  ProgressCircle,
  Text,
  type TextFieldRef,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  spectrumIconLoaders,
  type SpectrumIconName,
} from "../../features/icons/spectrumIconCatalog.generated";
import { useIconSample } from "../../features/icons/useIconSample";
import { fittedMenuWidth } from "./menuSizing";
import "./IconSamplePicker.css";

const items = (Object.keys(spectrumIconLoaders) as SpectrumIconName[]).map(
  (id) => ({
    id,
    label: id
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2"),
  }),
);
const iconStyle = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  flexShrink: 0,
  gridArea: "[icon]",
});

function MenuIcon({ name }: { name: SpectrumIconName }) {
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
    <span ref={ref} className={iconStyle} data-icon-name={name}>
      {icon.status === "ready" ? (
        <icon.Icon
          aria-hidden="true"
          UNSAFE_style={{ width: 20, height: 20 }}
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
}: {
  selectedIcon: SpectrumIconName;
  onChange: (icon: SpectrumIconName) => void;
  allowedIcons?: readonly SpectrumIconName[];
  isDisabled?: boolean;
  isCompact?: boolean;
  menuWidth?: number;
}) {
  const input = useRef<TextFieldRef>(null),
    measurement = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const offered = allowedIcons
    ? items.filter((item) => allowedIcons.includes(item.id))
    : items;
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
            Object.hasOwn(spectrumIconLoaders, key)
          ) {
            onChange(key as SpectrumIconName);
          }
        }}
      >
        {(item) => (
          <ComboBoxItem id={item.id} textValue={item.label}>
            <MenuIcon name={item.id} />
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
