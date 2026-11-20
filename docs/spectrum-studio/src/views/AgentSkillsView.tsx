// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  Content,
  Heading,
  InlineAlert,
  Picker,
  PickerItem,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import { useAtomValue } from "jotai";
import { CodeBlock } from "../components/CodeBlock";
import { useNotify } from "../components/notifications/notificationContext";
import type { GeneratedSkill } from "../features/design-data/agentSkills";
import {
  agentSkillsArchive,
  agentSkillsAtom,
} from "../features/design-data/agentSkillsState";

const layout = style({
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  overflow: "auto",
  minHeight: 0,
  flexGrow: 1,
});
const row = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 8,
});
const list = style({ margin: 0, paddingStart: 20 });

function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function AgentSkillsView({
  skills,
  area,
}: {
  skills: readonly GeneratedSkill[];
  /** Limits the view to one area's skill, such as Color's Skills tab. */
  area?: GeneratedSkill["area"];
}) {
  const notify = useNotify();
  const shown = area ? skills.filter((skill) => skill.area === area) : skills;
  const [chosen, setChosen] = useState(shown[0]?.name);
  const selected = shown.find((skill) => skill.name === chosen) ?? shown[0];
  const [error, setError] = useState("");
  return (
    <div className={layout} data-component="AgentSkillsView">
      <h1>Agent skills</h1>
      <Text>
        Skills are instructions for AI agents. They explain the intent of the
        saved system and how to choose its tokens, without listing values. They
        are rebuilt from your saved Foundations, Styles, Rules and Modes, so
        unsaved edits appear after you save.
      </Text>
      <div className={row}>
        {shown.length > 1 && (
          <Picker
            label="Skill"
            selectedKey={selected?.name}
            onSelectionChange={(key) => {
              if (key != null) setChosen(String(key));
            }}
          >
            {shown.map((skill) => (
              <PickerItem key={skill.name} id={skill.name}>
                {skill.title}
              </PickerItem>
            ))}
          </Picker>
        )}
        <Button
          variant="accent"
          isDisabled={!skills.length}
          onPress={() =>
            download(
              agentSkillsArchive(skills),
              "spectrum-skills.zip",
              "application/zip",
            )
          }
        >
          Download all skills (.zip)
        </Button>
        <Button
          variant="secondary"
          isDisabled={!selected}
          onPress={async () => {
            try {
              await navigator.clipboard.writeText(selected!.markdown);
              notify.copied();
              setError("");
            } catch (failure) {
              setError(
                failure instanceof Error ? failure.message : String(failure),
              );
            }
          }}
        >
          Copy this skill
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {selected && selected.diagnostics.length > 0 && (
        <InlineAlert variant="notice">
          <Heading>
            {selected.diagnostics.length === 1
              ? "1 thing to fill in"
              : `${selected.diagnostics.length} things to fill in`}
          </Heading>
          <Content>
            <Text>
              These gaps were left out of the skill rather than guessed. Filling
              them in makes agent guidance more accurate.
            </Text>
            <ul className={list}>
              {selected.diagnostics.map((diagnostic) => (
                <li key={`${diagnostic.subject}\u0000${diagnostic.message}`}>
                  <strong>{diagnostic.subject}</strong>: {diagnostic.message}{" "}
                  {diagnostic.fix}
                </li>
              ))}
            </ul>
          </Content>
        </InlineAlert>
      )}
      {selected ? (
        <>
          <Text>
            File: <code>{selected.path}</code>
          </Text>
          <CodeBlock code={selected.markdown} language="markdown" />
        </>
      ) : (
        <Text>There are no skills to show yet.</Text>
      )}
    </div>
  );
}

/** Skills generated from the saved system. */
export function SavedAgentSkills({ area }: { area?: GeneratedSkill["area"] }) {
  return <AgentSkillsView skills={useAtomValue(agentSkillsAtom)} area={area} />;
}
