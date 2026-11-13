// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom, useAtomValue } from "jotai";
import {
  lazy,
  memo,
  Suspense,
  useDeferredValue,
  type ComponentType,
} from "react";

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
import Accessibility from "./Accessibility";
import { CurrentColorOutputBoundary } from "../components/ColorOutputBoundary";
import { DerivedContentBoundary } from "../components/DerivedContentBoundary";

// Each page's code loads on its first visit, so a refresh only loads Home's code.
const pages: Record<string, ComponentType> = {
  registry: lazy(() => import("./Registry")),
  home: Home,
  "system-health": lazy(() => import("./SystemHealth")),
  analysis: lazy(() => import("./Analysis")),
  accessibility: Accessibility,
  foundations: lazy(() => import("./Foundations")),
  design: lazy(() => import("./Design")),
  logic: lazy(() => import("./Logic")),
  tokens: lazy(() => import("./Tokens")),
  platforms: lazy(() => import("./Platforms")),
  themes: lazy(() => import("./Themes")),
  modes: lazy(() => import("./Modes")),
  components: lazy(() => import("./Components")),
  settings: lazy(() => import("./Settings")),
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
          {/* While a page's code loads, the previous page stays visible; the
              fallback appears only before any page has been shown. */}
          <Suspense
            fallback={
              <DerivedContentBoundary state="pending" label="Page content">
                {null}
              </DerivedContentBoundary>
            }
          >
            <DerivedContentBoundary
              state={isPagePending ? "pending" : "ready"}
              label="Page content"
            >
              <PageContent page={displayedPage} />
            </DerivedContentBoundary>
          </Suspense>
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
