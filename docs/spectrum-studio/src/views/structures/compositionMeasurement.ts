// Copyright 2026 Adobe. All rights reserved.
import type {
  PreviewLayoutContext,
  resolveStructure,
} from "../../features/structures/resolution";

export function measureCompositionLayouts(
  sample: HTMLElement,
  stage: HTMLElement,
  resolved: ReturnType<typeof resolveStructure>,
): Record<string, PreviewLayoutContext> {
  const visible = [
    ...stage.querySelectorAll<HTMLElement>("[data-instance-path]"),
  ];
  const px = (value: string) => {
    if (value === "normal") return 0;
    const result = Number.parseFloat(value);
    if (!Number.isFinite(result))
      throw new Error("A nested Structure has an unmeasurable layout value.");
    return result;
  };
  const available = (parent: HTMLElement, axis: "width" | "height"): number => {
    const styles = getComputedStyle(parent);
    const horizontal = axis === "width";
    const padding = horizontal
      ? px(styles.paddingLeft) + px(styles.paddingRight)
      : px(styles.paddingTop) + px(styles.paddingBottom);
    const border = horizontal
      ? px(styles.borderLeftWidth) + px(styles.borderRightWidth)
      : px(styles.borderTopWidth) + px(styles.borderBottomWidth);
    const dimension =
      parent === sample ? resolved.styles[axis] : parent.style[axis];
    const ancestor = parent.parentElement?.closest<HTMLElement>(
      ".structureModule, .structurePreview",
    );
    let outer =
      typeof dimension === "number"
        ? dimension
        : dimension === "100%"
          ? ancestor
            ? available(ancestor, axis)
            : horizontal
              ? stage.clientWidth -
                px(getComputedStyle(stage).paddingLeft) -
                px(getComputedStyle(stage).paddingRight)
              : stage.clientHeight -
                px(getComputedStyle(stage).paddingTop) -
                px(getComputedStyle(stage).paddingBottom)
          : parent.getBoundingClientRect()[axis];
    const minimum =
      parent === sample
        ? resolved.styles[horizontal ? "minWidth" : "minHeight"]
        : parent.style[horizontal ? "minWidth" : "minHeight"];
    const maximum =
      parent === sample
        ? resolved.styles[horizontal ? "maxWidth" : "maxHeight"]
        : parent.style[horizontal ? "maxWidth" : "maxHeight"];
    if (
      typeof maximum === "number" ||
      (typeof maximum === "string" && maximum.endsWith("px"))
    )
      outer = Math.min(
        outer,
        typeof maximum === "number" ? maximum : px(maximum),
      );
    if (
      typeof minimum === "number" ||
      (typeof minimum === "string" && minimum.endsWith("px"))
    )
      outer = Math.max(
        outer,
        typeof minimum === "number" ? minimum : px(minimum),
      );
    return Math.max(0, outer - border - padding);
  };
  return Object.fromEntries(
    [...sample.querySelectorAll<HTMLElement>("[data-instance-path]")].map(
      (node) => {
        const path = node.dataset.instancePath!;
        const styles = getComputedStyle(node);
        const children = [...node.children].map((child) =>
          child.getBoundingClientRect(),
        );
        const column = styles.flexDirection === "column";
        const width = column
          ? Math.max(0, ...children.map((box) => box.width))
          : children.reduce((sum, box) => sum + box.width, 0);
        const height = column
          ? children.reduce((sum, box) => sum + box.height, 0)
          : Math.max(0, ...children.map((box) => box.height));
        const gap = Math.max(0, children.length - 1);
        const actual =
          visible.find((item) => item.dataset.instancePath === path) ?? node;
        const parent = actual.parentElement?.closest<HTMLElement>(
          ".structureModule, .structurePreview",
        );
        const parentStyles = parent ? getComputedStyle(parent) : null;
        return [
          path,
          {
            naturalWidth:
              width +
              (column ? 0 : gap * px(styles.columnGap)) +
              px(styles.paddingLeft) +
              px(styles.paddingRight),
            naturalHeight:
              height +
              (column ? gap * px(styles.rowGap) : 0) +
              px(styles.paddingTop) +
              px(styles.paddingBottom),
            availableWidth:
              parent && parentStyles
                ? actual === node
                  ? available(parent, "width")
                  : parent.getBoundingClientRect().width -
                    px(parentStyles.borderLeftWidth) -
                    px(parentStyles.borderRightWidth) -
                    px(parentStyles.paddingLeft) -
                    px(parentStyles.paddingRight)
                : null,
            availableHeight:
              parent && parentStyles
                ? actual === node
                  ? available(parent, "height")
                  : parent.getBoundingClientRect().height -
                    px(parentStyles.borderTopWidth) -
                    px(parentStyles.borderBottomWidth) -
                    px(parentStyles.paddingTop) -
                    px(parentStyles.paddingBottom)
                : null,
          },
        ];
      },
    ),
  );
}
