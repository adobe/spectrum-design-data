// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  Checkbox,
  NumberField,
  PickerItem,
  ProgressCircle,
  SearchField,
  Text,
  TextField,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useMemo, useRef, useState } from "react";
import { Picker } from "../../../components/fields/Picker";
import { foundationCardStyles } from "../../../components/foundationCardStyles";
import type { RgbGamut } from "../../../features/color-system/colorMath";
import {
  DEFAULT_CATEGORICAL_PREFERENCES,
  VISION_PROFILE_LABELS,
  type CategoricalDataVisScale,
  type CategoricalMember,
  type CvdProfile,
} from "../../../features/color-system/data-vis/model";
import { usePaletteInspections } from "../../../features/color-system/data-vis/usePaletteInspections";
import { concreteColor } from "../../../features/color-system/data-vis/colors";
import { suggestionMembers } from "../../../features/color-system/data-vis/requests";
import {
  useSuggestions,
  type SuggestionState,
} from "../../../features/color-system/data-vis/useSuggestions";
import {
  uiSwatchKey,
  type UiSwatch,
} from "../../../features/color-system/data-vis/resolution";
import { useRequestedFieldFocus } from "../../../components/fields/useRequestedFieldFocus";
import { ScaleColorPreview } from "../../../views/color-system/ScaleColorPreview";
import {
  isUnchangedTermInput,
  normalizeTermValue,
  termLabel,
} from "../../../features/taxonomy/termPresentation";

const stack = style({ display: "flex", flexDirection: "column", gap: 16 });
const row = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
});
const candidates = style({
  maxHeight: 240,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 4,
});
const card = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
});
const note = style({ font: "body-sm", color: "neutral-subdued", margin: 0 });
const failure = style({ font: "body-sm", color: "negative", margin: 0 });

export interface CategoricalChooserProps {
  scaleId: string;
  name: string;
  initial?: CategoricalDataVisScale;
  swatches: UiSwatch[];
  background: string;
  gamut: RgbGamut;
  fingerprint: string;
  onApply: (
    scale: CategoricalDataVisScale,
    fingerprint: string,
    acknowledge: boolean,
    signal?: AbortSignal,
  ) => void | Promise<void>;
  onCancel: () => void;
  suggestionState?: SuggestionState;
  memberOverrides?: Record<string, string>;
  focusName?: boolean;
  onNameFocused?: () => void;
}
export function CategoricalChooser(props: CategoricalChooserProps) {
  const nameRef = useRequestedFieldFocus(
    !!props.focusName && !props.initial,
    props.onNameFocused,
  );
  const [name, setName] = useState<string | null>(null);
  const authoredName =
    props.initial || name === null || isUnchangedTermInput(name, props.name)
      ? props.name
      : normalizeTermValue(name);
  const [preferences, setPreferences] = useState(() =>
    structuredClone(
      props.initial?.preferences ?? DEFAULT_CATEGORICAL_PREFERENCES,
    ),
  );
  const [members, setMembers] = useState<CategoricalMember[]>(() =>
    structuredClone(props.initial?.members ?? []),
  );
  const [context, setContext] = useState(props.fingerprint),
    [acknowledge, setAcknowledge] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null),
    [applying, setApplying] = useState(false),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0);
  useEffect(() => () => pending.current?.abort(), []);
  const request = useMemo(
    () => ({
      candidates: props.swatches,
      preferences,
      background: props.background,
      gamut: props.gamut,
    }),
    [props.swatches, preferences, props.background, props.gamut],
  );
  const generated = useSuggestions(
      request,
      props.fingerprint,
      props.suggestionState === undefined,
    ),
    suggestions = props.suggestionState ?? generated;
  const stale = context !== props.fingerprint;
  const selection = useMemo(() => {
    try {
      const colors = members.map((member) => {
        const source = props.swatches.find(
          (swatch) => swatch.id === uiSwatchKey(member.source),
        );
        if (!source)
          throw new Error(
            "A selected source is unavailable. Remove it or choose a replacement.",
          );
        const color = {
          ...source,
          value: props.memberOverrides?.[member.id] ?? source.value,
        };
        concreteColor(color.value);
        return color;
      });
      return { colors, error: "" };
    } catch (failure) {
      return {
        colors: [],
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [members, props.swatches, props.memberOverrides]);
  const inspections = useMemo(
    () =>
      selection.colors.length
        ? [
            {
              id: props.scaleId,
              members: selection.colors,
              preferences,
              background: props.background,
              gamut: props.gamut,
            },
          ]
        : [],
    [
      selection.colors,
      props.scaleId,
      preferences,
      props.background,
      props.gamut,
    ],
  );
  const checked = usePaletteInspections(inspections, props.fingerprint);
  const inspection =
    checked.status === "ready" ? checked.reports[props.scaleId] : undefined;
  const report = inspection?.status === "ready" ? inspection.report : null;
  const inspectionError =
    checked.status === "error"
      ? checked.error
      : inspection?.status === "error"
        ? inspection.error
        : "";
  const filtered = useMemo(
    () =>
      props.swatches.filter((swatch) =>
        swatch.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [props.swatches, query],
  );
  const lastPage = Math.max(0, Math.ceil(filtered.length / 100) - 1),
    visiblePage = Math.min(page, lastPage);
  function changeMembers(next: CategoricalMember[]) {
    setMembers(next);
    setAcknowledge(false);
    setError("");
  }
  const selectedIds = new Set(
    members.map((member) => uiSwatchKey(member.source)),
  );
  return (
    <div className={stack} data-component="CategoricalChooser">
      <h2>
        {props.initial ? "Choose categorical colors" : "New categorical scale"}
      </h2>
      {!props.initial && (
        <TextField
          label="Scale name"
          value={name ?? termLabel(props.name)}
          onChange={setName}
          isRequired
          ref={nameRef}
        />
      )}
      <p className={note}>
        Choose final UI-scale swatches. The same links and order follow every
        mode; colors are never regenerated or replaced automatically.
      </p>
      <Picker
        label="Palette size"
        selectedKey={preferences.size.kind}
        onSelectionChange={(key) => {
          setPreferences({
            ...preferences,
            size:
              key === "count"
                ? { kind: "count", count: Math.max(1, members.length || 5) }
                : { kind: "auto" },
          });
          setAcknowledge(false);
        }}
      >
        <PickerItem id="auto">Largest found</PickerItem>
        <PickerItem id="count">Requested count</PickerItem>
      </Picker>
      {preferences.size.kind === "count" && (
        <NumberField
          label="Requested colors"
          minValue={1}
          step={1}
          value={preferences.size.count}
          onChange={(count) => {
            setPreferences({ ...preferences, size: { kind: "count", count } });
            setAcknowledge(false);
          }}
        />
      )}
      <NumberField
        label="Minimum background contrast"
        minValue={1}
        maxValue={21}
        step={0.1}
        value={preferences.minimumBackgroundContrast}
        onChange={(value) => {
          setPreferences({ ...preferences, minimumBackgroundContrast: value });
          setAcknowledge(false);
        }}
      />
      <NumberField
        label="Minimum Delta E 2000"
        minValue={0}
        step={1}
        value={preferences.minimumDeltaE}
        onChange={(value) => {
          setPreferences({ ...preferences, minimumDeltaE: value });
          setAcknowledge(false);
        }}
      />
      <div role="group" aria-label="Color-vision checks" className={stack}>
        {(
          [
            "protanopia",
            "deuteranopia",
            "tritanopia",
            "achromatopsia",
          ] as CvdProfile[]
        ).map((profile) => (
          <Checkbox
            key={profile}
            isSelected={preferences.cvdProfiles.includes(profile)}
            onChange={(enabled) => {
              setPreferences({
                ...preferences,
                cvdProfiles: enabled
                  ? [...preferences.cvdProfiles, profile]
                  : preferences.cvdProfiles.filter((item) => item !== profile),
              });
              setAcknowledge(false);
            }}
          >
            {VISION_PROFILE_LABELS[profile]}
          </Checkbox>
        ))}
      </div>
      <h3>Suggested palettes</h3>
      {suggestions.status === "loading" ? (
        <div className={row}>
          <ProgressCircle
            aria-label="Finding categorical suggestions"
            isIndeterminate
            size="S"
          />
          <Text>Finding options</Text>
        </div>
      ) : suggestions.status === "error" ? (
        <p role="alert" className={failure}>
          {suggestions.error}
        </p>
      ) : (
        <>
          <p role="status" className={note}>
            {suggestions.result.message}
          </p>
          {suggestions.result.suggestions.map((suggestion) => {
            const sources = suggestion.sourceIds.map((id) =>
              props.swatches.find((color) => color.id === id),
            );
            const available = sources.every((source) => source !== undefined),
              colors = sources.flatMap((source) =>
                source ? [source.value] : [],
              );
            return (
              <div
                key={suggestion.style}
                className={`${foundationCardStyles} ${card}`}
              >
                <Text>
                  {suggestion.style === "balanced" ? "Balanced" : "Bold"} ·{" "}
                  {suggestion.sourceIds.length} colors · {suggestion.sizeLabel}
                </Text>
                {available ? (
                  <ScaleColorPreview
                    colors={colors}
                    continuous={false}
                    label={`${suggestion.style} suggested colors`}
                    background={props.background}
                  />
                ) : (
                  <Text>
                    The suggestion contains unavailable sources. Refresh the
                    options.
                  </Text>
                )}
                <p className={note}>
                  {suggestion.style === "balanced"
                    ? "Smoother lightness and chroma changes."
                    : "Stronger adjacent lightness and chroma changes."}
                </p>
                <ActionButton
                  isDisabled={stale || !available || applying}
                  onPress={() => {
                    try {
                      changeMembers(
                        suggestionMembers(
                          suggestion.sourceIds,
                          props.swatches,
                          members,
                          () => crypto.randomUUID(),
                        ),
                      );
                      setPreferences({
                        ...preferences,
                        style: suggestion.style,
                      });
                    } catch (failure) {
                      setError(
                        failure instanceof Error
                          ? failure.message
                          : String(failure),
                      );
                    }
                  }}
                >
                  Choose {suggestion.style}
                </ActionButton>
              </div>
            );
          })}
        </>
      )}
      <h3>Selected colors ({members.length})</h3>
      <p className={note}>
        Replacing a color keeps its member identity. Reordering keeps each
        member with its selected source.
      </p>
      {members.map((member, index) => (
        <div key={member.id} className={`${foundationCardStyles} ${card}`}>
          {props.memberOverrides?.[member.id] !== undefined && (
            <Text>
              A direct token value override is active. Edit or reset it in
              Tokens.
            </Text>
          )}
          <Picker
            label={`Color ${index + 1} source`}
            selectedKey={uiSwatchKey(member.source)}
            onSelectionChange={(id) => {
              const source = props.swatches.find((swatch) => swatch.id === id);
              if (source)
                changeMembers(
                  members.map((item) =>
                    item.id === member.id
                      ? { ...item, source: source.source }
                      : item,
                  ),
                );
            }}
          >
            {props.swatches.map((swatch) => (
              <PickerItem key={swatch.id} id={swatch.id}>
                {swatch.label}
              </PickerItem>
            ))}
          </Picker>
          <div className={row}>
            <ActionButton
              isDisabled={index === 0}
              aria-label={`Move color ${index + 1} earlier`}
              onPress={() => {
                const next = [...members];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                changeMembers(next);
              }}
            >
              Earlier
            </ActionButton>
            <ActionButton
              isDisabled={index === members.length - 1}
              aria-label={`Move color ${index + 1} later`}
              onPress={() => {
                const next = [...members];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                changeMembers(next);
              }}
            >
              Later
            </ActionButton>
            <ActionButton
              aria-label={`Remove color ${index + 1}`}
              onPress={() =>
                changeMembers(members.filter((item) => item.id !== member.id))
              }
            >
              Remove
            </ActionButton>
          </div>
        </div>
      ))}
      <h3>Available UI colors</h3>
      <SearchField
        label="Find source colors"
        value={query}
        onChange={(value) => {
          setQuery(value);
          setPage(0);
        }}
      />
      <p className={note}>
        {filtered.length} source colors
        {filtered.length > 100
          ? `; showing ${visiblePage * 100 + 1}–${Math.min(filtered.length, (visiblePage + 1) * 100)}`
          : ""}
        .
      </p>
      <div
        className={candidates}
        role="group"
        aria-label="Available categorical source colors"
      >
        {filtered
          .slice(visiblePage * 100, (visiblePage + 1) * 100)
          .map((swatch) => {
            let valid = true;
            try {
              concreteColor(swatch.value);
            } catch {
              valid = false;
            }
            return (
              <div key={swatch.id} className={row}>
                <Checkbox
                  isDisabled={!valid || applying}
                  isSelected={selectedIds.has(swatch.id)}
                  onChange={(selected) =>
                    changeMembers(
                      selected
                        ? [
                            ...members,
                            { id: crypto.randomUUID(), source: swatch.source },
                          ]
                        : members.filter(
                            (member) =>
                              uiSwatchKey(member.source) !== swatch.id,
                          ),
                    )
                  }
                >
                  {swatch.label}
                </Checkbox>
                {valid ? (
                  <ScaleColorPreview
                    colors={[swatch.value]}
                    continuous={false}
                    label={`${swatch.label} preview`}
                    background={props.background}
                  />
                ) : (
                  <Text>Unavailable color</Text>
                )}
              </div>
            );
          })}
      </div>
      {lastPage > 0 && (
        <div className={row}>
          <ActionButton
            isDisabled={visiblePage === 0}
            onPress={() => setPage(visiblePage - 1)}
          >
            Previous source colors
          </ActionButton>
          <ActionButton
            isDisabled={visiblePage === lastPage}
            onPress={() => setPage(visiblePage + 1)}
          >
            Next source colors
          </ActionButton>
        </div>
      )}
      {selection.colors.length > 0 && (
        <ScaleColorPreview
          colors={selection.colors.map((color) => color.value)}
          continuous={false}
          label="Selected categorical colors"
          background={props.background}
        />
      )}
      {checked.status === "loading" && (
        <ProgressCircle
          aria-label="Checking selected colors"
          isIndeterminate
          size="S"
        />
      )}
      {report && (
        <p className={note}>
          {report.pairCount} color pairs; minimum Delta E 2000:{" "}
          {report.minimumDeltaE === null
            ? "not applicable for one color"
            : report.minimumDeltaE.toFixed(2)}
          .
        </p>
      )}
      {!!report?.failureCount && (
        <>
          <p className={failure}>
            {report.failureCount} selection checks are unmet.{" "}
            {report.failures.slice(0, 3).join(" ")}
          </p>
          <Checkbox isSelected={acknowledge} onChange={setAcknowledge}>
            Apply this manual selection despite the unmet targets
          </Checkbox>
        </>
      )}
      {stale && (
        <div role="alert" className={stack}>
          <Text>
            The source colors or modes changed. Review the current colors before
            applying.
          </Text>
          <ActionButton
            onPress={() => {
              setContext(props.fingerprint);
              setAcknowledge(false);
            }}
          >
            Refresh selection
          </ActionButton>
        </div>
      )}
      {(error || selection.error || inspectionError) && (
        <p role="alert" className={failure}>
          {error || selection.error || inspectionError}
        </p>
      )}
      <p className={note}>
        Suggestions are bounded searches, not proof of the largest possible set.
        Aesthetic rankings and color-vision simulations are estimates, not
        accessibility certification.
      </p>
      <div className={row}>
        <Button
          variant="secondary"
          onPress={() => {
            pending.current?.abort();
            props.onCancel();
          }}
        >
          Cancel
        </Button>
        <Button
          variant="accent"
          isPending={applying}
          isDisabled={
            stale ||
            !authoredName.trim() ||
            !members.length ||
            applying ||
            !report ||
            !!selection.error ||
            !!inspectionError ||
            (!!report.failureCount && !acknowledge)
          }
          onPress={async () => {
            const controller = new AbortController();
            pending.current = controller;
            setApplying(true);
            try {
              await props.onApply(
                {
                  ...props.initial,
                  id: props.scaleId,
                  name: authoredName.trim(),
                  kind: "categorical",
                  members,
                  preferences,
                },
                context,
                acknowledge,
                controller.signal,
              );
            } catch (failure) {
              setError(
                failure instanceof Error ? failure.message : String(failure),
              );
            } finally {
              if (!controller.signal.aborted) setApplying(false);
              pending.current = null;
            }
          }}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
