// Copyright 2026 Adobe. All rights reserved.
import { useRpc, useSubscription, type PluginScreenProps } from "@getpaseo/plugin/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { discussEpic, listProjects, loadRoadmap, watchRoadmap } from "../shared/roadmap";

const GROUPS = [
  { key: "now", title: "Now", hint: "in progress or unblocked" },
  { key: "next", title: "Next", hint: "waiting on something in Now" },
  { key: "later", title: "Later", hint: "waiting two or more steps out" },
  { key: "independent", title: "Independent", hint: "no links to other epics" },
] as const;
const AMBER = "#e8a317";
const GREEN = "#2d9d78";
const MAX_LEAVES = 6;

export function RoadmapScreen({ theme, layout }: PluginScreenProps) {
  const projects = useRpc(listProjects);
  const load = useRpc(loadRoadmap);
  const [picked, setPicked] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const projectsQ = useQuery({ queryKey: ["roadmap-projects"], queryFn: () => projects({}) });
  const path = picked ?? projectsQ.data?.projects[0]?.path ?? null;
  const roadmapQ = useQuery({
    queryKey: ["roadmap", path],
    queryFn: () => load({ path: path! }),
    enabled: !!path,
    refetchInterval: 300_000,
  });

  const send = useRpc(discussEpic);
  const [draft, setDraft] = useState<Record<string, { note: string; prio: number | null }>>({});
  const [discussing, setDiscussing] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [sendError, setSendError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  useSubscription(watchRoadmap, { path: path ?? "" }, () => {
    void queryClient.invalidateQueries({ queryKey: ["roadmap", path] });
  });

  const s = useMemo(
    () => ({
      screen: { flex: 1, padding: layout.compact ? 12 : 24, gap: 12, backgroundColor: theme.colors.surface0 },
      text: { color: theme.colors.foreground, fontSize: 14, lineHeight: 20 },
      muted: { color: theme.colors.foregroundMuted, fontSize: 12, lineHeight: 17 },
      chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
    }),
    [theme, layout.compact],
  );

  const data = roadmapQ.data;
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <View style={s.screen}>
      <View style={{ width: "100%", maxWidth: 860, alignSelf: "center", gap: 10 }}>
        <Text style={s.muted}>Ordered by dependency and priority, not dates. Updates live when beads change.</Text>
        {projectsQ.data && projectsQ.data.projects.length > 1 ? (
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {projectsQ.data.projects.map((p) => (
              <Pressable key={p.path} accessibilityRole="button" onPress={() => setPicked(p.path)} style={[s.chip, p.path === path && { backgroundColor: theme.colors.accent }]}>
                <Text style={[s.muted, { color: p.path === path ? theme.colors.accentForeground : theme.colors.foreground }]}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {projectsQ.data && !path ? <Text style={s.text}>No project with a .beads folder found.</Text> : null}
        {roadmapQ.error ? <Text style={s.text}>{String(roadmapQ.error)}</Text> : null}
        {roadmapQ.isLoading ? <Text style={s.muted}>Loading…</Text> : null}
      </View>
      <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 32 }}>
        <View style={{ width: "100%", maxWidth: 860, gap: 28 }}>
          {GROUPS.map(({ key, title, hint }) => {
            const rows = (data?.epics ?? [])
              .filter((e) => e.group === key)
              .sort((a, b) => a.priority - b.priority || b.inProgress - a.inProgress || b.total - b.done - (a.total - a.done));
            if (!rows.length) return null;
            const collapsed = key === "independent" && !open.has("group:independent");
            return (
              <View key={key}>
                <Pressable accessibilityRole="button" disabled={key !== "independent"} onPress={() => toggle("group:independent")} style={{ flexDirection: "row", alignItems: "baseline", gap: 8, paddingBottom: 6 }}>
                  <Text style={{ color: theme.colors.foreground, fontSize: 18, fontWeight: "700" }}>
                    {key === "independent" ? (collapsed ? "▸ " : "▾ ") : ""}
                    {title}
                  </Text>
                  <Text style={s.muted}>
                    {rows.length} · {hint}
                  </Text>
                </Pressable>
                {collapsed
                  ? null
                  : rows.map((e) => {
                      const expanded = open.has(e.id);
                      const left = e.total - e.done;
                      const hot = e.priority <= 1;
                      const leaves = [...e.leaves].sort((a, b) => Number(b.status === "in_progress") - Number(a.status === "in_progress"));
                      return (
                        <View key={e.id} style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 12 }}>
                          <Pressable accessibilityRole="button" accessibilityLabel={`${e.title}, ${left} left`} onPress={() => toggle(e.id)} style={{ gap: 6 }}>
                            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                              <Text style={[s.text, { flex: 1, fontWeight: "600" }]}>
                                {e.parentTitle ? <Text style={[s.muted, { fontWeight: "400" }]}>{e.parentTitle} › </Text> : null}
                                {e.title}
                              </Text>
                              <Text style={[s.muted, { fontWeight: "700", color: hot ? AMBER : theme.colors.foregroundMuted }]}>P{e.priority}</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                              <View style={{ width: 120, height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: "hidden" }}>
                                <View style={{ height: 6, width: `${(100 * e.done) / Math.max(1, e.total)}%`, backgroundColor: GREEN }} />
                              </View>
                              <Text style={[s.muted, { flex: 1 }]}>
                                <Text style={{ color: theme.colors.foreground, fontWeight: "600" }}>{left} left</Text>
                                {e.inProgress > 0 ? ` · ${e.inProgress} in progress` : ""}
                                {` · ${e.done}/${e.total} closed`}
                                {e.dependents > 0 ? ` · unblocks ${e.dependents}` : ""}
                              </Text>
                            </View>
                            {e.blockedBy.length ? (
                              <Text numberOfLines={2} style={s.muted}>
                                <Text style={{ color: AMBER, fontWeight: "600" }}>Waiting on </Text>
                                {e.blockedBy.join(", ")}
                              </Text>
                            ) : null}
                          </Pressable>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
                            <Pressable accessibilityRole="button" accessibilityLabel={`Discuss ${e.title} with the orchestrator`} onPress={() => setDiscussing(discussing === e.id ? null : e.id)}>
                              <Text style={[s.muted, { color: theme.colors.accent }]}>Discuss</Text>
                            </Pressable>
                            {sent[e.id] ? <Text style={[s.muted, { color: GREEN }]}>Sent to {sent[e.id]}</Text> : null}
                          </View>
                          {discussing === e.id ? (
                            <View style={{ marginTop: 6, gap: 8 }}>
                              <TextInput
                                multiline
                                value={draft[e.id]?.note ?? ""}
                                onChangeText={(note) => setDraft((d) => ({ ...d, [e.id]: { note, prio: d[e.id]?.prio ?? null } }))}
                                placeholder="Question or recommendation for the orchestrator"
                                placeholderTextColor={theme.colors.foregroundMuted}
                                style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 8, minHeight: 60, color: theme.colors.foreground, fontSize: 13 }}
                              />
                              <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <Text style={s.muted}>Suggest</Text>
                                {[0, 1, 2, 3, 4].map((n) => {
                                  const on = draft[e.id]?.prio === n;
                                  return (
                                    <Pressable key={n} accessibilityRole="button" onPress={() => setDraft((d) => ({ ...d, [e.id]: { note: d[e.id]?.note ?? "", prio: on ? null : n } }))} style={[s.chip, { paddingVertical: 2 }, on && { backgroundColor: theme.colors.accent }]}>
                                      <Text style={[s.muted, { color: on ? theme.colors.accentForeground : theme.colors.foreground }]}>P{n}</Text>
                                    </Pressable>
                                  );
                                })}
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => {
                                    const d = draft[e.id] ?? { note: "", prio: null };
                                    if (!d.note.trim() && d.prio === null) return;
                                    setSendError(null);
                                    send({ epicId: e.id, title: e.title, priority: e.priority, blockedBy: e.blockedBy, done: e.done, total: e.total, inProgress: e.inProgress, note: d.note, suggestedPriority: d.prio })
                                      .then((r) => {
                                        setSent((m) => ({ ...m, [e.id]: r.sentTo }));
                                        setDraft((x) => ({ ...x, [e.id]: { note: "", prio: null } }));
                                        setDiscussing(null);
                                      })
                                      .catch((err) => setSendError(String(err)));
                                  }}
                                  style={[s.chip, { backgroundColor: theme.colors.accent, marginLeft: "auto" }]}
                                >
                                  <Text style={[s.muted, { color: theme.colors.accentForeground }]}>Send</Text>
                                </Pressable>
                              </View>
                              {sendError ? <Text style={[s.muted, { color: AMBER }]}>{sendError}</Text> : null}
                            </View>
                          ) : null}
                          {expanded ? (
                            <View style={{ marginTop: 8, paddingLeft: 12, gap: 3, borderLeftWidth: 2, borderLeftColor: theme.colors.border }}>
                              {leaves.slice(0, MAX_LEAVES).map((l) => (
                                <Text key={l.id} numberOfLines={2} style={s.muted}>
                                  <Text style={{ color: l.status === "in_progress" ? AMBER : theme.colors.foregroundMuted }}>{l.status === "in_progress" ? "● " : "○ "}</Text>
                                  {l.title}
                                </Text>
                              ))}
                              {leaves.length > MAX_LEAVES ? <Text style={s.muted}>+ {leaves.length - MAX_LEAVES} more</Text> : null}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
