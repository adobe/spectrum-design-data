// Copyright 2026 Adobe. All rights reserved.
import {
  focusRing,
  lightDark,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom } from "jotai";
import type { ReactNode } from "react";
import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  type TabRenderProps,
} from "react-aria-components";
import { subPanelTabSelectionAtom } from "../state/view/subPanelTabs";
import "./SubPanelTabs.css";

export interface SubPanelTab {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
  isDisabled?: boolean;
  /** When true, removes the default tab panel padding. */
  noPadding?: boolean;
}

interface SubPanelTabsProps {
  tabs: SubPanelTab[];
  "aria-label": string;
  stateKey: string;
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string) => void;
}

const tabsStyles = style({
  display: "flex",
  flexDirection: "column",
  width: "full",
  height: "full",
});

const tabListStyles = style({
  display: "flex",
  flexDirection: "row",
  gap: 8,
  paddingTop: 12,
  paddingBottom: 12,
  paddingStart: 16,
  paddingEnd: 16,
  borderWidth: 0,
  borderBottomWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-100",
});

const tabStyles = style<TabRenderProps>({
  ...focusRing(),
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  flexGrow: 0,
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: "default",
  backgroundColor: {
    default: "transparent",
    isSelected: {
      default: lightDark("accent-900", "accent-700"),
      isHovered: lightDark("accent-1000", "accent-600"),
      isPressed: lightDark("accent-1000", "accent-600"),
      isFocusVisible: lightDark("accent-1000", "accent-600"),
    },
    forcedColors: {
      default: "ButtonFace",
      isSelected: "Highlight",
    },
  },
  color: {
    default: "neutral",
    isSelected: "white",
    isDisabled: "disabled",
    forcedColors: {
      default: "ButtonText",
      isSelected: "HighlightText",
      isDisabled: "GrayText",
    },
  },
  "--iconPrimary": { type: "fill", value: "currentColor" },
  borderStyle: "none",
  userSelect: "none",
  transition: "default",
  forcedColorAdjust: "none",
  zIndex: { isFocusVisible: 2 },
  cursor: "default",
});

const tabPanelStyles = style({
  flexGrow: 1,
  minHeight: 0,
  overflow: "auto",
  padding: { default: 20, isNoPadding: 0 },
  color: "neutral",
});

const tabIconStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
});

export function SubPanelTabs({
  tabs,
  "aria-label": ariaLabel,
  stateKey,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
}: SubPanelTabsProps) {
  const [selectedTabs, setSelectedTabs] = useAtom(subPanelTabSelectionAtom);
  const initialSelectedKey = defaultSelectedKey ?? tabs[0]?.id;
  const sharedSelectedKey = selectedTabs[stateKey] ?? initialSelectedKey;
  const activeSelectedKey = selectedKey ?? sharedSelectedKey;

  return (
    <Tabs
      aria-label={ariaLabel}
      className={tabsStyles}
      selectedKey={activeSelectedKey}
      onSelectionChange={(key) => {
        const nextSelectedKey = String(key);
        if (selectedKey === undefined) {
          setSelectedTabs((current) => ({
            ...current,
            [stateKey]: nextSelectedKey,
          }));
        }
        onSelectionChange?.(nextSelectedKey);
      }}
    >
      <TabList className={tabListStyles} items={tabs} aria-label={ariaLabel}>
        {(item) => (
          <Tab
            id={item.id}
            aria-label={item.label}
            isDisabled={item.isDisabled}
            className={(renderProps) => tabStyles(renderProps)}
          >
            <span
              aria-hidden="true"
              className={`${tabIconStyles} subPanelTabIcon`}
            >
              {item.icon}
            </span>
          </Tab>
        )}
      </TabList>
      <TabPanels
        items={tabs}
        className={style({
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minHeight: 0,
          overflow: "hidden",
        })}
      >
        {(item) => (
          <TabPanel
            id={item.id}
            className={tabPanelStyles({ isNoPadding: item.noPadding })}
          >
            {item.content}
          </TabPanel>
        )}
      </TabPanels>
    </Tabs>
  );
}
