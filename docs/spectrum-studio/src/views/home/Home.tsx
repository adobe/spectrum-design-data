// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { Link as RouterLink, RouterProvider } from "react-aria-components";
import { BentoCard } from "../../components/BentoCard";
import { BentoGrid } from "../../components/BentoGrid";
import { appColorSchemeAtom } from "../../features/modes/capabilities";
import { spectrumChromeClassName } from "../../utils/spectrumChrome";
import { activePageAtom } from "../../state/view/navigation";
import Channel from "@react-spectrum/s2/illustrations/gradient/generic1/Channel";
import Shapes from "@react-spectrum/s2/illustrations/gradient/generic1/Shapes";
import Briefcase from "@react-spectrum/s2/illustrations/gradient/generic1/Briefcase";
import SpeedFast from "@react-spectrum/s2/illustrations/gradient/generic1/SpeedFast";
import "./Home.css";
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Cell,
  Row,
  Link,
  Badge,
  Text,
} from "@react-spectrum/s2";
import { CategoryIcon } from "../../components/CategoryIcon";

const homeHeadingStyles = {
  gridColumn: "span 4",
  marginTop: "0.875em",
  marginStart: 0,
  marginEnd: 0,
  marginBottom: 0,
};

export default function Home() {
  const colorScheme = useAtomValue(appColorSchemeAtom);
  const setActivePage = useSetAtom(activePageAtom);

  return (
    <RouterProvider navigate={(href) => setActivePage(href.slice(1))}>
      <div
        data-component="Home"
        className={`${spectrumChromeClassName(colorScheme)} ${style({
          display: "flex",
          flexDirection: "column",
          height: "full",
          overflowY: "auto",
        })}`}
      >
        <BentoGrid>
          <BentoCard colSpan={4} className="homeHero">
            <h1>Explore Spectrum's system in real time.</h1>
            <p>
              Powering quality and consistency of design across 100+ Adobe
              applications
            </p>
          </BentoCard>
          <h2 style={homeHeadingStyles}>Quick links</h2>
          <BentoCard colSpan={1}>
            <RouterLink href="#tokens" className="homeQuickLink">
              <Channel />
              <div className="homeCardContent">
                <h3>Tokens</h3>
                <p>Explore the tokens available in Spectrum.</p>
              </div>
            </RouterLink>
          </BentoCard>
          <BentoCard colSpan={1}>
            <RouterLink href="#foundations" className="homeQuickLink">
              <Shapes />
              <div className="homeCardContent">
                <h3>Foundations</h3>
                <p>Discover the underlying systems behind Spectrum.</p>
              </div>
            </RouterLink>
          </BentoCard>
          <BentoCard colSpan={1}>
            <RouterLink href="#components" className="homeQuickLink">
              <Briefcase />
              <div className="homeCardContent">
                <h3>Components</h3>
                <p>Browse our components and specifications.</p>
              </div>
            </RouterLink>
          </BentoCard>
          <BentoCard colSpan={1}>
            <RouterLink href="#system-health" className="homeQuickLink">
              <SpeedFast />
              <div className="homeCardContent">
                <h3>System health (FPO) </h3>
                <p>See analytics on the Spectrum design system.</p>
              </div>
            </RouterLink>
          </BentoCard>

          <h2 style={homeHeadingStyles}>Recent updates</h2>
          <BentoCard colSpan={4}>
            <TableView
              aria-label="Recent updates"
              density="spacious"
              isQuiet
              selectionMode="none"
            >
              <TableHeader>
                <Column key="update" id="update" isRowHeader width="2fr">
                  Update
                </Column>
                <Column key="type" id="type" width={160}>
                  Type
                </Column>
                <Column key="details" id="details" width="3fr">
                  Details
                </Column>
                <Column key="date" id="date" width="1fr">
                  Date
                </Column>
                <Column key="author" id="author" width="1fr">
                  Author
                </Column>
              </TableHeader>
              <TableBody>
                <Row key="1">
                  <Cell>
                    <Link>PR #123 Fixed some stuffs</Link>
                  </Cell>
                  <Cell>
                    <Badge
                      fillStyle="subtle"
                      variant="positive"
                      UNSAFE_className="homeUpdateBadge"
                    >
                      <CategoryIcon category="update.bug-fix" />
                      <Text>Bug fix</Text>
                    </Badge>
                  </Cell>
                  <Cell>Details about the initial release.</Cell>
                  <Cell>2024-06-01</Cell>
                  <Cell>Author Name</Cell>
                </Row>
                <Row key="4">
                  <Cell>
                    <Link>PR #123 Fixed some stuffs</Link>
                  </Cell>
                  <Cell>
                    <Badge
                      fillStyle="subtle"
                      variant="positive"
                      UNSAFE_className="homeUpdateBadge"
                    >
                      <CategoryIcon category="update.bug-fix" />
                      <Text>Bug fix</Text>
                    </Badge>
                  </Cell>
                  <Cell>Details about the initial release.</Cell>
                  <Cell>2024-06-01</Cell>
                  <Cell>Author Name</Cell>
                </Row>
                <Row key="2">
                  <Cell>
                    <Link>PR #345 Added more things</Link>
                  </Cell>
                  <Cell>
                    <Badge variant="blue" UNSAFE_className="homeUpdateBadge">
                      <CategoryIcon category="update.feature" />
                      <Text>Feature</Text>
                    </Badge>
                  </Cell>
                  <Cell>Details about the update.</Cell>
                  <Cell>2024-06-15</Cell>
                  <Cell>Author Name</Cell>
                </Row>
                <Row key="3">
                  <Cell>
                    <Link>PR #567 Broke everything again, oops.</Link>
                  </Cell>
                  <Cell>
                    <Badge
                      variant="negative"
                      UNSAFE_className="homeUpdateBadge"
                    >
                      <CategoryIcon category="update.breaking-change" />
                      <Text>Breaking change</Text>
                    </Badge>
                  </Cell>
                  <Cell>Details about the breaking change.</Cell>
                  <Cell>2024-06-20</Cell>
                  <Cell>Author Name</Cell>
                </Row>
                <Row key="5">
                  <Cell>
                    <Link>PR #123 Fixed some stuffs</Link>
                  </Cell>
                  <Cell>
                    <Badge
                      fillStyle="subtle"
                      variant="positive"
                      UNSAFE_className="homeUpdateBadge"
                    >
                      <CategoryIcon category="update.bug-fix" />
                      <Text>Bug fix</Text>
                    </Badge>
                  </Cell>
                  <Cell>Details about the initial release.</Cell>
                  <Cell>2024-06-01</Cell>
                  <Cell>Author Name</Cell>
                </Row>
                <Row key="6">
                  <Cell>
                    <Link>PR #345 Added more things</Link>
                  </Cell>
                  <Cell>
                    <Badge variant="blue" UNSAFE_className="homeUpdateBadge">
                      <CategoryIcon category="update.feature" />
                      <Text>Feature</Text>
                    </Badge>
                  </Cell>
                  <Cell>Details about the update.</Cell>
                  <Cell>2024-06-15</Cell>
                  <Cell>Author Name</Cell>
                </Row>
                <Row key="7">
                  <Cell>
                    <Link>PR #345 Added more things</Link>
                  </Cell>
                  <Cell>
                    <Badge variant="blue" UNSAFE_className="homeUpdateBadge">
                      <CategoryIcon category="update.feature" />
                      <Text>Feature</Text>
                    </Badge>
                  </Cell>
                  <Cell>Details about the update.</Cell>
                  <Cell>2024-06-15</Cell>
                  <Cell>Author Name</Cell>
                </Row>
              </TableBody>
            </TableView>
          </BentoCard>
        </BentoGrid>
      </div>
    </RouterProvider>
  );
}
