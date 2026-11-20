// Copyright 2026 Adobe. All rights reserved.
import { createContext, useContext } from "react";
import type { NumericRuntime } from "./numericRuntime";

export const NumericContext = createContext<NumericRuntime | null>(null);
export function useNumericRuntime() {
  return useContext(NumericContext);
}
