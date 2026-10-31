// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import {
  ActionButton,
  DialogTrigger,
  Popover,
  Tag,
  TagGroup,
  Text,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { Dialog } from "react-aria-components";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import { popoverDialogStyles } from "../../components/popoverLayout";
import type {
  Classification,
  TaxonomyDocument,
  TaxonomyScope,
} from "../../features/taxonomy/model";
import { inspectorStyles as styles } from "./tokenInspectorStyles";
import { termLabel } from "../../features/taxonomy/termPresentation";

export function ClassificationTerms({
  value,
  taxonomy,
  scope,
  onChange,
}: {
  value: Classification;
  taxonomy: TaxonomyDocument;
  scope: TaxonomyScope;
  onChange: (value: Classification) => void;
}) {
  const [category, setCategory] = useState<string>();
  const [editingTerm, setEditingTerm] = useState<string>();
  const [open, setOpen] = useState(false);
  const selected = taxonomy.order.flatMap((id) => {
    const assigned = value[id];
    return (
      Array.isArray(assigned) ? assigned : assigned ? [assigned] : []
    ).map((termId, index) => ({
      id: `${id}:${index}`,
      categoryId: id,
      termId,
      category: taxonomy.categories.find((item) => item.id === id)?.name ?? id,
      term: termLabel(
        taxonomy.terms.find((item) => item.id === termId)?.value ?? termId,
      ),
    }));
  });
  const options = taxonomy.categories
    .filter(
      (item) =>
        item.scopes.includes(scope) && (!category || item.id === category),
    )
    .flatMap((item) =>
      taxonomy.terms
        .filter((term) => term.categoryId === item.id)
        .map((term) => ({
          id: term.id,
          kind: "preset" as const,
          name: category
            ? termLabel(term.value)
            : `${item.name}: ${termLabel(term.value)}`,
          displayValue: termLabel(term.value),
        })),
    );
  return (
    <div className={styles.wrap}>
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <ActionButton
          onPress={() => {
            setCategory(undefined);
            setEditingTerm(undefined);
          }}
        >
          <Add />
          <Text>Add term</Text>
        </ActionButton>
        <Popover size="S">
          <Dialog
            className={popoverDialogStyles}
            aria-label="Choose a classification term"
          >
            <TokenComboBox
              label={
                category
                  ? `Change ${taxonomy.categories.find((item) => item.id === category)?.name ?? "term"}`
                  : "Search categories and terms"
              }
              options={options}
              selectedKey={null}
              onChange={(id) => {
                const term = taxonomy.terms.find((item) => item.id === id);
                const owner = taxonomy.categories.find(
                  (item) => item.id === term?.categoryId,
                );
                if (!term || !owner) return;
                const current = value[owner.id];
                onChange({
                  ...value,
                  [owner.id]:
                    owner.cardinality === "ordered"
                      ? [
                          ...new Set(
                            editingTerm
                              ? (Array.isArray(current)
                                  ? current
                                  : current
                                    ? [current]
                                    : []
                                ).map((id) =>
                                  id === editingTerm ? term.id : id,
                                )
                              : [
                                  ...(Array.isArray(current)
                                    ? current
                                    : current
                                      ? [current]
                                      : []),
                                  term.id,
                                ],
                          ),
                        ]
                      : term.id,
                });
                setOpen(false);
              }}
            />
          </Dialog>
        </Popover>
      </DialogTrigger>
      <TagGroup
        aria-label="Classification"
        items={selected}
        onAction={(id) => {
          const item = selected.find((item) => item.id === id);
          setCategory(item?.categoryId);
          setEditingTerm(item?.termId);
          setOpen(true);
        }}
        onRemove={(ids) => {
          const next = { ...value };
          for (const id of ids) {
            const item = selected.find((term) => term.id === id);
            if (!item) continue;
            const current = next[item.categoryId];
            if (Array.isArray(current)) {
              const remaining = current.filter((term) => term !== item.termId);
              if (remaining.length) next[item.categoryId] = remaining;
              else delete next[item.categoryId];
            } else delete next[item.categoryId];
          }
          onChange(next);
        }}
      >
        {(item) => (
          <Tag id={item.id} textValue={`${item.category}: ${item.term}`}>
            <Text>
              {item.category}: <strong>{item.term}</strong>
            </Text>
          </Tag>
        )}
      </TagGroup>
    </div>
  );
}
