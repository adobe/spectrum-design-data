// Copyright 2026 Adobe. All rights reserved.
import { Provider, type createStore } from "jotai";
import type { ReactNode } from "react";
import { DeletionToastProvider } from "../../components/DeletionToastProvider";

export function OpacityStoryProvider({
  store,
  children,
  deletionToast = false,
}: {
  store: ReturnType<typeof createStore>;
  children: ReactNode;
  deletionToast?: boolean;
}) {
  const content = <Provider store={store}>{children}</Provider>;
  return deletionToast ? (
    <DeletionToastProvider>{content}</DeletionToastProvider>
  ) : (
    content
  );
}
