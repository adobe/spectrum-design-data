// Copyright 2026 Adobe. All rights reserved.
import { atom, getDefaultStore, type Getter } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { appColorSchemeAtom } from "../../state/view/appAppearance";
import {
  foundationModeAttachmentsAtom,
  savedFoundationModeAttachmentsAtom,
} from "../../state/view/foundationModeAttachments";
import {
  clearPersistenceIssuesAtom,
  PERSISTENCE_ISSUE_PREFIXES,
  registerPersistenceFlush,
  reportPersistenceIssueAtom,
} from "../../state/persist";
import { modeSelectionAtom } from "../modes/selection";
import { upgradeComponentOrderSnapshot } from "./componentOrderUpgrade";
import { upgradeOpacitySnapshot } from "./opacityUpgrade";
import { opacityAxes } from "../opacity/generation";
import { registerOpacityVocabulary } from "../taxonomy/opacityGovernance";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import { initializeTshirtArtifactCache } from "../design-data/tshirtCacheState";
import {
  assertStoredSnapshot,
  isSnapshot,
  authoringSnapshotAtom,
  authoringSourceSnapshotAtom,
  captureAuthoringRecord,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  restoreAuthoringSnapshotAtom,
  type EditSessionSnapshot,
} from "./state";
import {
  AUTHORING_RECORD_VERSION,
  blockAuthoringStorage,
  readAuthoringRecord,
  readViewPreferences,
  writeAuthoringRecord,
  writeViewPreferences,
  type AuthoringRecord,
} from "./storage";
import {
  LatestRequest,
  type WorkExecutor,
} from "../derived-work/LatestRequest";
import { workerTask } from "../derived-work/workerTask";
import {
  componentContrastSignature,
  componentContrastWitnessAtom,
  matchesComponentContrastWitness,
} from "../components/contrastWitness";
import type { PreparedAuthoringResult } from "./recordPreparation";
import {
  componentColorWitnessAtom,
  matchesComponentColorWitness,
} from "../components/colorWitness";

type Store = ReturnType<typeof getDefaultStore>;
const active = new WeakMap<Store, () => void>();
function capturePersistenceInput(get: Getter) {
  return {
    working: get(authoringSourceSnapshotAtom),
    saved: get(editSessionSnapshotAtom),
    isEditing: get(editModeAtom),
    attachments: get(foundationModeAttachmentsAtom),
    savedAttachments: get(savedFoundationModeAttachmentsAtom),
  };
}
const persistenceInputAtom = atom(capturePersistenceInput);
type RecordValue = AuthoringRecord<EditSessionSnapshot>;
interface PersistenceJob {
  source: ReturnType<typeof capturePersistenceInput>;
  record: RecordValue;
  persist: boolean;
}
interface PersistenceOptions {
  validateScheduled?: WorkExecutor<RecordValue, RecordValue> | null;
}
const validateInWorker = workerTask<RecordValue, PreparedAuthoringResult>(
  () =>
    new Worker(new URL("./recordPreparation.worker.ts", import.meta.url), {
      type: "module",
    }),
);

export function initializeAuthoringPersistence(
  store: Store = getDefaultStore(),
  options: PersistenceOptions = {},
) {
  active.get(store)?.();
  const report = (
    failure: unknown,
    scope: "authoring" | "preferences" = "authoring",
  ) =>
    store.set(
      reportPersistenceIssueAtom,
      `${PERSISTENCE_ISSUE_PREFIXES[scope]} ${failure instanceof Error ? failure.message : String(failure)}`,
    );
  try {
    const identities = new Map<string, string>();
    let upgraded = false;
    const record = readAuthoringRecord(
      assertStoredSnapshot,
      (value, version) => {
        upgraded = true;
        const snapshot =
          version === 14
            ? value
            : upgradeComponentOrderSnapshot(value, version);
        if (!isSnapshot(snapshot) || !snapshot)
          throw new Error("Stored authoring data is invalid or incomplete.");
        const next = upgradeOpacitySnapshot(snapshot, identities);
        if (next.taxonomy && next.opacity) {
          next.taxonomy = registerOpacityVocabulary(
            next.taxonomy,
            next.opacity,
            (value) => {
              const key = `opacity:registry:${value}`;
              const id = identities.get(key) ?? crypto.randomUUID();
              identities.set(key, id);
              return id;
            },
          );
        }
        return next;
      },
    );
    if (record) {
      if (upgraded) {
        for (const [attachments, snapshot] of [
          [record.attachments, record.working],
          [record.savedAttachments, record.saved],
        ] as const) {
          for (const axis of opacityAxes({
            opacity: snapshot.opacity,
            colorSystem: snapshot.colorSystem,
            modeSets: snapshot.modeSets,
            browserTokenEdits: snapshot.browserTokenEdits,
          })) {
            attachments[axis.id] = [
              ...new Set([...(attachments[axis.id] ?? []), "opacity" as const]),
            ];
          }
        }
      }
      buildTshirtArtifacts(record.saved, "saved");
      for (const [attachments, snapshot] of [
        [record.attachments, record.working],
        [record.savedAttachments, record.saved],
      ] as const) {
        if (
          Object.keys(attachments).some(
            (id) => !snapshot.modeSets.some((set) => set.id === id),
          )
        )
          throw new Error(
            "Stored foundation cards reference an unavailable mode set.",
          );
      }
      writeAuthoringRecord(record);
      store.set(restoreAuthoringSnapshotAtom, record.working);
      store.set(editSessionSnapshotAtom, record.saved);
      store.set(foundationModeAttachmentsAtom, record.attachments);
      store.set(savedFoundationModeAttachmentsAtom, record.savedAttachments);
      store.set(editModeAtom, record.isEditing);
    } else store.set(editSessionSnapshotAtom, createDefaultSnapshot());
  } catch (failure) {
    blockAuthoringStorage();
    report(failure);
  }
  try {
    const preferences = readViewPreferences();
    if (preferences) {
      store.set(appColorSchemeAtom, preferences.appearance);
      const sets = store.get(authoringSnapshotAtom).modeSets;
      store.set(
        modeSelectionAtom,
        Object.fromEntries(
          Object.entries(preferences.modeSelection).filter(([key, id]) =>
            sets.some(
              (set) =>
                set.key === key && set.modes.some((mode) => mode.id === id),
            ),
          ),
        ),
      );
    }
  } catch (failure) {
    report(failure, "preferences");
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  let proving:
    | { source: ReturnType<typeof capturePersistenceInput>; signature: string }
    | undefined;
  const validateScheduled:
    | WorkExecutor<RecordValue, PreparedAuthoringResult>
    | undefined =
    options.validateScheduled === null
      ? undefined
      : options.validateScheduled
        ? async (record, signal) => ({
            record: await options.validateScheduled!(record, signal, () => {}),
            componentContrastWitness: null,
            componentColorWitness: null,
          })
        : typeof Worker === "undefined"
          ? undefined
          : validateInWorker;
  const scheduled =
    validateScheduled &&
    new LatestRequest<PersistenceJob, PreparedAuthoringResult>(
      (job, signal) => validateScheduled(job.record, signal, () => {}),
      (state) => {
        if (state.status === "pending") return;
        const current = store.get(persistenceInputAtom);
        const wasProving = proving?.source === state.input.source;
        if (wasProving) proving = undefined;
        if (
          state.status === "ready" &&
          matchesComponentContrastWitness(
            state.value.componentContrastWitness,
            current.working,
          )
        ) {
          store.set(
            componentContrastWitnessAtom,
            state.value.componentContrastWitness,
          );
        }
        if (
          state.status === "ready" &&
          matchesComponentColorWitness(
            state.value.componentColorWitness,
            current.working,
          )
        ) {
          store.set(
            componentColorWitnessAtom,
            state.value.componentColorWitness,
          );
        }
        if (current !== state.input.source) {
          if (wasProving) schedule();
          return;
        }
        if (state.status === "unavailable") report(state.error);
        else if (state.status === "ready") {
          store.set(
            componentContrastWitnessAtom,
            state.value.componentContrastWitness,
          );
          store.set(
            componentColorWitnessAtom,
            state.value.componentColorWitness,
          );
          try {
            if (state.input.persist) {
              writeAuthoringRecord(state.value.record);
              pending = false;
            }
          } catch (failure) {
            report(failure);
          }
        }
      },
      { nearby: 0, visible: 0, background: 200 },
    );
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    proving = undefined;
    scheduled?.cancel();
    const record = captureAuthoringRecord(store.get);
    assertStoredSnapshot(record.working);
    assertStoredSnapshot(record.saved);
    writeAuthoringRecord(record);
    pending = false;
  };
  const request = (
    persist: boolean,
    priority: "visible" | "background" = "background",
  ) => {
    if (!scheduled) return;
    const source = store.get(persistenceInputAtom);
    if (
      proving &&
      source.saved === proving.source.saved &&
      source.attachments === proving.source.attachments &&
      source.savedAttachments === proving.source.savedAttachments &&
      componentContrastSignature(source.working) === proving.signature
    )
      return;
    proving =
      options.validateScheduled === undefined &&
      !matchesComponentContrastWitness(
        store.get(componentContrastWitnessAtom),
        source.working,
      )
        ? { source, signature: componentContrastSignature(source.working) }
        : undefined;
    scheduled.request(
      {
        source,
        persist,
        record: {
          version: AUTHORING_RECORD_VERSION,
          working: source.working,
          saved: source.saved ?? createDefaultSnapshot(),
          isEditing: source.isEditing,
          attachments: source.attachments,
          savedAttachments: source.savedAttachments,
        },
      },
      priority,
    );
  };
  const schedule = () => {
    pending = true;
    clearTimeout(timer);
    if (scheduled) request(true);
    else
      timer = setTimeout(() => {
        try {
          flush();
        } catch (failure) {
          report(failure);
        }
      }, 200);
  };
  const preferences = () => {
    try {
      writeViewPreferences({
        version: 1,
        appearance: store.get(appColorSchemeAtom),
        modeSelection: store.get(modeSelectionAtom),
      });
      store.set(clearPersistenceIssuesAtom, "preferences");
    } catch (failure) {
      report(failure, "preferences");
    }
  };
  const unsubscribe = [
    initializeTshirtArtifactCache(store),
    store.sub(persistenceInputAtom, schedule),
    store.sub(appColorSchemeAtom, preferences),
    store.sub(modeSelectionAtom, preferences),
    registerPersistenceFlush(flush),
  ];
  if (scheduled && options.validateScheduled === undefined) {
    request(false, "visible");
  }
  const onPageHide = () => {
    if (pending) {
      try {
        flush();
      } catch (failure) {
        report(failure);
      }
    }
  };
  window.addEventListener("pagehide", onPageHide);
  const dispose = () => {
    clearTimeout(timer);
    proving = undefined;
    scheduled?.cancel();
    store.set(componentContrastWitnessAtom, null);
    store.set(componentColorWitnessAtom, null);
    unsubscribe.forEach((stop) => stop());
    window.removeEventListener("pagehide", onPageHide);
    active.delete(store);
  };
  active.set(store, dispose);
  return dispose;
}
