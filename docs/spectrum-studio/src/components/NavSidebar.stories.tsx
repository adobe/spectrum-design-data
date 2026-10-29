// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import type { BadgeProps } from "@react-spectrum/s2";
import {
  SideNav,
  SideNavItem,
  SideNavItemContent,
  SideNavItemLink,
  Text,
} from "@react-spectrum/s2/SideNav";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { getCategoryIcon } from "./CategoryIcon";
import { useState } from "react";
import {
  NavSidebar,
  type NavSidebarItem,
  type NavSidebarProps,
} from "./NavSidebar";
import { sidebarTransitionTiming } from "./sideNavUtils";

const Home = getCategoryIcon("home");
const Shapes = getCategoryIcon("foundations");
const NamingOrder = getCategoryIcon("registry");
const TokenIcon = getCategoryIcon("tokens");
const Brush = getCategoryIcon("design");

const exampleItems: readonly NavSidebarItem[] = [
  {
    id: "home",
    label: "Home",
    Icon: Home,
    status: "New",
    statusVariant: "informative",
  },
  {
    id: "foundations",
    label: "Foundations",
    Icon: Shapes,
    status: "TBD",
    statusVariant: "notice",
  },
  { id: "tokens", label: "Tokens", Icon: TokenIcon, status: "Review" },
  { id: "registry", label: "Registry", Icon: NamingOrder },
  {
    id: "design",
    label: "Design",
    Icon: Brush,
    status: "",
    statusVariant: "negative",
  },
];

const variants = [
  "accent",
  "informative",
  "neutral",
  "positive",
  "notice",
  "negative",
  "gray",
  "red",
  "orange",
  "yellow",
  "chartreuse",
  "celery",
  "green",
  "seafoam",
  "cyan",
  "blue",
  "indigo",
  "purple",
  "fuchsia",
  "magenta",
  "pink",
  "turquoise",
  "brown",
  "cinnamon",
  "silver",
] as const satisfies readonly NonNullable<BadgeProps["variant"]>[];

function Fixture(args: NavSidebarProps) {
  const [page, setPage] = useState(args.page);
  const [collapsed, setCollapsed] = useState(args.isSidebarCollapsed);
  return (
    <div
      style={{
        width: collapsed ? 56 : 200,
        height: 440,
        transition: `width ${sidebarTransitionTiming}`,
      }}
    >
      <NavSidebar
        {...args}
        page={page}
        isSidebarCollapsed={collapsed}
        onPageChange={(next) => {
          setPage(next);
          args.onPageChange(next);
        }}
        onToggleSidebar={() => {
          setCollapsed((value) => !value);
          args.onToggleSidebar();
        }}
      />
    </div>
  );
}

const meta = {
  title: "Components/Navigation sidebar",
  component: NavSidebar,
  args: {
    page: "home",
    isSidebarCollapsed: false,
    items: exampleItems,
    onPageChange: fn(),
    onToggleSidebar: fn(),
  },
  parameters: { layout: "padded" },
  render: (args) => <Fixture {...args} />,
} satisfies Meta<typeof NavSidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const StatusBadges: Story = {
  name: "Status badges",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const nav = within(canvas.getByRole("navigation", { name: "Navigation" }));
    await expect(await nav.findByText("New", { exact: true })).toBeVisible();
    await expect(nav.getByText("TBD", { exact: true })).toBeVisible();
    await userEvent.click(nav.getByRole("link", { name: "Foundations TBD" }));
    await expect(args.onPageChange).toHaveBeenCalledWith("foundations");
    await expect(
      nav.getByRole("link", { name: "Foundations TBD" }),
    ).toHaveAttribute("aria-current", "page");
    await userEvent.click(nav.getByRole("button", { name: "Collapse" }));
    await waitFor(() =>
      expect(nav.queryByText("TBD", { exact: true })).not.toBeInTheDocument(),
    );
    await expect(
      nav.getByRole("link", { name: "Foundations" }),
    ).toHaveAttribute("aria-current", "page");
    await userEvent.click(nav.getByRole("button", { name: "Expand" }));
    await waitFor(() =>
      expect(nav.getByText("TBD", { exact: true })).toBeVisible(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const Collapsed: Story = { args: { isSidebarCollapsed: true } };
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const LongStatus: Story = {
  name: "Long status",
  args: {
    items: [
      {
        id: "home",
        label: "Home",
        Icon: Home,
        status: "Awaiting final design review",
        statusVariant: "purple",
      },
    ],
  },
};
export const AllVariants: Story = {
  name: "All badge variants",
  args: {
    page: "accent",
    items: variants.map((variant) => ({
      id: variant,
      label: variant,
      Icon: Home,
      status: "New",
      statusVariant: variant,
    })),
  },
};
export const DisclosureBehavior: Story = {
  name: "Disclosure behavior",
  render: () => (
    <div style={{ display: "flex", gap: 32 }}>
      <nav aria-label="Navigation" data-component="NavSidebar">
        <SideNav
          aria-label="Nested pages"
          selectedRoute="#colors"
          defaultExpandedKeys={["foundations"]}
          styles={style({ width: 200, height: 240 })}
        >
          <SideNavItem
            id="foundations"
            href="#foundations"
            textValue="Foundations"
          >
            <SideNavItemContent>
              <SideNavItemLink>
                <Shapes />
                <Text>Foundations</Text>
              </SideNavItemLink>
            </SideNavItemContent>
            <SideNavItem id="colors" href="#colors" textValue="Colors">
              <SideNavItemContent>
                <SideNavItemLink>
                  <Text>Colors</Text>
                </SideNavItemLink>
              </SideNavItemContent>
            </SideNavItem>
          </SideNavItem>
          <SideNavItem id="registry" href="#registry" textValue="Registry">
            <SideNavItemContent>
              <SideNavItemLink>
                <NamingOrder />
                <Text>Registry</Text>
              </SideNavItemLink>
            </SideNavItemContent>
          </SideNavItem>
        </SideNav>
      </nav>
      <nav aria-label="Unmodified navigation">
        <SideNav
          aria-label="Reference pages"
          selectedRoute="#home"
          styles={style({ width: 200, height: 240 })}
        >
          <SideNavItem id="home" href="#home" textValue="Home">
            <SideNavItemContent>
              <SideNavItemLink>
                <Home />
                <Text>Home</Text>
              </SideNavItemLink>
            </SideNavItemContent>
          </SideNavItem>
        </SideNav>
      </nav>
    </div>
  ),
};
