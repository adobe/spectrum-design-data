// Copyright 2026 Adobe. All rights reserved.
import { useDragAndDrop } from "@react-spectrum/s2/useDragAndDrop";

export function useComponentReordering<T extends { id: string; name: string }>(
  editable: boolean,
  scope: string,
  onReorder: (
    keys: ReadonlySet<string>,
    target: string,
    position: "before" | "after",
  ) => void,
  onError: (error: string) => void,
) {
  const type = `application/x-component-order-${scope}`;
  const { dragAndDropHooks } = useDragAndDrop<T>({
    acceptedDragTypes: [type],
    getItems: (_keys, items) =>
      items.map((item) => ({ [type]: item.id, "text/plain": item.name })),
    getAllowedDropOperations: () => ["move"],
    onReorder: (event) => {
      try {
        const position = event.target.dropPosition;
        if (position !== "before" && position !== "after")
          throw new Error("Choose a position between rows.");
        onReorder(
          new Set([...event.keys].map(String)),
          String(event.target.key),
          position,
        );
      } catch (failure) {
        onError(failure instanceof Error ? failure.message : String(failure));
      }
    },
  });
  return editable ? dragAndDropHooks : undefined;
}
