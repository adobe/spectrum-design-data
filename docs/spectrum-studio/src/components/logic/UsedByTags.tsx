// Copyright 2026 Adobe. All rights reserved.
import { Tag, TagGroup } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

export interface UsedByTagsProps {
  consumers: readonly { id: string; label: string }[];
}

const emptyStyles = style({ font: "body-sm", color: "neutral-subdued" });

/** Read-only tags for every place a library item is referenced. */
export function UsedByTags({ consumers }: UsedByTagsProps) {
  if (consumers.length === 0)
    return (
      <p className={emptyStyles} style={{ margin: 0 }}>
        Not used
      </p>
    );
  return (
    <TagGroup aria-label="Used by" size="S" items={consumers}>
      {(consumer) => <Tag id={consumer.id}>{consumer.label}</Tag>}
    </TagGroup>
  );
}
