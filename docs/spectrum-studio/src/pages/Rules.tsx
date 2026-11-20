// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { RulesView } from "../views/logic/RulesView";

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

export default function Rules() {
  return (
    <div className="pageMainContent" data-component="Rules">
      <div className={pageStyles}>
        <header className={headingGroupStyles}>
          <h2 className={headingStyles}>Rules</h2>
          <p className={introStyles}>
            Reusable rules that foundations and components reference.
          </p>
        </header>
        <RulesView />
      </div>
    </div>
  );
}
