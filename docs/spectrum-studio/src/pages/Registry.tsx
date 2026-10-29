// Copyright 2026 Adobe. All rights reserved.
import {
  Content,
  Heading,
  InlineAlert,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { TaxonomyView } from "../views/registry/TaxonomyView";
import { useAtomValue } from "jotai";
import { persistenceIssuesAtom } from "../state/persist";

const pageStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 24,
  height: "full",
  minHeight: 0,
  overflow: "auto",
  padding: 24,
});
const headingGroupStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});
const headingStyles = style({ font: "heading-lg", margin: 0 });
const introStyles = style({
  font: "body",
  color: "neutral-subdued",
  margin: 0,
});
const tabPanelStyles = style({ marginTop: 16, minWidth: 0 });

export default function Registry() {
  const issues = useAtomValue(persistenceIssuesAtom);
  return (
    <div className="pageMainContent" data-component="Registry">
      <div className={pageStyles}>
        <header className={headingGroupStyles}>
          <h2 className={headingStyles}>Registry</h2>
          <p className={introStyles}>
            Categories and terms used to name and organize your tokens.
          </p>
        </header>
        {issues.map((issue) => (
          <InlineAlert key={issue} variant="negative">
            <Heading>Stored data needs attention</Heading>
            <Content>{issue}</Content>
          </InlineAlert>
        ))}
        <Tabs density="compact" aria-label="Registry sections">
          <TabList>
            <Tab id="taxonomy">Taxonomy</Tab>
          </TabList>
          <TabPanel styles={tabPanelStyles} id="taxonomy">
            <TaxonomyView />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
