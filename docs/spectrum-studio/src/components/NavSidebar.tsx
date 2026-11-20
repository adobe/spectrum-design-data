// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  SideNav,
  SideNavItem,
  SideNavItemContent,
  SideNavItemLink,
  SideNavSection,
  SideNavHeader,
  Text,
} from "@react-spectrum/s2/SideNav";
import {
  Badge,
  Divider,
  type BadgeProps,
  type IconProps,
} from "@react-spectrum/s2";
import type { ComponentType } from "react";
import { getCategoryIcon } from "./CategoryIcon";
import { RouterProvider } from "react-aria-components";
import { getSidebarLabelClassName } from "./sideNavUtils";
import { PanelToggleButton } from "./PanelToggleButton";
import "./NavSidebar.css";

const sidebarPanel = style({
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  flexDirection: "column",
  height: "full",
  boxSizing: "border-box",
  backgroundColor: "layer-1",
  paddingTop: 12,
  paddingEnd: { default: 12, isCollapsed: 4 },
  paddingBottom: 12,
  paddingStart: { default: 12, isCollapsed: 4 },
  minWidth: 0,
  minHeight: 0,
});

export interface NavSidebarItem {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
  status?: string;
  statusVariant?: BadgeProps["variant"];
}

export interface NavSidebarSection {
  id: string;
  label: string;
  items: readonly NavSidebarItem[];
}

const navItems: readonly (NavSidebarItem | NavSidebarSection)[] = [
  {
    id: "design-section",
    label: "Design",
    items: [
      {
        id: "foundations",
        label: "Foundations",
        Icon: getCategoryIcon("foundations"),
      },
      {
        id: "design",
        label: "Objects",
        Icon: getCategoryIcon("objects"),
        status: "WIP",
        statusVariant: "informative",
      },
      {
        id: "components",
        label: "Components",
        Icon: getCategoryIcon("components"),
        status: "TBD",
        statusVariant: "notice",
      },
    ],
  },
  {
    id: "logic-section",
    label: "Logic",
    items: [
      {
        id: "formulas",
        label: "Formulas",
        Icon: getCategoryIcon("formulas"),
      },
      {
        id: "rules",
        label: "Rules",
        Icon: getCategoryIcon("rules"),
      },
      { id: "modes", label: "Modes", Icon: getCategoryIcon("modes") },
    ],
  },
  {
    id: "data-section",
    label: "Data",
    items: [
      {
        id: "tokens",
        label: "Tokens",
        Icon: getCategoryIcon("tokens"),
      },
      {
        id: "registry",
        label: "Registry",
        Icon: getCategoryIcon("registry"),
        status: "WIP",
        statusVariant: "informative",
      },
      {
        id: "skills",
        label: "Skills",
        Icon: getCategoryIcon("skills"),
        status: "WIP",
        statusVariant: "informative",
      },
    ],
  },
  {
    id: "analysis-section",
    label: "Analysis",
    items: [
      {
        id: "system-health",
        label: "System health",
        Icon: getCategoryIcon("system-health"),
        status: "FPO",
        statusVariant: "neutral",
      },
      {
        id: "accessibility",
        label: "Accessibility",
        Icon: getCategoryIcon("accessibility"),
        status: "TBD",
        statusVariant: "notice",
      },
      {
        id: "analysis",
        label: "Migration",
        Icon: getCategoryIcon("analysis"),
        status: "TMP",
        statusVariant: "negative",
      },
    ],
  },
  {
    id: "platforms",
    label: "Settings",
    Icon: getCategoryIcon("settings"),
    status: "TBD",
    statusVariant: "notice",
  },
];

export interface NavSidebarProps {
  page: string;
  onPageChange: (page: string) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  items?: readonly (NavSidebarItem | NavSidebarSection)[];
}

export function NavSidebar({
  page,
  onPageChange,
  isSidebarCollapsed,
  onToggleSidebar,
  items = navItems,
}: NavSidebarProps) {
  function renderItem({
    id,
    label,
    Icon,
    status,
    statusVariant,
  }: NavSidebarItem) {
    return (
      <SideNavItem key={id} id={id} href={`#${id}`} textValue={label}>
        <SideNavItemContent>
          <SideNavItemLink>
            <Icon />
            <Text
              styles={style({
                display: "flex",
                alignItems: "center",
                columnGap: 8,
                minWidth: 0,
              })}
            >
              <span className={getSidebarLabelClassName(isSidebarCollapsed)}>
                {label}
              </span>
              {status && !isSidebarCollapsed && (
                <Badge
                  fillStyle="subtle"
                  size="S"
                  variant={statusVariant}
                  overflowMode="truncate"
                  styles={style({ maxWidth: "[50%]", flexShrink: 0 })}
                >
                  {status}
                </Badge>
              )}
            </Text>
          </SideNavItemLink>
        </SideNavItemContent>
      </SideNavItem>
    );
  }

  return (
    <nav
      aria-label="Navigation"
      data-component="NavSidebar"
      data-collapsed={isSidebarCollapsed || undefined}
      className={sidebarPanel({ isCollapsed: isSidebarCollapsed })}
    >
      <RouterProvider navigate={(href) => onPageChange(href.slice(1))}>
        <SideNav
          aria-label="Pages"
          selectedRoute={`#${page}`}
          UNSAFE_className={String(
            style({
              width: "full",
              minWidth: 0,
              height: "auto",
              flexBasis: 0,
              flexGrow: 1,
              minHeight: 0,
              overflow: "auto",
            }),
          )}
        >
          {items.map((item, index) =>
            "items" in item ? (
              <SideNavSection
                key={item.id}
                id={item.id}
                aria-label={item.label}
                data-sidebar-section=""
              >
                <SideNavHeader>
                  {isSidebarCollapsed ? (
                    <div
                      className="sidebarSectionDivider"
                      data-leading={index === 0 || undefined}
                    >
                      {index > 0 && (
                        <Divider
                          size="S"
                          orientation="horizontal"
                          styles={style({ width: 32, margin: 0 })}
                        />
                      )}
                      <span className="sidebarSectionLabel-collapsed">
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    item.label
                  )}
                </SideNavHeader>
                {item.items.map(renderItem)}
              </SideNavSection>
            ) : (
              renderItem(item)
            ),
          )}
        </SideNav>
      </RouterProvider>

      <PanelToggleButton
        state={isSidebarCollapsed ? "collapsed" : "expanded"}
        onToggle={onToggleSidebar}
      />
    </nav>
  );
}
