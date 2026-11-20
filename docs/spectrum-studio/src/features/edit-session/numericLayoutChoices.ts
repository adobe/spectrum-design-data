// Copyright 2026 Adobe. All rights reserved.
import {
  pendingLayoutScaleAtom,
  type NumericLayoutContinuation,
} from "../structures/layoutScaleState";
import type {
  LayoutScaleAnswer,
  LayoutScaleProposal,
} from "../structures/layoutScales";
import type { Store } from "../notifications/impact";

/** Reuse the existing choice dialog without committing a temporary numeric value. */
export async function numericLayoutChoices(
  store: Store,
  choices: LayoutScaleProposal[],
  signal: AbortSignal,
  isCurrent: () => boolean,
  cancelEdits: () => void,
): Promise<LayoutScaleAnswer[][]> {
  const answers: LayoutScaleAnswer[][] = [];
  for (const choice of choices) {
    signal.throwIfAborted();
    if (!isCurrent())
      throw new DOMException("The numeric edit changed.", "AbortError");
    if (choice.answers.length === choice.questions.length) {
      answers.push(choice.answers);
      continue;
    }
    if (store.get(pendingLayoutScaleAtom))
      throw new Error("Finish or cancel the pending scale choice first.");
    answers.push(
      await new Promise<LayoutScaleAnswer[]>((resolve, reject) => {
        let settled = false;
        const continuation: NumericLayoutContinuation = {
          isCurrent,
          answer(proposal) {
            if (settled) return;
            settled = true;
            signal.removeEventListener("abort", abort);
            resolve(proposal.answers);
          },
          cancel() {
            if (settled) return;
            settled = true;
            signal.removeEventListener("abort", abort);
            cancelEdits();
            reject(
              new DOMException("The scale choice was cancelled.", "AbortError"),
            );
          },
        };
        function abort() {
          if (settled) return;
          settled = true;
          signal.removeEventListener("abort", abort);
          if (store.get(pendingLayoutScaleAtom)?.numeric === continuation)
            store.set(pendingLayoutScaleAtom, null);
          reject(new DOMException("The numeric edit changed.", "AbortError"));
        }
        signal.addEventListener("abort", abort, { once: true });
        store.set(pendingLayoutScaleAtom, { ...choice, numeric: continuation });
        if (signal.aborted) abort();
      }),
    );
  }
  return answers;
}
