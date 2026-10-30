// Copyright 2026 Adobe. All rights reserved.
import { useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { taxonomyDocumentAtom } from "./state";
import {
  editFoundationNameAtom,
  taxonomyFoundationSourcesAtom,
} from "./sourceState";
import { taxonomyValueKey } from "./model";
import { editModeAtom } from "../../state/view/editMode";
import { isUnchangedTermInput, termLabel } from "./termPresentation";

export function useRegisteredSourceName(
  sourceId: string,
  offersSuggestions = true,
) {
  const taxonomy = useAtomValue(taxonomyDocumentAtom);
  const sources = useAtomValue(taxonomyFoundationSourcesAtom);
  const source = sources.find((source) => source.id === sourceId);
  const editable = useAtomValue(editModeAtom);
  const edit = useSetAtom(editFoundationNameAtom);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [scope, setScope] = useState({
    sourceId,
    name: source?.name,
    editable,
  });
  if (
    scope.sourceId !== sourceId ||
    scope.name !== source?.name ||
    scope.editable !== editable
  ) {
    setScope({ sourceId, name: source?.name, editable });
    setDraft(null);
    setError("");
  }
  const categoryId = source?.nameRef?.categoryId;
  const terms = useMemo(
    () => taxonomy.terms.filter((term) => term.categoryId === categoryId),
    [taxonomy.terms, categoryId],
  );
  const count = sources.filter(
    (row) => row.nameRef?.termId === source?.nameRef?.termId,
  ).length;
  function commit() {
    if (!editable || draft === null || !source) return;
    if (isUnchangedTermInput(draft, source.name)) {
      setDraft(null);
      setError("");
      return;
    }
    try {
      edit({ id: sourceId, value: draft });
      setDraft(null);
      setError("");
    } catch (failure) {
      const existing = taxonomy.terms.find(
        (term) => taxonomyValueKey(term.value) === taxonomyValueKey(draft),
      );
      setError(
        `${failure instanceof Error ? failure.message : String(failure)}${offersSuggestions && existing?.categoryId === categoryId ? " Select the existing term from suggestions to use it deliberately." : ""}`,
      );
    }
  }
  function choose(termId: string) {
    try {
      edit({ id: sourceId, termId });
      setDraft(null);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }
  return {
    source,
    terms,
    input: draft ?? (source ? termLabel(source.name) : ""),
    error,
    commit,
    choose,
    setInput: (value: string) => {
      setDraft(value);
      setError("");
    },
    help:
      count > 1
        ? `Shared by ${count} foundation sources. Renaming updates all of them.`
        : offersSuggestions
          ? "Type a new name, or select an existing registered term."
          : "Names are registered in the Registry.",
  };
}
