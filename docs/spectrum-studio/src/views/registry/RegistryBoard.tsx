// Copyright 2026 Adobe. All rights reserved.
import { useEffect, useRef, useState } from "react";
import { ActionButton, Menu, MenuItem, MenuTrigger } from "@react-spectrum/s2";
import More from "@react-spectrum/s2/icons/More";
import DragHandle from "../../features/icons/SpectrumDragHandle";
import {
  Button as DragButton,
  DropIndicator,
  GridList,
  GridListItem,
  useDragAndDrop,
} from "react-aria-components";
import type {
  TaxonomyCategory,
  TaxonomyDocument,
} from "../../features/taxonomy/model";
import type { ReferencedTaxonomySource } from "../../features/taxonomy/referenceValidation";
import { reorderRegistryCategories } from "../../features/taxonomy/registryDraft";
import { RegistryCategoryCard } from "../../panels/registry/RegistryCategoryCard";
import { RegistryError } from "../../panels/registry/RegistryFields";
import { registryDropLine } from "../../panels/registry/registryStyles";
import "./TaxonomyView.css";

const dragType = "application/x-studio-registry-category";

export interface RegistryBoardProps {
  document: TaxonomyDocument;
  source: ReferencedTaxonomySource;
  editable: boolean;
  onCommit: (next: TaxonomyDocument, base: TaxonomyDocument) => void;
  onOpen: (categoryId: string, termId?: string) => void;
  onDelete: (categoryId: string, termId?: string) => void;
}

export function RegistryBoard(props: RegistryBoardProps) {
  const { document, editable, onCommit, onOpen, onDelete } = props;
  const [error, setError] = useState("");
  const dragBase = useRef<TaxonomyDocument | null>(null);
  const [dragReady, setDragReady] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // The displayed order updates first; the data write follows after paint.
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const pending = useRef<{ order: string[]; base: TaxonomyDocument } | null>(
    null,
  );
  const commitFrame = useRef<number | undefined>(undefined);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  function cancelScheduledCommit() {
    if (commitFrame.current !== undefined)
      cancelAnimationFrame(commitFrame.current);
    clearTimeout(commitTimer.current);
  }
  useEffect(
    () => () => {
      clearTimeout(collapseTimer.current);
      if (commitFrame.current !== undefined)
        cancelAnimationFrame(commitFrame.current);
      clearTimeout(commitTimer.current);
    },
    [],
  );
  const order = pendingOrder ?? document.order;
  const categories = order.flatMap((id) => {
    const category = document.categories.find((item) => item.id === id);
    return category ? [category] : [];
  });
  function flush() {
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    try {
      onCommit({ ...next.base, order: next.order }, next.base);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
    setPendingOrder(null);
  }
  function move(
    moving: string,
    target: string,
    position: "before" | "after",
    base = document,
  ) {
    try {
      if (!editable) throw new Error("Choose Edit to reorder categories.");
      const from = pending.current?.order ?? base.order;
      const next = reorderRegistryCategories(from, moving, target, position);
      if (next.every((id, index) => id === from[index])) return;
      pending.current = { order: next, base: pending.current?.base ?? base };
      setPendingOrder(next);
      setError("");
      cancelScheduledCommit();
      commitFrame.current = requestAnimationFrame(() => {
        commitTimer.current = setTimeout(flush, 0);
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }
  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: !editable,
    acceptedDragTypes: [dragType],
    getItems: (keys) => [...keys].map((key) => ({ [dragType]: String(key) })),
    getAllowedDropOperations: () => ["move"],
    onDragStart: () => {
      dragBase.current = document;
      // Capture the native drag image before collapsing its source card.
      collapseTimer.current = setTimeout(() => setDragReady(true), 0);
    },
    onDragEnd: () => {
      dragBase.current = null;
      clearTimeout(collapseTimer.current);
      setDragReady(false);
    },
    onReorder: (event) => {
      const key = [...event.keys][0];
      const position = event.target.dropPosition;
      if (
        !dragBase.current ||
        event.keys.size !== 1 ||
        key === undefined ||
        (position !== "before" && position !== "after")
      ) {
        setError("Choose a position between categories.");
        return;
      }
      move(String(key), String(event.target.key), position, dragBase.current);
    },
    renderDropIndicator: (target) => (
      <DropIndicator target={target} className="registryDropIndicator">
        <span className={registryDropLine} />
      </DropIndicator>
    ),
    renderDragPreview: (items) => {
      const category = categories.find(
        (item) => item.id === items[0]?.[dragType],
      );
      return (
        <div className="registryDragPreview" aria-hidden="true">
          {category ? card(category, false) : "Category no longer available."}
        </div>
      );
    },
  });
  function card(category: TaxonomyCategory, interactive = true) {
    const index = order.indexOf(category.id);
    return (
      <RegistryCategoryCard
        {...props}
        category={category}
        editable={interactive && editable}
        onOpen={() => onOpen(category.id)}
        onOpenTerm={(termId) => onOpen(category.id, termId)}
        onDelete={() => onDelete(category.id)}
        onDeleteTerm={(termId) => onDelete(category.id, termId)}
        handle={
          editable && interactive ? (
            <>
              <DragButton
                slot="drag"
                className="registryDragHandle"
                aria-label={`Reorder ${category.name}`}
              >
                <DragHandle />
              </DragButton>
              <MenuTrigger>
                <ActionButton
                  isQuiet
                  size="S"
                  aria-label={`Reorder options for ${category.name}`}
                >
                  <More />
                </ActionButton>
                <Menu
                  aria-label={`Move ${category.name}`}
                  disabledKeys={[
                    ...(index === 0 ? ["earlier"] : []),
                    ...(index === categories.length - 1 ? ["later"] : []),
                  ]}
                  onAction={(key) => {
                    const target = order[index + (key === "earlier" ? -1 : 1)];
                    if (target)
                      move(
                        category.id,
                        target,
                        key === "earlier" ? "before" : "after",
                      );
                  }}
                >
                  <MenuItem id="earlier">Move earlier</MenuItem>
                  <MenuItem id="later">Move later</MenuItem>
                </Menu>
              </MenuTrigger>
            </>
          ) : undefined
        }
      />
    );
  }
  return (
    <>
      <RegistryError message={error} />
      <GridList
        aria-label="Registry category order"
        className={`registryBoard${dragReady ? " registryBoardDragging" : ""}`}
        orientation="horizontal"
        layout="stack"
        items={categories}
        selectionMode="none"
        dragAndDropHooks={dragAndDropHooks}
      >
        {(category) => (
          <GridListItem
            id={category.id}
            textValue={category.name}
            className="registryCategoryItem"
          >
            {card(category)}
          </GridListItem>
        )}
      </GridList>
    </>
  );
}
