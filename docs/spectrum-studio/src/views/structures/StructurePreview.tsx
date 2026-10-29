// Copyright 2026 Adobe. All rights reserved.
import { useLayoutEffect, useRef, useState, type Ref } from "react";
import { Button as AriaButton } from "react-aria-components";
import { Content, Heading, InlineAlert } from "@react-spectrum/s2";
import type { resolveStructure } from "../../features/structures/resolution";
import type { ResolvedElement } from "../../features/structures/elementResolution";
import {
  ELEMENT_TYPES,
  type ElementKind,
} from "../../features/structures/elements";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import { StructureElementPreview } from "./StructureElementPreview";
import { AddStructureElement } from "./AddStructureElement";
import "./StructurePreview.css";
import type { Structure } from "../../features/structures/model";
import type {
  ResolvedChild,
  ResolvedComposition,
} from "../../features/structures/composition";
import type { StructureInsertionContext } from "../../features/structures/children";

function ChildContent({
  child,
  path = "",
}: {
  child: ResolvedChild;
  path?: string;
}) {
  if (!("composition" in child))
    return <StructureElementPreview resolved={child} />;
  const instancePath = `${path}/${child.instance.id}`;
  return (
    <span
      className="structureModule"
      data-structure-id={child.composition.structure.conceptId}
      data-instance-path={instancePath}
      style={child.composition.resolved.styles}
    >
      {child.composition.children.map((item) => (
        <ChildContent
          key={"instance" in item ? item.instance.id : item.element.id}
          child={item}
          path={instancePath}
        />
      ))}
    </span>
  );
}

export interface StructurePreviewProps {
  name: string;
  resolved: ReturnType<typeof resolveStructure>;
  isMeasurement?: boolean;
  measurementRef?: Ref<HTMLDivElement>;
  elements?: readonly ResolvedElement[];
  taxonomy?: TaxonomyDocument;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onInsert?: (
    kind: ElementKind,
    index: number,
    expected: StructureInsertionContext,
  ) => void;
  composition?: ResolvedComposition;
  structures?: readonly Structure[];
  onInsertStructure?: (
    id: string,
    index: number,
    expected: StructureInsertionContext,
  ) => void;
}
export function StructurePreview({
  name,
  resolved,
  isMeasurement = false,
  measurementRef,
  elements = [],
  taxonomy,
  selectedElementId,
  onSelectElement,
  onInsert,
  composition,
  structures,
  onInsertStructure,
}: StructurePreviewProps) {
  const frame = useRef<HTMLDivElement | null>(null);
  const [boundaries, setBoundaries] = useState<number[]>([0]);
  const [nearest, setNearest] = useState(0);
  const [openMenu, setOpenMenu] = useState<{
    index: number;
    signature: string;
  } | null>(null);
  const [pointerOverElement, setPointerOverElement] = useState(false);
  const interactive = !isMeasurement && !!onSelectElement;
  const children: readonly ResolvedChild[] = composition?.children ?? elements;
  const column = resolved.styles.flexDirection === "column";
  const insertionContext: StructureInsertionContext = {
    childIds: children.map((child) =>
      "instance" in child ? child.instance.id : child.element.id,
    ),
    direction: column ? "vertical" : "horizontal",
  };
  const signature = JSON.stringify([
    composition?.structure.conceptId,
    insertionContext,
  ]);
  const menuOpen = openMenu?.signature === signature;
  const measurementKey = JSON.stringify([children, resolved.styles]);
  useLayoutEffect(() => {
    const root = frame.current;
    if (!root || isMeasurement || !onInsert) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const children = [
        ...root.querySelectorAll<HTMLElement>(":scope > [data-element-id]"),
      ].map((item) => item.getBoundingClientRect());
      const start = column ? "top" : "left",
        end = column ? "bottom" : "right";
      const points = children.length
        ? [
            children[0][start] - box[start] - 4,
            ...children
              .slice(1)
              .map(
                (child, index) =>
                  (children[index][end] + child[start]) / 2 - box[start],
              ),
            children[children.length - 1][end] - box[start] + 4,
          ]
        : [(column ? box.height : box.width) / 2];
      setBoundaries((previous) =>
        JSON.stringify(previous) === JSON.stringify(points) ? previous : points,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [measurementKey, isMeasurement, onInsert, column]);
  const issues = [
    ...new Set(
      composition?.issues ?? [
        ...Object.values(resolved.issues),
        ...elements.flatMap((element) => element.issues),
      ],
    ),
  ];
  if (!isMeasurement && issues.length)
    return (
      <InlineAlert variant="negative">
        <Heading>Check this structure</Heading>
        <Content>{issues.join(" ")}</Content>
      </InlineAlert>
    );
  return (
    <div
      ref={(node) => {
        frame.current = node;
        if (typeof measurementRef === "function") measurementRef(node);
        else if (measurementRef) measurementRef.current = node;
      }}
      className={`structurePreview${isMeasurement ? " structurePreviewMeasurement" : ""}`}
      style={isMeasurement ? resolved.intrinsicStyles : resolved.styles}
      aria-hidden={isMeasurement || undefined}
      inert={isMeasurement || undefined}
      role={isMeasurement ? undefined : interactive ? "group" : "img"}
      aria-label={isMeasurement ? undefined : `${name} structure preview`}
      tabIndex={interactive ? 0 : undefined}
      data-empty={!children.length || undefined}
      data-editable={!!onInsert || undefined}
      data-direction={column ? "vertical" : "horizontal"}
      data-pointer-over-element={pointerOverElement || undefined}
      data-hug-width={
        (resolved.styles.width === "max-content" &&
          resolved.styles.minWidth === undefined &&
          resolved.styles.maxWidth === undefined) ||
        undefined
      }
      data-hug-height={
        (resolved.styles.height === "max-content" &&
          resolved.styles.minHeight === undefined &&
          resolved.styles.maxHeight === undefined) ||
        undefined
      }
      onClick={
        interactive
          ? (event) => {
              if (event.target === event.currentTarget) onSelectElement?.(null);
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (
                event.key === "Escape" ||
                (event.target === event.currentTarget &&
                  (event.key === "Enter" || event.key === " "))
              ) {
                event.preventDefault();
                onSelectElement?.(null);
                event.currentTarget.focus();
              }
            }
          : undefined
      }
      onPointerMove={
        onInsert
          ? (event) => {
              if (menuOpen) return;
              const box = event.currentTarget.getBoundingClientRect();
              const x = column
                ? event.clientY - box.top
                : event.clientX - box.left;
              setPointerOverElement(
                [
                  ...event.currentTarget.querySelectorAll<HTMLElement>(
                    ":scope > [data-element-id]",
                  ),
                ].some((element) => {
                  const box = element.getBoundingClientRect();
                  return (
                    event.clientX > box.left &&
                    event.clientX < box.right &&
                    event.clientY > box.top &&
                    event.clientY < box.bottom
                  );
                }),
              );
              setNearest(
                boundaries.reduce(
                  (best, point, index) =>
                    Math.abs(point - x) < Math.abs(boundaries[best] - x)
                      ? index
                      : best,
                  0,
                ),
              );
            }
          : undefined
      }
      onPointerLeave={onInsert ? () => setPointerOverElement(false) : undefined}
      data-component={
        isMeasurement ? "StructureMeasurement" : "StructurePreview"
      }
    >
      {children.map((child, index) => {
        const id = "instance" in child ? child.instance.id : child.element.id;
        const label =
          "composition" in child
            ? `${child.composition.structure.name} Structure instance ${index + 1}`
            : `${taxonomy?.terms.find((term) => term.id === child.element.termId)?.value ?? ELEMENT_TYPES[child.element.kind].label} element ${index + 1}`;
        return interactive ? (
          <AriaButton
            key={id}
            className="structureElementSelection"
            data-element-id={id}
            data-selected={selectedElementId === id || undefined}
            aria-label={label}
            aria-pressed={selectedElementId === id}
            onPress={() => onSelectElement?.(id)}
            onFocus={() => onSelectElement?.(id)}
          >
            <ChildContent child={child} />
          </AriaButton>
        ) : (
          <span
            key={id}
            className="structureElementSelection"
            data-element-id={id}
          >
            <ChildContent child={child} />
          </span>
        );
      })}
      {!isMeasurement &&
        onInsert &&
        taxonomy &&
        boundaries.map((left, index) => (
          <div
            key={index}
            className="structureInsertion"
            style={column ? { top: left } : { left }}
            data-current={nearest === index || undefined}
            data-menu-open={(menuOpen && nearest === index) || undefined}
            onFocusCapture={() => setPointerOverElement(false)}
          >
            <AddStructureElement
              index={index}
              taxonomy={taxonomy}
              isOpen={menuOpen && openMenu?.index === index}
              onInsert={(kind, position) =>
                onInsert(kind, position, insertionContext)
              }
              structures={structures}
              onInsertStructure={
                onInsertStructure
                  ? (id, position) =>
                      onInsertStructure(id, position, insertionContext)
                  : undefined
              }
              onOpenChange={(open) => {
                if (open) setNearest(index);
                setOpenMenu(open ? { index, signature } : null);
              }}
            />
          </div>
        ))}
    </div>
  );
}
