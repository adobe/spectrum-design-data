// Copyright 2026 Adobe. All rights reserved.
import { useState, type ComponentType, type ReactNode } from "react";
import {
  ActionButton,
  Autocomplete,
  Content,
  Heading,
  IllustratedMessage,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  SearchField,
  SubmenuTrigger,
  Tag,
  TagGroup,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import TagIllustration from "@react-spectrum/s2/illustrations/linear/Tag";
import { Dialog } from "react-aria-components";
import type {
  Classification,
  TaxonomyCategory,
  TaxonomyDocument,
  TaxonomyScope,
  TaxonomyTerm,
} from "../../features/taxonomy/model";
import {
  applicableCategories,
  assignTerm,
  categoryTerms,
  rankTermMatches,
} from "../../features/taxonomy/termMenu";
import { inspectorStyles as styles } from "./tokenInspectorStyles";
import { termLabel } from "../../features/taxonomy/termPresentation";
import type { TokenTier } from "../../features/tokens/tier";

// The illustration accepts S/M/L at runtime, but its published type omits `size`.
const SmallTagIllustration = TagIllustration as ComponentType<{
  size?: "S" | "M" | "L";
}>;

const menuStyles = {
  panel: style({
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingTop: 12,
    minWidth: 0,
  }),
  field: style({ marginX: 12 }),
  heading: style({ font: "title-sm", marginX: 12, marginY: 0 }),
  empty: style({
    font: "body-sm",
    color: "neutral-subdued",
    marginX: 12,
    marginTop: 0,
    marginBottom: 12,
  }),
  emptyDialog: style({ padding: 8, outlineStyle: "none" }),
};

function TermItem({
  term,
  description,
}: {
  term: TaxonomyTerm;
  description?: string;
}) {
  const label = termLabel(term.value);
  return (
    <MenuItem id={term.id} textValue={label}>
      <Text slot="label">{label}</Text>
      {description && <Text slot="description">{description}</Text>}
    </MenuItem>
  );
}

function CategoryEmptyState({ category }: { category: TaxonomyCategory }) {
  return (
    <Popover>
      <Dialog
        aria-label={`${category.name} terms`}
        className={menuStyles.emptyDialog}
      >
        <IllustratedMessage size="S">
          <SmallTagIllustration size="S" />
          <Heading>No terms yet</Heading>
          <Content>Visit Registry to add new terms.</Content>
        </IllustratedMessage>
      </Dialog>
    </Popover>
  );
}

export function ClassificationTerms({
  value,
  taxonomy,
  scope,
  tier,
  onChange,
  formulaValue,
  description,
  errorMessage,
}: {
  value: Classification;
  taxonomy: TaxonomyDocument;
  scope: TaxonomyScope;
  tier?: TokenTier;
  onChange: (value: Classification) => void;
  /** Formula-generated classification; terms that differ show an alert icon. */
  formulaValue?: Classification;
  description?: ReactNode;
  /** Shown as error help text in place of the description. */
  errorMessage?: ReactNode;
}) {
  const [editing, setEditing] = useState<TaxonomyCategory>();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const termIds = (assigned: Classification[string] | undefined) =>
    Array.isArray(assigned) ? assigned : assigned ? [assigned] : [];
  const selected = taxonomy.order.flatMap((id) => {
    const assigned = value[id];
    return termIds(assigned).map((termId, index) => ({
      id: `${id}:${index}`,
      categoryId: id,
      termId,
      overridden: !!formulaValue && !termIds(formulaValue[id]).includes(termId),
      category: taxonomy.categories.find((item) => item.id === id)?.name ?? id,
      term: termLabel(
        taxonomy.terms.find((item) => item.id === termId)?.value ?? termId,
      ),
    }));
  });
  const categories = editing
    ? [editing]
    : applicableCategories(taxonomy, scope, tier, value);
  const matches = rankTermMatches(query, categories, taxonomy.terms);
  const choose = (termId: string | number) => {
    const term = taxonomy.terms.find((item) => item.id === termId);
    const owner = categories.find((item) => item.id === term?.categoryId);
    if (!term || !owner) return;
    onChange(assignTerm(value, owner, term.id));
    setOpen(false);
  };
  const termMenu = (label: string, terms: TaxonomyTerm[]) => (
    <Menu aria-label={label} onAction={choose}>
      {terms.map((term) => (
        <TermItem key={term.id} term={term} description={term.description} />
      ))}
    </Menu>
  );
  let menu;
  if (query.trim()) {
    menu = matches.length ? (
      <Menu aria-label="Matching terms" onAction={choose}>
        {matches.map(({ term, category }) => (
          <TermItem
            key={term.id}
            term={term}
            description={
              editing
                ? term.description
                : term.description
                  ? `${category.name} — ${term.description}`
                  : category.name
            }
          />
        ))}
      </Menu>
    ) : (
      <p className={menuStyles.empty}>No matching terms</p>
    );
  } else if (editing) {
    const terms = categoryTerms(taxonomy, editing.id);
    menu = terms.length ? (
      termMenu(`${editing.name} terms`, terms)
    ) : (
      <p className={menuStyles.empty}>No terms yet</p>
    );
  } else {
    menu = categories.length ? (
      <Menu aria-label="Token categories">
        {categories.map((category) => {
          const terms = categoryTerms(taxonomy, category.id);
          return (
            <SubmenuTrigger key={category.id}>
              <MenuItem id={category.id} textValue={category.name}>
                <Text slot="label">{category.name}</Text>
                {category.description && (
                  <Text slot="description">{category.description}</Text>
                )}
              </MenuItem>
              {terms.length ? (
                termMenu(`${category.name} terms`, terms)
              ) : (
                <CategoryEmptyState category={category} />
              )}
            </SubmenuTrigger>
          );
        })}
      </Menu>
    ) : (
      <p className={menuStyles.empty}>Every category has a term</p>
    );
  }
  return (
    <div className={styles.wrap}>
      <MenuTrigger
        isOpen={open}
        onOpenChange={(next) => {
          if (next) {
            setEditing(undefined);
            setQuery("");
          }
          setOpen(next);
        }}
      >
        <ActionButton>
          <Add />
          <Text>Add term</Text>
        </ActionButton>
        <Popover size="S" padding="none">
          <div className={menuStyles.panel}>
            {editing && (
              <h3 className={menuStyles.heading}>Change {editing.name}</h3>
            )}
            <Autocomplete inputValue={query} onInputChange={setQuery}>
              <SearchField
                aria-label={editing ? `Search ${editing.name}` : "Search terms"}
                placeholder="Search"
                autoFocus
                styles={menuStyles.field}
              />
              {menu}
            </Autocomplete>
          </div>
        </Popover>
      </MenuTrigger>
      <TagGroup
        aria-label="Classification"
        items={selected}
        description={description}
        isInvalid={!!errorMessage}
        errorMessage={errorMessage}
        onAction={(id) => {
          const item = selected.find((item) => item.id === id);
          const category = taxonomy.categories.find(
            (category) => category.id === item?.categoryId,
          );
          if (!category) return;
          setEditing(category);
          setQuery("");
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
          <Tag
            id={item.id}
            textValue={`${item.category}: ${item.term}${item.overridden ? " (overrides formula)" : ""}`}
          >
            {item.overridden && (
              <AlertTriangle aria-label="Overrides formula" />
            )}
            <Text>
              {item.category}: <strong>{item.term}</strong>
            </Text>
          </Tag>
        )}
      </TagGroup>
    </div>
  );
}
