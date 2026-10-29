// Copyright 2026 Adobe. All rights reserved.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { appRoot, jsonFiles } from "./design-data-loader";
import {
  buildArchitectureAssessment,
  sdkExecutionEvidence,
  type AssessmentProfile,
  type AssessmentRegistry,
  type EvidenceDefinition,
  type EvidenceObservation,
} from "../src/features/design-data/assessment";
import type { AnalysisInput } from "../src/features/design-data/comparison";
import {
  architectureRegistry,
  REVIEWED_DRAFT_BASE,
  REVIEWED_DRAFT_REF,
  REVIEWED_DRAFT_REVISION,
  REVIEWED_REFERENCE_REVISION,
} from "../src/features/design-data/assessmentRegistry";

const git = (root: string, args: string[]) =>
  execFileSync("git", ["-C", root, ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
    timeout: 10_000,
  });

async function ownRepository(root: string): Promise<boolean> {
  try {
    return (
      (await realpath(root)) ===
      (await realpath(
        git(root, ["rev-parse", "--show-toplevel"]).toString().trim(),
      ))
    );
  } catch {
    return false;
  }
}

export async function assessmentProfiles(
  referenceRoot: string,
): Promise<AssessmentProfile[]> {
  let appRevision: string | null = null;
  try {
    appRevision = git(appRoot, ["rev-parse", "HEAD"]).toString().trim();
  } catch {
    /* Content hashes remain authoritative without Git provenance. */
  }
  let referenceRevision: string | null = null;
  const repository = await ownRepository(referenceRoot);
  if (repository)
    referenceRevision = git(referenceRoot, ["rev-parse", "HEAD"])
      .toString()
      .trim();
  let referenceAvailable = false;
  try {
    referenceAvailable =
      (await lstat(referenceRoot)).isDirectory() ||
      (await lstat(referenceRoot)).isSymbolicLink();
  } catch {
    /* Optional evidence remains unavailable. */
  }
  const versions = async (revision?: string) => {
    const version = async (path: string) => {
      try {
        if (!revision) {
          const file = join(referenceRoot, path);
          if (
            !(await lstat(file)).isFile() ||
            !(await realpath(file)).startsWith(
              `${await realpath(referenceRoot)}/`,
            )
          )
            return undefined;
        }
        const raw: unknown = JSON.parse(
          revision
            ? git(referenceRoot, ["show", `${revision}:${path}`]).toString()
            : await readFile(join(referenceRoot, path), "utf8"),
        );
        return raw &&
          typeof raw === "object" &&
          "version" in raw &&
          typeof raw.version === "string"
          ? raw.version
          : undefined;
      } catch {
        return undefined;
      }
    };
    const [dataset, specPackage] = await Promise.all([
      version("packages/design-data/package.json"),
      version("packages/design-data-spec/package.json"),
    ]);
    return {
      ...(dataset ? { dataset } : {}),
      ...(specPackage ? { specPackage } : {}),
    };
  };
  const pinned = (
    id: string,
    revision: string,
    label: string,
    trackedRef?: string,
  ): AssessmentProfile => {
    let available = false;
    let observedRef: string | null = null;
    if (repository) {
      try {
        available =
          git(referenceRoot, ["rev-parse", "--verify", `${revision}^{commit}`])
            .toString()
            .trim() === revision;
      } catch {
        /* No fetch or checkout fallback. */
      }
      if (trackedRef)
        try {
          observedRef = git(referenceRoot, [
            "rev-parse",
            "--verify",
            `${trackedRef}^{commit}`,
          ])
            .toString()
            .trim();
        } catch {
          /* Remote lifecycle is not queried. */
        }
    }
    return {
      id,
      label,
      kind: "pinned-git",
      root: referenceRoot,
      reviewedRevision: revision,
      observedRevision: available ? revision : null,
      status: !available
        ? "unavailable"
        : observedRef && observedRef !== revision
          ? "tracked-ref-advanced"
          : "available",
      ...(trackedRef
        ? { trackedRef: { name: trackedRef, observedRevision: observedRef } }
        : {}),
      limitation:
        "Only cached immutable Git objects are read. No fetch, branch switch, draft SDK execution, or live PR/CI status check. Snapshot availability does not establish conformance.",
    };
  };
  const draft = pinned(
    "draft-pr1454",
    REVIEWED_DRAFT_REVISION,
    "PR 1454 reviewed draft snapshot",
    REVIEWED_DRAFT_REF,
  );
  const base = pinned(
    "draft-merge-base",
    REVIEWED_DRAFT_BASE,
    "PR 1454 historical merge base",
  );
  if (draft.status !== "unavailable")
    draft.versions = await versions(REVIEWED_DRAFT_REVISION);
  if (base.status !== "unavailable")
    base.versions = await versions(REVIEWED_DRAFT_BASE);
  return [
    {
      id: "leonardo",
      label: "Spectrum studio reviewed code",
      kind: "working-tree",
      root: appRoot,
      reviewedRevision: "R1 reviewed working-tree sources",
      observedRevision: appRevision,
      status: "available",
      limitation:
        "HEAD is provenance, not proof of a clean tree; expected evidence hashes identify the reviewed working files. Saved/working user edits are not imported here.",
    },
    {
      id: "reference-checkout",
      label: "Configured reference checkout",
      kind: "working-tree",
      root: referenceRoot,
      reviewedRevision: REVIEWED_REFERENCE_REVISION,
      observedRevision: referenceRevision,
      status: referenceAvailable ? "available" : "unavailable",
      versions: await versions(),
      limitation:
        "This checkout is not the PR head. Evidence file hashes, not HEAD alone, determine snapshot matching. Installed SDK/source correspondence remains unestablished.",
    },
    draft,
    base,
    {
      id: "joint-target",
      label: "Joint direction and proposal records",
      kind: "target-documents",
      root: appRoot,
      reviewedRevision: "joint-target-contract review v1",
      observedRevision: appRevision,
      status: "available",
      limitation:
        "Confirmed direction, unapproved model proposals, and recorded PR/CI evidence are distinguished by method. Document hashes do not refresh remote lifecycle or execute validators.",
    },
  ];
}

export function assertEvidencePath(path: string): void {
  if (
    !path ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.includes("\n") ||
    path.includes(":") ||
    path
      .split("/")
      .some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          part === ".git" ||
          part === "node_modules" ||
          part === "target",
      )
  ) {
    throw new Error(`Unsafe assessment evidence path: ${path}`);
  }
}

/** Only local Git metadata affecting profile freshness is watched; no remote operations. */
export async function assessmentGitWatchPaths(
  referenceRoot: string,
): Promise<string[]> {
  if (!(await ownRepository(referenceRoot))) return [];
  const common = resolve(
    referenceRoot,
    git(referenceRoot, ["rev-parse", "--git-common-dir"]).toString().trim(),
  );
  const head = resolve(
    referenceRoot,
    git(referenceRoot, ["rev-parse", "--git-path", "HEAD"]).toString().trim(),
  );
  let branch: string | undefined;
  try {
    branch = git(referenceRoot, ["symbolic-ref", "-q", "HEAD"])
      .toString()
      .trim();
  } catch {
    /* Detached HEAD is watched directly. */
  }
  return [
    join(common, REVIEWED_DRAFT_REF),
    join(common, "packed-refs"),
    head,
    ...(branch ? [join(common, branch)] : []),
  ];
}

/** Hashing verifies source bytes only; it never reruns a curated or reported check. */
export async function observeAssessmentEvidence(
  definition: EvidenceDefinition,
  profile: AssessmentProfile,
): Promise<EvidenceObservation> {
  assertEvidencePath(definition.path);
  if (profile.status === "unavailable")
    return {
      evidenceId: definition.id,
      sha256: null,
      reason:
        "Optional evidence profile unavailable; no fetch or substituted snapshot.",
    };
  try {
    const hash = createHash("sha256");
    if (profile.kind === "pinned-git") {
      if (!/^[a-f0-9]{40}$/.test(profile.reviewedRevision))
        throw new Error("Immutable full commit ID required.");
      if (definition.format === "file")
        hash.update(
          git(profile.root, [
            "show",
            `${profile.reviewedRevision}:${definition.path}`,
          ]),
        );
      else {
        const files = git(profile.root, [
          "ls-tree",
          "-r",
          "-z",
          "--name-only",
          profile.reviewedRevision,
          "--",
          definition.path,
        ])
          .toString()
          .split("\0")
          .filter(
            (path) =>
              path.startsWith(`${definition.path}/`) && path.endsWith(".json"),
          )
          .sort((left, right) => left.localeCompare(right, "en"));
        if (!files.length)
          throw new Error("Reviewed JSON tree is empty or unavailable.");
        for (const file of files)
          hash
            .update(file.slice(definition.path.length + 1))
            .update("\0")
            .update(
              git(profile.root, [
                "show",
                `${profile.reviewedRevision}:${file}`,
              ]),
            )
            .update("\0");
      }
    } else {
      const physicalRoot = await realpath(profile.root);
      const path = join(profile.root, definition.path);
      const physicalPath = await realpath(path);
      if (!physicalPath.startsWith(`${physicalRoot}/`))
        throw new Error("Evidence escapes configured profile root.");
      const info = await lstat(path);
      if (info.isSymbolicLink())
        throw new Error("Evidence symlinks are not followed.");
      if (definition.format === "file") {
        if (!info.isFile()) throw new Error("Evidence is not a regular file.");
        hash.update(await readFile(path));
      } else {
        if (!info.isDirectory())
          throw new Error("Evidence is not a JSON directory.");
        const files = (await jsonFiles(path)).sort((left, right) =>
          relative(path, left).localeCompare(relative(path, right), "en"),
        );
        if (!files.length)
          throw new Error("Reviewed JSON tree is empty or unavailable.");
        for (const file of files)
          hash
            .update(relative(path, file).split("\\").join("/"))
            .update("\0")
            .update(await readFile(file))
            .update("\0");
      }
    }
    return { evidenceId: definition.id, sha256: hash.digest("hex") };
  } catch {
    return {
      evidenceId: definition.id,
      sha256: null,
      reason:
        "Allowlisted evidence unavailable; no substitute, live query, or validator execution was attempted.",
    };
  }
}

export async function loadArchitectureAssessment(
  referenceRoot: string,
  inputFailures: readonly string[] = [],
  registry: AssessmentRegistry = architectureRegistry,
) {
  const profiles = await assessmentProfiles(resolve(referenceRoot));
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const observations = await Promise.all(
    registry.evidence.map(async (definition) => {
      const profile = byId.get(definition.profileId);
      if (!profile)
        throw new Error(`Unknown evidence profile: ${definition.profileId}`);
      return observeAssessmentEvidence(definition, profile);
    }),
  );
  return buildArchitectureAssessment(
    registry,
    profiles,
    observations,
    inputFailures,
  );
}

export async function attachReferenceAssessment(
  input: AnalysisInput,
  referenceRoot: string,
): Promise<AnalysisInput> {
  try {
    const architecture = await loadArchitectureAssessment(
      referenceRoot,
      input.errors.map((error) => `Reference: ${error}`),
    );
    architecture.sdkBinary = sdkExecutionEvidence(input.source);
    return { ...input, architecture };
  } catch (error) {
    return {
      ...input,
      errors: [
        ...input.errors,
        `Architecture reporting failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}
