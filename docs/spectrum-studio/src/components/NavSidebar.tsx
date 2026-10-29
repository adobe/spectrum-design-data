// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  SideNav,
  SideNavItem,
  SideNavItemContent,
  SideNavItemLink,
  Text,
} from "@react-spectrum/s2/SideNav";
import { Badge, type BadgeProps, type IconProps } from "@react-spectrum/s2";
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
});

export interface NavSidebarItem {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
  status?: string;
  statusVariant?: BadgeProps["variant"];
}

const navItems: readonly NavSidebarItem[] = [
  { id: "home", label: "Home", Icon: getCategoryIcon("home") },
  {
    id: "system-health",
    label: "System health",
    Icon: getCategoryIcon("system-health"),
    status: "FPO",
    statusVariant: "neutral",
  },
  {
    id: "analysis",
    label: "Analysis",
    Icon: getCategoryIcon("analysis"),
    status: "WTF",
    statusVariant: "negative",
  },
  {
    id: "foundations",
    label: "Foundations",
    Icon: getCategoryIcon("foundations"),
  },
  {
    id: "design",
    label: "Design",
    Icon: getCategoryIcon("design"),
    status: "WIP",
    statusVariant: "informative",
  },
  {
    id: "tokens",
    label: "Tokens",
    Icon: getCategoryIcon("tokens"),
    status: "WIP",
    statusVariant: "informative",
  },
  // { id: "structures", label: "Structures", Icon: Layout },
  {
    id: "components",
    label: "Components",
    Icon: getCategoryIcon("components"),
    status: "WIP",
    statusVariant: "informative",
  },
  {
    id: "logic",
    label: "Logic",
    Icon: getCategoryIcon("logic"),
    status: "WIP",
    statusVariant: "informative",
  },
  {
    id: "modes",
    label: "Modes",
    Icon: getCategoryIcon("modes"),
    status: "WIP",
    statusVariant: "informative",
  },
  {
    id: "registry",
    label: "Registry",
    Icon: getCategoryIcon("registry"),
    status: "WIP",
    statusVariant: "informative",
  },
  {
    id: "themes",
    label: "Themes",
    Icon: getCategoryIcon("themes"),
    status: "TBD",
    statusVariant: "notice",
  },
  {
    id: "platforms",
    label: "Platforms",
    Icon: getCategoryIcon("platforms"),
    status: "TBD",
    statusVariant: "notice",
  },
  // { id: "settings", label: "Settings", Icon: Settings },
];

export interface NavSidebarProps {
  page: string;
  onPageChange: (page: string) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  items?: readonly NavSidebarItem[];
}

export function NavSidebar({
  page,
  onPageChange,
  isSidebarCollapsed,
  onToggleSidebar,
  items = navItems,
}: NavSidebarProps) {
  return (
    <nav
      aria-label="Navigation"
      data-component="NavSidebar"
      className={sidebarPanel({ isCollapsed: isSidebarCollapsed })}
    >
      <RouterProvider navigate={(href) => onPageChange(href.slice(1))}>
        <SideNav
          aria-label="Pages"
          selectedRoute={`#${page}`}
          styles={style({
            width: "full",
            minWidth: 0,
            height: "auto",
            flexBasis: 0,
            flexGrow: 1,
          })}
        >
          {items.map(({ id, label, Icon, status, statusVariant }) => (
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
                    <span
                      className={getSidebarLabelClassName(isSidebarCollapsed)}
                    >
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
          ))}
        </SideNav>
      </RouterProvider>

      <PanelToggleButton
        state={isSidebarCollapsed ? "collapsed" : "expanded"}
        onToggle={onToggleSidebar}
      />
    </nav>
  );
}
