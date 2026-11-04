// Copyright 2026 Adobe. All rights reserved.
import { Content, Heading, IllustratedMessage } from "@react-spectrum/s2";
import Filters from "@react-spectrum/s2/illustrations/gradient/generic1/Filters";
import type { ReactNode } from "react";
import { CategoryIcon } from "./CategoryIcon";
import { resolveCategoryIllustration } from "../features/icons/categoryIllustrations";

export function CategoryIllustratedMessage({
  category,
  title,
  children,
}: {
  category: string;
  title: string;
  children: ReactNode;
}) {
  const illustrationName = resolveCategoryIllustration(category);

  return (
    <IllustratedMessage size="M" data-category={category}>
      {illustrationName === "Filters" ? (
        <Filters />
      ) : (
        <CategoryIcon category={category} />
      )}
      <Heading>{title}</Heading>
      <Content>{children}</Content>
    </IllustratedMessage>
  );
}
