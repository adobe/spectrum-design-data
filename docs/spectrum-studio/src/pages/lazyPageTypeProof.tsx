// Copyright 2026 Adobe. All rights reserved.
import { lazy, type ComponentType } from "react";
import Accessibility from "./Accessibility";

const pages: Record<string, ComponentType> = {
  accessibility: Accessibility,
  themes: lazy(() => import("./Themes")),
};

export function LazyPageTypeProof({ page }: { page: string }) {
  const Page = pages[page] ?? Accessibility;
  return <Page />;
}
