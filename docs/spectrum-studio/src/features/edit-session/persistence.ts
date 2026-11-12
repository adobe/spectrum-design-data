// Copyright 2026 Adobe. All rights reserved.
import { atom, getDefaultStore, type Getter } from "jotai";
import { stylesDocumentAtom } from "../styles/state";
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
import { upgradeScaleSelection } from "../modes/scaleKeys";
import { upgradeComponentOrderSnapshot } from "./componentOrderUpgrade";
import { upgradeCanonicalTokenIdentities } from "./canonicalIdentityUpgrade";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import { upgradeColorFamilySnapshot } from "./colorFamilyUpgrade";
import { upgradeTermCasingSnapshot } from "./termCasingUpgrade";
import { upgradeStructureVariantsSnapshot } from "./structureVariantsUpgrade";
import { upgradeConditionalRulesSnapshot } from "./conditionalRulesUpgrade";
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
  writePreparedAuthoringRecord,
  writeViewPreferences,
  type AuthoringRecord,
} from "./storage";
import {
  LatestRequest,
  type WorkExecutor,
} from "../derived-work/LatestRequest";
import { workerTask } from "../derived-work/workerTask";
import {
  componentContrastInput,
  componentContrastWitnessAtom,
  matchesComponentContrastWitness,
  type ComponentContrastWitness,
} from "../components/contrastWitness";
import type { PreparedAuthoringResult } from "./recordPreparation";
import {
  componentColorWitnessAtom,
  componentColorInput,
  matchesComponentColorWitness,
  type ComponentColorWitness,
} from "../components/colorWitness";
import { sameValue } from "../changelog/contract";

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
    scope: "authoring" | "preferences" | "artifacts" = "authoring",
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
        if (
          version === 19 ||
          version === 20 ||
          version === 21 ||
          version === 22 ||
          version === 23 ||
          version === 24 ||
          version === 25 ||
          version === 26 ||
          version === 27 ||
          version === 28 ||
          version === 29 ||
          version === 30 ||
          version === 31 ||
          version === 32
        )
          return value;
        if (version === 18) {
          if (!isSnapshot(value) || !value)
            throw new Error("Stored authoring data is invalid or incomplete.");
          return upgradeConditionalRulesSnapshot(value);
        }
        if (version === 17) {
          if (!isSnapshot(value) || !value)
            throw new Error("Stored authoring data is invalid or incomplete.");
          return upgradeConditionalRulesSnapshot(
            upgradeStructureVariantsSnapshot(value),
          );
        }
        if (version === 15 || version === 16) {
          if (!isSnapshot(value) || !value)
            throw new Error("Stored authoring data is invalid or incomplete.");
          return upgradeConditionalRulesSnapshot(
            upgradeStructureVariantsSnapshot(
              upgradeTermCasingSnapshot(upgradeColorFamilySnapshot(value)),
            ),
          );
        }
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
        return upgradeConditionalRulesSnapshot(
          upgradeStructureVariantsSnapshot(
            upgradeTermCasingSnapshot(upgradeColorFamilySnapshot(next)),
          ),
        );
      },
      (message) => report(message),
      upgradeCanonicalTokenIdentities,
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
      store.set(
        modeSelectionAtom,
        upgradeScaleSelection(
          store.get(modeSelectionAtom),
          record.working.modeSets,
        ),
      );
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
          Object.entries(
            upgradeScaleSelection(preferences.modeSelection, sets),
          ).filter(([key, id]) =>
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
  let proving: ReturnType<typeof capturePersistenceInput> | undefined;
  let completedContrast:
    | { source: EditSessionSnapshot; witness: ComponentContrastWitness }
    | undefined;
  let completedColor:
    | { source: EditSessionSnapshot; witness: ComponentColorWitness }
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
  type Witnesses = Pick<
    PreparedAuthoringResult,
    "componentContrastWitness" | "componentColorWitness"
  >;
  const proofs =
    options.validateScheduled === undefined &&
    typeof Worker !== "undefined" &&
    new LatestRequest<ReturnType<typeof capturePersistenceInput>, Witnesses>(
      (source, signal, progress) =>
        workerTask<EditSessionSnapshot, Witnesses>(
          () =>
            new Worker(
              new URL("./referenceWitness.worker.ts", import.meta.url),
              {
                type: "module",
              },
            ),
        )(source.working, signal, progress),
      (state) => {
        if (state.status === "pending") return;
        proving = undefined;
        const current = store.get(persistenceInputAtom);
        if (state.status === "unavailable") {
          if (current === state.input) report(state.error, "artifacts");
        } else {
          if (
            state.value.componentContrastWitness &&
            matchesComponentContrastWitness(
              state.value.componentContrastWitness,
              current.working,
            )
          ) {
            completedContrast = {
              source: current.working,
              witness: state.value.componentContrastWitness,
            };
            store.set(
              componentContrastWitnessAtom,
              state.value.componentContrastWitness,
            );
          }
          if (
            state.value.componentColorWitness &&
            matchesComponentColorWitness(
              state.value.componentColorWitness,
              current.working,
            )
          ) {
            completedColor = {
              source: current.working,
              witness: state.value.componentColorWitness,
            };
            store.set(
              componentColorWitnessAtom,
              state.value.componentColorWitness,
            );
          }
        }
        if (current !== state.input) requestProof();
      },
      { nearby: 0, visible: 0, background: 200 },
    );
  const requestProof = (priority: "visible" | "background" = "background") => {
    if (!proofs) return;
    const source = store.get(persistenceInputAtom);
    if (
      proving &&
      source.saved === proving.saved &&
      source.attachments === proving.attachments &&
      source.savedAttachments === proving.savedAttachments &&
      sameValue(
        componentContrastInput(source.working),
        componentContrastInput(proving.working),
      )
    )
      return;
    if (
      completedContrast &&
      completedColor &&
      completedContrast.witness === store.get(componentContrastWitnessAtom) &&
      sameValue(
        componentContrastInput(completedContrast.source),
        componentContrastInput(source.working),
      ) &&
      completedColor.witness === store.get(componentColorWitnessAtom) &&
      sameValue(
        componentColorInput(completedColor.source),
        componentColorInput(source.working),
      )
    )
      return;
    proving = source;
    proofs.request(source, priority);
  };
  const scheduled =
    validateScheduled &&
    new LatestRequest<PersistenceJob, PreparedAuthoringResult>(
      (job, signal) => validateScheduled(job.record, signal, () => {}),
      (state) => {
        if (state.status === "pending") return;
        const current = store.get(persistenceInputAtom);
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
        if (current !== state.input.source) return;
        if (state.status === "unavailable") report(state.error);
        else if (state.status === "ready") {
          try {
            if (state.input.persist) {
              if (state.value.serialized !== undefined)
                writePreparedAuthoringRecord(state.value.serialized);
              else writeAuthoringRecord(state.value.record);
              if (
                state.value.stylePublicationsChanged &&
                state.value.record.working.styles
              ) {
                store.set(stylesDocumentAtom, {
                  ...store.get(stylesDocumentAtom),
                  publications: state.value.record.working.styles.publications,
                });
              }
              if (
                state.value.browserTokenEditsChanged ??
                JSON.stringify(current.working.browserTokenEdits) !==
                  JSON.stringify(state.value.record.working.browserTokenEdits)
              )
                store.set(
                  restoreAuthoringSnapshotAtom,
                  state.value.record.working,
                );
              if (
                state.value.savedChanged ??
                JSON.stringify(current.saved) !==
                  JSON.stringify(state.value.record.saved)
              )
                store.set(editSessionSnapshotAtom, state.value.record.saved);
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
    completedContrast = undefined;
    completedColor = undefined;
    if (proofs) proofs.cancel();
    scheduled?.cancel();
    const record = captureAuthoringRecord(store.get);
    assertStoredSnapshot(record.working);
    assertStoredSnapshot(record.saved);
    writeAuthoringRecord(record);
    if (
      JSON.stringify(store.get(browserTokenEditsAtom)) !==
      JSON.stringify(record.working.browserTokenEdits)
    )
      store.set(restoreAuthoringSnapshotAtom, record.working);
    if (
      JSON.stringify(store.get(editSessionSnapshotAtom)) !==
      JSON.stringify(record.saved)
    )
      store.set(editSessionSnapshotAtom, record.saved);
    pending = false;
  };
  const request = (
    persist: boolean,
    priority: "visible" | "background" = "background",
  ) => {
    if (!scheduled) return;
    const source = store.get(persistenceInputAtom);
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
    if (scheduled) {
      request(true);
      requestProof();
    } else
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
    requestProof("visible");
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
    completedContrast = undefined;
    completedColor = undefined;
    if (proofs) proofs.cancel();
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
