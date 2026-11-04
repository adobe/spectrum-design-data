// Copyright 2026 Adobe. All rights reserved.
import { useMemo, useState } from "react";
import { atom, useAtomValue, useSetAtom, useStore } from "jotai";
import {
  ActionButton,
  Content,
  Disclosure,
  DisclosurePanel,
  DisclosureTitle,
  Heading,
  InlineAlert,
} from "@react-spectrum/s2";
import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2/TableView";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  authoringSourceSnapshotAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
} from "../../features/edit-session/state";
import type { AnalysisDataset } from "../../features/design-data/analysisWork";
import { buildClassificationMigrationReview } from "../../features/design-data/classificationReview";
import {
  buildClassificationReviewExport,
  type ClassificationExportKind,
} from "../../features/taxonomy/reviewedExport";
import { buildGeneratedClassificationCompatibility } from "../../features/taxonomy/generatedReviewExport";
import { classificationStandard } from "../../features/taxonomy/standardContract";
import {
  CLASSIFICATION_REVIEW_CONTEXT,
  classificationReviewMessages,
} from "../../features/taxonomy/reviewPresentation";
import { editReferencedTaxonomyAtom } from "../../features/taxonomy/editing";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { registerTerm } from "../../features/taxonomy/model";
import { editModeAtom } from "../../state/view/editMode";

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const actionsStyles = style({ display: "flex", flexWrap: "wrap", gap: 8 });
const tableStyles = style({ width: "full", height: 360 });
const defaultSnapshotAtom = atom(() => createDefaultSnapshot());

function downloadJson(packet: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ClassificationReview({
  dataset,
}: {
  dataset: AnalysisDataset;
}) {
  const snapshotAtom = useMemo(
    () =>
      atom((get) =>
        dataset === "working"
          ? get(authoringSourceSnapshotAtom)
          : dataset === "saved"
            ? (get(editSessionSnapshotAtom) ?? get(defaultSnapshotAtom))
            : get(defaultSnapshotAtom),
      ),
    [dataset],
  );
  const snapshot = useAtomValue(snapshotAtom);
  const result = useMemo(() => {
    try {
      return {
        status: "ready" as const,
        review: buildClassificationMigrationReview(snapshot),
      };
    } catch (failure) {
      return {
        status: "error" as const,
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [snapshot]);
  const [failure, setFailure] = useState<{
    snapshot: typeof snapshot;
    message: string;
  }>();
  const editable = useAtomValue(editModeAtom);
  const edit = useSetAtom(editReferencedTaxonomyAtom);
  const store = useStore();
  if (result.status === "error")
    return (
      <p role="alert">Classification review unavailable: {result.error}</p>
    );
  const { document, aliases, bundle, rows, assessment, proposals } =
    result.review;
  async function exportReview(
    kind: ClassificationExportKind,
    generated = false,
  ) {
    try {
      const packet = await buildClassificationReviewExport(
        document,
        rows,
        aliases,
        kind,
      );
      downloadJson(
        generated
          ? await buildGeneratedClassificationCompatibility(bundle, packet)
          : packet,
        generated
          ? "leonardo-generated-tshirt-compatibility.json"
          : `leonardo-taxonomy-${kind}.json`,
      );
      setFailure(undefined);
    } catch (error) {
      setFailure({
        snapshot,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return (
    <section
      aria-label="Classification migration review"
      className={sectionStyles}
    >
      <Heading level={2}>Classification review</Heading>
      <p>{CLASSIFICATION_REVIEW_CONTEXT}</p>
      <p>
        {assessment.counts.nonStandard.toLocaleString()} classification entries
        need review. The count includes shared definitions and their uses, not a
        count of unique tokens or color values. Your existing names, edits, and
        token IDs are preserved.
      </p>
      {dataset === "working" && (
        <div className={actionsStyles}>
          <ActionButton onPress={() => void exportReview("standard-compliant")}>
            Export standard-compliant taxonomy
          </ActionButton>
          <ActionButton onPress={() => void exportReview("compatibility")}>
            Export taxonomy compatibility packet
          </ActionButton>
          <ActionButton
            isDisabled={!bundle.semantics.length}
            onPress={() => void exportReview("compatibility", true)}
          >
            Export generated compatibility bundle
          </ActionButton>
        </div>
      )}
      <p>
        {dataset === "working"
          ? "Review exports contain working authoring data across declared modes. Standard-compliant taxonomy export requires all classifications to pass. Compatibility exports preserve the data and detailed review."
          : "Reviewing the selected comparison source. Choose Working authoring to download review exports."}
      </p>
      {failure?.snapshot === snapshot && (
        <InlineAlert variant="negative">
          <Heading>Could not apply review action</Heading>
          <Content>{failure.message}</Content>
        </InlineAlert>
      )}
      <TableView
        aria-label="Classification entries needing review"
        isQuiet
        density="compact"
        overflowMode="wrap"
        styles={tableStyles}
      >
        <TableHeader>
          <Column id="record" isRowHeader minWidth={180}>
            Record
          </Column>
          <Column id="location" minWidth={180}>
            Location in data
          </Column>
          <Column id="fix" minWidth={260}>
            What to review and next steps
          </Column>
        </TableHeader>
        <TableBody
          items={assessment.occurrences.filter((entry) => entry.fixRequired)}
          renderEmptyState={() => <p>No classification entries need review.</p>}
        >
          {(entry) => (
            <Row id={entry.id}>
              <Cell>{entry.recordId}</Cell>
              <Cell>{entry.pointer}</Cell>
              <Cell>
                {classificationReviewMessages(document, [entry]).map(
                  (message) => (
                    <p key={message}>{message}</p>
                  ),
                )}
              </Cell>
            </Row>
          )}
        </TableBody>
      </TableView>
      <Disclosure isQuiet>
        <DisclosureTitle>Source terms</DisclosureTitle>
        <DisclosurePanel>
          <TableView
            aria-label="Proposed source terms"
            isQuiet
            density="compact"
            styles={tableStyles}
          >
            <TableHeader>
              <Column id="value" isRowHeader>
                Term
              </Column>
              <Column id="category">Category</Column>
              <Column id="actions">Review</Column>
            </TableHeader>
            <TableBody
              items={[...proposals].map(([id, proposal]) => ({
                id,
                ...proposal,
              }))}
              renderEmptyState={() => <p>No new source terms to review.</p>}
            >
              {(proposal) => (
                <Row id={proposal.id}>
                  <Cell>{String(proposal.value)}</Cell>
                  <Cell>
                    {
                      document.categories.find(
                        (item) => item.id === proposal.categoryId,
                      )?.name
                    }
                  </Cell>
                  <Cell>
                    {dataset === "working" && editable && (
                      <ActionButton
                        aria-label={`Review and register ${String(proposal.value)}`}
                        onPress={() => {
                          try {
                            if (store.get(taxonomyDocumentAtom) !== document)
                              throw new Error(
                                "The Registry changed. Reopen the review before applying your change.",
                              );
                            edit(
                              registerTerm(
                                document,
                                proposal.categoryId,
                                proposal.value,
                                crypto.randomUUID(),
                              ),
                            );
                            setFailure(undefined);
                          } catch (error) {
                            setFailure({
                              snapshot,
                              message:
                                error instanceof Error
                                  ? error.message
                                  : String(error),
                            });
                          }
                        }}
                      >
                        Register term
                      </ActionButton>
                    )}
                  </Cell>
                </Row>
              )}
            </TableBody>
          </TableView>
        </DisclosurePanel>
      </Disclosure>
      <Disclosure isQuiet>
        <DisclosureTitle>Components and elements</DisclosureTitle>
        <DisclosurePanel>
          <p>
            These are shared proposal identities, not a component editor or an
            automatic anatomy migration. Slider track and handle references
            remain distinct.
          </p>
          <TableView
            aria-label="Proposed component catalog"
            isQuiet
            density="compact"
            styles={tableStyles}
          >
            <TableHeader>
              <Column id="name" isRowHeader>
                Component
              </Column>
              <Column id="group">Group</Column>
              <Column id="elements">Shared Element references</Column>
            </TableHeader>
            <TableBody items={classificationStandard.components}>
              {(component) => (
                <Row id={component.id}>
                  <Cell>{component.name}</Cell>
                  <Cell>{component.group}</Cell>
                  <Cell>
                    {component.elementIds
                      .map(
                        (id) =>
                          classificationStandard.concepts.find(
                            (concept) => concept.id === id,
                          )?.value,
                      )
                      .join(", ")}
                  </Cell>
                </Row>
              )}
            </TableBody>
          </TableView>
        </DisclosurePanel>
      </Disclosure>
    </section>
  );
}
