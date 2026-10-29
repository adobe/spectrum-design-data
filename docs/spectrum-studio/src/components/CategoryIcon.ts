// Copyright 2026 Adobe. All rights reserved.
import type { IconProps } from "@react-spectrum/s2";
import Circle from "@react-spectrum/s2/icons/Circle";
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  type ComponentType,
} from "react";
import {
  categoryIconConfiguration,
  createCategoryIconReporter,
  resolveCategoryIcon,
  type CategoryIconConfiguration,
  type CategoryIconKey,
} from "../features/icons/categoryIcons";
import { useIconSample } from "../features/icons/useIconSample";

export const CategoryIconConfigurationContext =
  createContext<CategoryIconConfiguration>(categoryIconConfiguration);
const reportIssue = createCategoryIconReporter((message) =>
  console.error(message),
);

export function CategoryIcon({
  category,
  ...props
}: IconProps & { category: string }) {
  const config = useContext(CategoryIconConfigurationContext);
  const { iconName, issue } = resolveCategoryIcon(category, config);
  const result = useIconSample(iconName, !issue);
  const error =
    issue ?? (result.status === "error" ? result.message : undefined);
  useEffect(() => {
    if (error) reportIssue(error);
  }, [error]);
  const attributes = { "data-category": category };
  if (error) {
    const fallbackProps = {
      ...props,
      ...attributes,
      "data-category-icon": "Circle",
      "data-category-icon-error": error,
    };
    return createElement(Circle, fallbackProps);
  }
  if (result.status === "ready") {
    const readyProps = {
      ...props,
      ...attributes,
      "data-category-icon": iconName,
    };
    return createElement(result.Icon, readyProps);
  }
  const loadingProps: IconProps &
    typeof attributes & { "data-category-icon-loading": string } = {
    ...props,
    ...attributes,
    "aria-hidden": true,
    "data-category-icon-loading": iconName,
    UNSAFE_style: { ...props.UNSAFE_style, visibility: "hidden" },
  };
  return createElement(Circle, loadingProps);
}

const components = new Map<CategoryIconKey, ComponentType<IconProps>>();
export function getCategoryIcon(
  category: CategoryIconKey,
): ComponentType<IconProps> {
  let Icon = components.get(category);
  if (!Icon) {
    Icon = (props: IconProps) =>
      createElement(CategoryIcon, { category, ...props });
    components.set(category, Icon);
  }
  return Icon;
}
