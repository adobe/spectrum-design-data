// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  ALL_REGISTRY_FILTERS,
  type RegistryFilters,
} from "../../features/taxonomy/registryFilters";

/** In memory only, so the Registry board shows every category after a reload. */
export const registryFiltersAtom = atom<RegistryFilters>(ALL_REGISTRY_FILTERS);
