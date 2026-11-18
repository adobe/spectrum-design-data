// Copyright 2026 Adobe. All rights reserved.
// "Shipped" means the item is in the default data Studio ships with, so
// downstream consumers may already depend on it.
// See docs/rfcs/deletion-and-deprecation.md.
import { shippedChangeSnapshot } from "./comparisonState";

const ids = (items: readonly { id: string }[] | undefined) =>
  new Set((items ?? []).map((item) => item.id));

const shipped = {
  terms: ids(shippedChangeSnapshot.taxonomy?.terms),
  categories: ids(shippedChangeSnapshot.taxonomy?.categories),
  colorScales: ids(shippedChangeSnapshot.colorSystem.scales),
};

export type ShippedCollection = keyof typeof shipped;

export function isShipped(collection: ShippedCollection, id: string) {
  return shipped[collection].has(id);
}
