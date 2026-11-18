// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Checkbox,
  CheckboxGroup,
  Content,
  Heading,
  InlineAlert,
  Menu,
  MenuItem,
  MenuTrigger,
  Tag,
  TagGroup,
  Text,
  TextArea,
  TextField,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { CategoryIcon } from "../../components/CategoryIcon";
import {
  TAXONOMY_TOKEN_TYPES,
  TAXONOMY_TOKEN_TYPE_LABELS,
  withTaxonomyTokenTypes,
  type TaxonomyCategory,
} from "../../features/taxonomy/model";
import { TOKEN_TIERS } from "../../features/tokens/tier";

import { registryField, registrySection } from "./registryStyles";

const registryTypes = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "start",
  gap: 4,
  minWidth: 0,
});
const registryTypesField = style({ width: "full" });

type RegistryFieldSize = "S" | "M";

export function RegistryError({ message }: { message?: string }) {
  return message ? (
    <InlineAlert variant="negative">
      <Heading>Could not apply change</Heading>
      <Content>{message}</Content>
    </InlineAlert>
  ) : null;
}

export function RegistryCategoryFields({
  category,
  editable,
  onChange,
  onApply,
  onCancel,
  size = "M",
}: {
  category: TaxonomyCategory;
  editable: boolean;
  onChange: (category: TaxonomyCategory) => void;
  onApply?: (category: TaxonomyCategory) => void;
  onCancel?: () => void;
  size?: RegistryFieldSize;
}) {
  return (
    <div className={registrySection}>
      <TextField
        size={size}
        label="Category name"
        value={category.name}
        isReadOnly={!editable}
        styles={registryField}
        isRequired
        onChange={(name) => onChange({ ...category, name })}
        onBlur={() => onApply?.(category)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onApply?.(category);
          if (event.key === "Escape" && onCancel) {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
        }}
      />
      <TextArea
        size={size}
        label="Category description"
        value={category.description}
        isReadOnly={!editable}
        styles={registryField}
        onChange={(description) => onChange({ ...category, description })}
        onBlur={() => onApply?.(category)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && onCancel) {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
        }}
      />
    </div>
  );
}

export function RegistryScopeFields({
  category,
  editable,
  onChange,
  size = "M",
  tagSize = size,
}: {
  category: TaxonomyCategory;
  editable: boolean;
  onChange: (category: TaxonomyCategory) => void;
  size?: RegistryFieldSize;
  /** Size of the token-type tags and their Add button. */
  tagSize?: RegistryFieldSize;
}) {
  const selected = TAXONOMY_TOKEN_TYPES.filter((id) =>
    category.scopes.includes(id),
  );
  const available = TAXONOMY_TOKEN_TYPES.filter((id) => !selected.includes(id));
  const setTypes = (types: readonly string[]) =>
    onChange({
      ...category,
      scopes: withTaxonomyTokenTypes(category.scopes, [...types]),
    });
  return (
    <div className={registrySection}>
      <div className={registryTypes}>
        <TagGroup
          label="Applicable token types"
          size={tagSize}
          styles={registryTypesField}
          items={selected.map((id) => ({ id }))}
          renderEmptyState={() => "No token types selected"}
          onRemove={
            editable
              ? (ids) => setTypes(selected.filter((id) => !ids.has(id)))
              : undefined
          }
        >
          {({ id }) => (
            <Tag id={id} textValue={TAXONOMY_TOKEN_TYPE_LABELS[id]}>
              <CategoryIcon category={id} />
              <Text>{TAXONOMY_TOKEN_TYPE_LABELS[id]}</Text>
            </Tag>
          )}
        </TagGroup>
        {editable && available.length > 0 && (
          <MenuTrigger>
            <ActionButton isQuiet size={tagSize}>
              <Add />
              <Text>Add token type</Text>
            </ActionButton>
            <Menu
              aria-label="Token types"
              onAction={(key) =>
                setTypes([...new Set([...selected, String(key)])])
              }
            >
              {available.map((id) => (
                <MenuItem
                  key={id}
                  id={id}
                  textValue={TAXONOMY_TOKEN_TYPE_LABELS[id]}
                >
                  <CategoryIcon category={id} />
                  <Text>{TAXONOMY_TOKEN_TYPE_LABELS[id]}</Text>
                </MenuItem>
              ))}
            </Menu>
          </MenuTrigger>
        )}
      </div>
      <CheckboxGroup
        size={size}
        label="Applicable token tiers"
        orientation="horizontal"
        isDisabled={!editable}
        value={category.allowedTokenTiers ?? [...TOKEN_TIERS]}
        onChange={(tiers) =>
          onChange({
            ...category,
            allowedTokenTiers: TOKEN_TIERS.filter((tier) =>
              tiers.includes(tier),
            ),
          })
        }
      >
        <Checkbox value="primitive">Primitive</Checkbox>
        <Checkbox value="semantic">Semantic</Checkbox>
        <Checkbox value="component">Component</Checkbox>
      </CheckboxGroup>
    </div>
  );
}
