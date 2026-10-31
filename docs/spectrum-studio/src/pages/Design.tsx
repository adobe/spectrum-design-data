// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../components/notifications/notificationContext";
import { Tab, TabList, TabPanel, Tabs, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { CategoryIcon } from "../components/CategoryIcon";
import { useAtom } from "jotai";
import { SubPanel } from "../components/SubPanel";
import { designSectionAtom, designViewAtom } from "../state/view/design";
import { StructuresPanel } from "../panels/structures/StructuresPanel";
import { StructureDesignView } from "../views/structures/StructureDesignView";
import { StructurePermutations } from "../views/structures/StructurePermutations";
import { SampleApp } from "../views/SampleApp";
import { ViewSwitcher } from "../views/ViewSwitcher";
import "./Design.css";

const comingSoonStyles = style({
  display: "flex",
  flexGrow: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
});
const tabsStyles = style({ flexGrow: 1, minHeight: 0, minWidth: 0 });

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
          <TabPanel id="concepts" UNSAFE_className="designSectionPanel">
            {placeholder("Concepts editing")}
          </TabPanel>
          <TabPanel id="elements" UNSAFE_className="designSectionPanel">
            {placeholder("Elements editing")}
          </TabPanel>
          <TabPanel id="structures" UNSAFE_className="designSectionPanel">
            <StructuresPanel />
          </TabPanel>
        </Tabs>
      </SubPanel>
      <ViewSwitcher
        aria-label="Design views"
        dataComponent="Design"
        configuration={{
          selectedKey: view,
          onSelectionChange: setView,
          surface: "pasteboard",
          options: [
            {
              id: "design",
              label: "Design",
              icon: <CategoryIcon category="design" />,
              content:
                section === "structures" ? (
                  <StructureDesignView />
                ) : (
                  placeholder(
                    `${section === "concepts" ? "Concepts" : "Elements"} design`,
                  )
                ),
            },
            {
              id: "permutations",
              label: "Permutations",
              icon: <CategoryIcon category="view.permutations" />,
              content:
                section === "structures" ? (
                  <StructurePermutations />
                ) : (
                  placeholder("Permutations")
                ),
            },
            {
              id: "preview",
              label: "Preview",
              icon: <CategoryIcon category="view.preview" />,
              content: <SampleApp />,
            },
          ],
        }}
      />
    </div>
  );
}
