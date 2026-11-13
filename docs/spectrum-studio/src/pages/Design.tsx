// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../components/notifications/notificationContext";
import { Tab, TabList, TabPanel, Tabs, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { CategoryIcon } from "../components/CategoryIcon";
import { useAtom } from "jotai";
import { SubPanel } from "../components/SubPanel";
import {
  designSectionAtom,
  designViewAtom,
  type DesignView,
} from "../state/view/design";
import { StructuresPanel } from "../panels/structures/StructuresPanel";
import { SampleApp } from "../views/SampleApp";
import { ViewSwitcher } from "../views/ViewSwitcher";
import "./Design.css";
import { StructureValueScaleFlow } from "../panels/structures/StructureValueScaleFlow";
import { lazy, Suspense } from "react";
import { LoadingIndicator } from "../components/LoadingIndicator";

const StylesPanel = lazy(async () => ({
  default: (await import("../panels/styles/StylesPanel")).StylesPanel,
}));
const StyleDesignView = lazy(async () => ({
  default: (await import("../views/styles/StyleDesignView")).StyleDesignView,
}));
const StructureDesignView = lazy(async () => ({
  default: (await import("../views/structures/StructureDesignView"))
    .StructureDesignView,
}));
const StructurePermutations = lazy(async () => ({
  default: (await import("../views/structures/StructurePermutations"))
    .StructurePermutations,
}));

const comingSoonStyles = style({
  display: "flex",
  flexGrow: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
});
const tabsStyles = style({ flexGrow: 1, minHeight: 0, minWidth: 0 });
// The Color roles accordion sits directly under the tab list.
const flushTabPanelStyles = style({ marginTop: 0 });

export default function Design() {
  const notify = useNotify();
  const [section, setSection] = useAtom(designSectionAtom);
  const [view, setView] = useAtom(designViewAtom);
  const placeholder = (label: string) => (
    <div className={comingSoonStyles}>
      <Text>{label} is coming soon.</Text>
    </div>
  );
  return (
    <>
      <StructureValueScaleFlow />
      <div className="pageWithSubPanel" data-component="DesignLayout">
        <SubPanel>
          <Tabs
            aria-label="Design sections"
            selectedKey={section}
            styles={tabsStyles}
            onSelectionChange={(key) => {
              if (
                key === "concepts" ||
                key === "elements" ||
                key === "structures"
              )
                setSection(key);
              else notify.error("This Design section is unavailable.");
            }}
          >
            <TabList UNSAFE_className="designTabList">
              <Tab id="concepts">
                <CategoryIcon category="styles" />
                <Text>Styles</Text>
              </Tab>
              <Tab id="structures">
                <CategoryIcon category="structures" />
                <Text>Structures</Text>
              </Tab>
            </TabList>
            <TabPanel
              id="concepts"
              UNSAFE_className="designSectionPanel"
              styles={flushTabPanelStyles}
            >
              <Suspense
                fallback={<LoadingIndicator aria-label="Loading styles" />}
              >
                <StylesPanel />
              </Suspense>
            </TabPanel>
            <TabPanel id="elements" UNSAFE_className="designSectionPanel">
              {placeholder("Elements editing")}
            </TabPanel>
            <TabPanel id="structures" UNSAFE_className="designSectionPanel">
              <StructuresPanel />
            </TabPanel>
          </Tabs>
        </SubPanel>
        <ViewSwitcher<DesignView>
          aria-label="Design views"
          dataComponent="Design"
          configuration={{
            selectedKey:
              section === "concepts" && view === "apps" ? "design" : view,
            onSelectionChange: setView,
            surface: "pasteboard",
            options: [
              {
                id: "design",
                label: "Design",
                icon: <CategoryIcon category="design" />,
                content:
                  section === "structures" ? (
                    <Suspense
                      fallback={
                        <LoadingIndicator aria-label="Loading structure editor" />
                      }
                    >
                      <StructureDesignView />
                    </Suspense>
                  ) : section === "concepts" ? (
                    <Suspense
                      fallback={
                        <LoadingIndicator aria-label="Loading style editor" />
                      }
                    >
                      <StyleDesignView />
                    </Suspense>
                  ) : (
                    placeholder("Elements design")
                  ),
              },
              {
                id: "permutations",
                label: "Permutations",
                icon: <CategoryIcon category="view.permutations" />,
                content:
                  section === "structures" ? (
                    <Suspense
                      fallback={
                        <LoadingIndicator aria-label="Loading structure permutations" />
                      }
                    >
                      <StructurePermutations />
                    </Suspense>
                  ) : section === "concepts" ? (
                    <Suspense
                      fallback={
                        <LoadingIndicator aria-label="Loading style permutations" />
                      }
                    >
                      <StyleDesignView permutations />
                    </Suspense>
                  ) : (
                    placeholder("Permutations")
                  ),
              },
              ...(section === "concepts"
                ? []
                : [
                    {
                      id: "apps" as const,
                      label: "Apps",
                      icon: <CategoryIcon category="view.apps" />,
                      content: <SampleApp />,
                    },
                  ]),
            ],
          }}
        />
      </div>
    </>
  );
}
