// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Text,
} from "@react-spectrum/s2";
import { CategoryIcon } from "../../components/CategoryIcon";
import type { Structure } from "../../features/structures/model";
import Add from "@react-spectrum/s2/icons/Add";
import {
  ELEMENT_TYPES,
  type ElementKind,
} from "../../features/structures/elements";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
export interface AddStructureElementProps {
  index: number;
  taxonomy: TaxonomyDocument;
  onInsert: (kind: ElementKind, index: number) => void;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  structures?: readonly Structure[];
  onInsertStructure?: (id: string, index: number) => void;
}
export function AddStructureElement({
  index,
  taxonomy,
  onInsert,
  onOpenChange,
  isOpen,
  structures = [],
  onInsertStructure,
}: AddStructureElementProps) {
  const choices = (
    Object.entries(ELEMENT_TYPES) as [
      ElementKind,
      (typeof ELEMENT_TYPES)[ElementKind],
    ][]
  ).flatMap(([kind, type]) => {
    const term = taxonomy.terms.find((term) => term.id === type.termId);
    return term ? [{ kind, label: String(term.value) }] : [];
  });
  return (
    <MenuTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button
        variant="accent"
        size="S"
        aria-label={`Add element at position ${index + 1}`}
        isDisabled={!choices.length && !structures.length}
      >
        <Add />
      </Button>
      <Menu
        aria-label="Add element"
        onAction={(key) => {
          const source = structures.find(
            (source) => `structure:${source.conceptId}` === key,
          );
          if (source) {
            if (!onInsertStructure)
              throw new Error("Structure insertion is unavailable.");
            onInsertStructure(source.conceptId, index);
            return;
          }
          const choice = choices.find((choice) => choice.kind === key);
          if (!choice) throw new Error("This element type is unavailable.");
          onInsert(choice.kind, index);
        }}
      >
        <MenuSection aria-label="Elements">
          {choices.map(({ kind, label }) => (
            <MenuItem key={kind} id={kind} textValue={label}>
              <CategoryIcon category={`element.${kind}`} />
              <Text slot="label">{label}</Text>
            </MenuItem>
          ))}
        </MenuSection>
        {structures.length > 0 && (
          <MenuSection aria-label="Structures">
            {structures.map((source) => (
              <MenuItem
                key={source.conceptId}
                id={`structure:${source.conceptId}`}
                textValue={source.name}
              >
                <CategoryIcon category="structures" />
                <Text slot="label">{source.name}</Text>
              </MenuItem>
            ))}
          </MenuSection>
        )}
      </Menu>
    </MenuTrigger>
  );
}
