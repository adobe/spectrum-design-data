// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom, useAtomValue } from "jotai";
import { memo, useDeferredValue, type ComponentType } from "react";

import { TopBar } from "../components/TopBar";
import { NavSidebar } from "../components/NavSidebar";
import { ContentArea } from "../views/ContentArea";
import { ChangelogPanel } from "../components/ChangelogPanel";
import { sidebarTransitionTiming } from "../components/sideNavUtils";
import {
  activePageAtom,
  changelogCollapsedAtom,
  sidebarCollapsedAtom,
} from "../state/view/navigation";
import { editModeAtom } from "../state/view/editMode";
import { appColorSchemeAtom } from "../features/modes/capabilities";
import { spectrumChromeClassName } from "../utils/spectrumChrome";
import Home from "../views/home/Home";
import SystemHealth from "./SystemHealth";
import Foundations from "./Foundations";
import Design from "./Design";
import Tokens from "./Tokens";
import Platforms from "./Platforms";
import Themes from "./Themes";
import Modes from "./Modes";
import Components from "./Components";
import Settings from "./Settings";
import Registry from "./Registry";
import Logic from "./Logic";
import Analysis from "./Analysis";
import { CurrentColorOutputBoundary } from "../components/ColorOutputBoundary";
import { DerivedContentBoundary } from "../components/DerivedContentBoundary";

const pages: Record<string, ComponentType> = {
  registry: Registry,
  home: Home,
  "system-health": SystemHealth,
  analysis: Analysis,
  foundations: Foundations,
  design: Design,
  logic: Logic,
  tokens: Tokens,
  platforms: Platforms,
  themes: Themes,
  modes: Modes,
  components: Components,
  settings: Settings,
};

const PageContent = memo(function PageContent({ page }: { page: string }) {
  const Page = pages[page] ?? ContentArea;
  return (
    <CurrentColorOutputBoundary key={page}>
      <Page />
    </CurrentColorOutputBoundary>
  );
});

export default function BrowsingContext() {
  const [page, setPage] = useAtom(activePageAtom);
  const displayedPage = useDeferredValue(page);
  const isPagePending = page !== displayedPage;
  const [isSidebarCollapsed, setSidebarCollapsed] =
    useAtom(sidebarCollapsedAtom);
  const isChangelogCollapsed = useAtomValue(changelogCollapsedAtom);
  const isEditMode = useAtomValue(editModeAtom);
  const showChangelog = isEditMode && page !== "analysis";
  const chromeClassName = spectrumChromeClassName(
    useAtomValue(appColorSchemeAtom),
  );
  const sidebarColumnWidth = isSidebarCollapsed ? 56 : 200;
  const changelogColumnWidth = showChangelog
    ? isChangelogCollapsed
      ? 0
      : 280
    : 0;
  const mainGridColumn = !showChangelog
    ? "2 / span 10"
    : isChangelogCollapsed
      ? "2 / span 9"
      : "2 / span 8";

  return (
    <div
      className={style({
        padding: 0,
        backgroundColor: "layer-1",
        height: "screen",
      })}
    >
      <div
        className={style({
          display: "grid",
          width: "full",
          height: "full",
        })}
        style={{
          gap: "0px 0px",
          gridTemplateColumns: `${sidebarColumnWidth}px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) ${changelogColumnWidth}px`,
          gridTemplateRows:
            "56px 420px minmax(24px, 1fr) minmax(24px, 1fr) minmax(24px, 1fr) minmax(24px, 1fr) minmax(24px, 1fr)",
          transition: `grid-template-columns ${sidebarTransitionTiming}`,
          willChange: "grid-template-columns",
        }}
      >
        <div
          className={`${chromeClassName} ${style({
            gridColumnStart: "[1]",
            gridColumnEnd: "[span 11]",
            gridRowStart: "[1]",
            gridRowEnd: "[span 1]",
          })}`}
        >
          <TopBar />
        </div>

        <div
          className={`${chromeClassName} ${style({
            gridColumnStart: "[1]",
            gridColumnEnd: "[span 1]",
            gridRowStart: "[2]",
            gridRowEnd: "[span 6]",
          })}`}
        >
          <NavSidebar
            page={page}
            onPageChange={setPage}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          />
        </div>

        <main
          data-component="BrowsingContext-main"
          inert={isPagePending}
          aria-busy={isPagePending || undefined}
          className={style({
            display: "flex",
            flexDirection: "column",
            backgroundColor: "base",
            marginEnd: 12,
            padding: 0,
            borderTopStartRadius: "xl",
            borderTopEndRadius: "xl",
            gridRowStart: "[2]",
            gridRowEnd: "[span 6]",
            minHeight: 0,
            boxShadow: "elevated",
            overflowY: "auto",
          })}
          style={{ gridColumn: mainGridColumn }}
        >
          <DerivedContentBoundary
            state={isPagePending ? "pending" : "ready"}
            label="Page content"
          >
            <PageContent page={displayedPage} />
          </DerivedContentBoundary>
        </main>

        {showChangelog && (
          <div
            className={`${chromeClassName} ${style({
              gridRowStart: "[2]",
              gridRowEnd: "[span 6]",
            })}`}
            style={{
              gridColumn: isChangelogCollapsed ? "11 / span 1" : "10 / span 2",
              minWidth: 0,
            }}
          >
            <ChangelogPanel isCollapsed={isChangelogCollapsed} />
          </div>
        )}
      </div>
    </div>
  );
}
