<!-- Copyright 2026 Adobe. All rights reserved. -->

# Bounded agent execution

Use the shared runner for Studio verification. It limits participating work
across local sessions and worktrees. It does not contain the agent desktop app
itself, built-in search indexing, or commands launched outside the runner.

## Choose work explicitly

Run these commands from `docs/spectrum-studio`, or prefix them with
`pnpm --dir docs/spectrum-studio` from the repository root.

```sh
pnpm check:list
pnpm check:list --only check-selection
pnpm check:focused --only check-selection
pnpm check:list --only types-files --files scripts/checkRunner.ts
pnpm check:list --profile browser
```

Check IDs come from `scripts/checkInventory.ts`. Inspect the resolved list with
`check:list --only <id,...>`. Listing does not launch checks or browsers.
Prerequisites are deduplicated and appear with their scope and resource class.
New tests join comprehensive CI, but are conservatively heavy integration work
until explicitly classified. Neither a test filename nor a small returned report
proves that a check loads little data.

Choose one element and its immediate relevant checks. Prefer `lint-files` and
`types-files` with explicit `--files <file,...>` over package-wide commands.
The type checker follows real imports; a small root list does not imply a small
dependency closure or prove whole-app typing.

Integration/project scope requires an explicit user request, recorded with
`--scope-approved`. Heavy work requires approval for the named selection,
recorded with `--heavy-approved`. Changing `--profile` alone grants nothing.
For example, after receiving approval for runner-only typing:

```sh
pnpm check:focused --only runner-types --heavy-approved
```

Graph commands are heavy too. A context query never rebuilds the map. Missing
or stale graph context is a reported limitation, not a reason to block ordinary
development: inspect the changed owner and immediate related source/tests.
Full graph refresh requires separate explicit approval.

`pnpm test:ci` explicitly selects the complete non-browser inventory, including
types, lint, tests, SDK/analysis checks and builds. It is not a local default.
Moon's CI test task runs this inventory once instead of separately repeating
Studio's type-check, lint and build tasks.
The Node CI execution step has a 90-minute outer timeout so the supervised
profile can stop and report before the CI host terminates the job.

`pnpm typecheck`, `pnpm lint` and `pnpm build` also use the runner and need explicit
local scope/heavy approval. Local typing no longer builds the SDK first, and
lint no longer chains all typing. Build prerequisites run inside supervision.
CI still covers the full inventory. Older grouped
`test:*` aliases remain for compatibility, but are not supervised unless launched
through a named runner entry. The optional agent hook denies direct heavy
commands where it is active.

## Limits and failure

Small invocations reserve 256 MiB of aggregate sampled RSS, at most 16 owned
processes, and a 30-second deadline for the entire selection, including
prerequisites. At most two small invocations may overlap across participating
sessions/worktrees: their combined reservation cannot exceed 512 MiB.

Approved heavy invocations run alone, reserving 1 GiB, at most 48 owned processes
and a 60-second selection deadline. They cannot overlap small invocations.
Both local classes limit each check's log to 2 MiB. Accounting includes the
runner itself and its owned workload descendants, not just the child command.

In CI (`CI=true` with the CI profile), the existing comprehensive budget remains
240 seconds per check, 3,600 seconds per selection, 48 processes and the smaller
of 2 GiB or 15% of physical memory. Selecting the CI profile locally does not
raise the local budget.
These are safety cutoffs, not measured performance targets or completion estimates.

Shared user-level reservations admit work atomically. Busy returns a structured
"not run" response with exit code 2 and the blocking owner, without starting a
workload or waiting in a queue. Continue independent work: do not wait, poll,
retry automatically or start a substitute command.

Incomplete reservations, legacy leases and unconfirmed cleanup block admission.
An owner's exit does not establish that its descendants exited. There is no
automatic stale-owner recovery; inspect ownership and surviving work before
an explicitly approved recovery. Never delete another run's reservation.

Timeouts, resource cutoffs, cancellation and incomplete cleanup block later
checks. A normal local assertion failure also stops the selection; comprehensive
CI can collect independent assertion failures. No run automatically retries.
Ask before retrying, increasing limits or launching a replacement job.

Each run writes a separate `reports/checks/<run-id>/` directory. Results include
the selected command, status, cutoff policy and sampled resource peaks.
The selection fingerprint identifies command selection, **not all source inputs**;
it is not a cache key or proof that results remain current after source changes.
Logs are size-limited; truncation is an explicit resource failure.

## Browser verification

Both configurations enforce one worker, zero retries, a whole-run timeout,
action/navigation limits and a first-failure cutoff. The safe browser profile
requires explicit test-file selection; `--grep` narrows cases inside that file.
Use it to avoid an unnecessary existing viewport/theme matrix.
Direct Playwright configuration loading
without the runner's scope marker is rejected before a browser starts.

Run focused stories after the relevant feature is complete or separately
approved. Actual app-page checks additionally require explicit permission naming
the scenario and why an isolated story cannot cover it. Only then add
`--app-approved`; that flag records the agent's acknowledgment, not independent
proof that permission was obtained.

Playwright owns teardown for its browser fixtures and servers it starts.
Automatic server reuse is disabled: readiness alone cannot establish revision
identity. An occupied endpoint fails rather than testing an unknown revision.
Strict ports prevent silently starting a duplicate server on another port.
Existing servers are not owned by the run and must not be killed. Enabling reuse
needs a separate identity-validation design, not just a readiness assertion.

The outer runner accounts for its owned browser/server process tree. A separately
started server is outside that accounting. Assertions and page-error
capture remain necessary; a screenshot or type check does not prove a workflow.

## Copilot activation and limits

`.github/hooks/studio-resources.json` runs a small admission handler before tools.
It recognizes simple bounded runner commands, denies direct Studio heavy jobs
and automatic delegation, and narrows built-in searches. Unknown compound shell
commands are denied rather than interpreted as safe by a guessed shell parser.
The hook is not an operating-system sandbox.

Repository trust and hook loading depend on the client. A harmless activation
probe is:

```sh
echo STUDIO_ADMISSION_PROBE_DENY
```

An active hook denies it with the specific Studio probe message. If it executes,
automatic admission is **not active** in that session. Restart/reload only through
the client's supported controls, then repeat the harmless probe. Do not test
activation by launching an expensive command.

The probe was denied with the Studio-specific message in the current
implementation session. This establishes that session's probe path only, not
all desktop clients or child-agent coverage. Fixture tests establish handler
decisions, not client activation. Repeat the harmless probe in a new client
before claiming its hook is active.

| Surface                                         | Available protection                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| Shared commands, any agent                      | Runner selection, shared lease and best-effort process supervision    |
| Copilot with an activated and probed hook       | Additional tool admission; child coverage must also be verified       |
| Claude Code, Cursor, Codex                      | Shared commands and instructions; no verified client-specific adapter |
| Desktop runtime, internal indexing, MCP startup | Not contained by repository command supervision                       |

[GitHub documents](https://docs.github.com/en/copilot/reference/hooks-reference)
that hook timeouts can fail open and some agent types omit
subagent lifecycle events. Stop hooks must not force repeated improvement turns.
Do not use lifecycle notifications as proof of complete process ownership.

## Native supervision is not hard containment

The runner samples the owned process tree outside the workload's event loop and
uses process identity/group ownership for cleanup. macOS/Linux accounting uses
`ps`; Windows uses PowerShell CIM and task-tree termination. Windows behavior
must be verified on Windows before claiming platform parity.

Sampled RSS can miss short bursts, count shared pages more than once, and
understate compressed/swapped memory. A descendant that escapes supervision, or
an abruptly killed supervisor, may outlive the run. Node heap flags do not cap
the whole tree. Do not claim these controls make a local machine impossible to
overload.

Hard CPU, memory and process guarantees require an explicitly configured OS
boundary, such as a limited container/VM or isolated CI runner. That is a separate
setup decision; it is not a recommendation to buy more RAM. No container or
machine-wide setting is installed by these project changes.
