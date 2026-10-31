// Copyright 2026 Adobe. All rights reserved.
import { Provider } from "@react-spectrum/s2";
import { useAtomValue } from "jotai";
import BrowsingContext from "./pages/BrowsingContext";
import { Blueline } from "./components/Blueline";
import { NotificationProvider } from "./components/notifications/NotificationProvider";
import { useNotify } from "./components/notifications/notificationContext";
import { DevToolbar } from "./components/DevToolbar";
import { appColorSchemeAtom } from "./features/modes/capabilities";
import { useModeIntegrity } from "./features/modes/useModeIntegrity";
import { useRuleIntegrity } from "./features/logic/useRuleIntegrity";
import { usePaletteIntegrity } from "./features/color-system/paletteIntegrity";
import { useDimensionArtifacts } from "./features/design-data/useDimensionArtifacts";
import { useEffect, useLayoutEffect, useRef } from "react";
import { persistenceIssuesAtom } from "./state/persist";
import { ColorPickerDefaultsProvider } from "./components/color-picker/ColorPickerDefaults";
import { colorOutputSettingsAtom } from "./features/color-system/state";
import { useComparisonWork } from "./features/changelog/useComparisonWork";
import { PreviewSurfaceProvider } from "./components/PreviewSurfaceProvider";

function ApplicationWork() {
  const storageIssues = useAtomValue(persistenceIssuesAtom);
  const notify = useNotify();
  const notified = useRef(new Set<string>());
  useEffect(() => {
    notified.current = new Set(
      [...notified.current].filter((issue) => storageIssues.includes(issue)),
    );
    for (const issue of storageIssues)
      if (!notified.current.has(issue)) {
        notify.error(issue);
        notified.current.add(issue);
      }
  }, [notify, storageIssues]);
  useModeIntegrity();
  useRuleIntegrity();
  usePaletteIntegrity();
  useDimensionArtifacts();
  useComparisonWork();
  return null;
}

function App() {
  const colorScheme = useAtomValue(appColorSchemeAtom);
  const colorOutput = useAtomValue(colorOutputSettingsAtom);
  useLayoutEffect(() => {
    const body = document.body;
    const previous = ["spectrum", "spectrum--light", "spectrum--dark"].map(
      (name) => ({
        name,
        enabled: body.classList.contains(name),
      }),
    );
    body.classList.add("spectrum");
    body.classList.toggle("spectrum--light", colorScheme === "light");
    body.classList.toggle("spectrum--dark", colorScheme === "dark");
    return () => {
      for (const { name, enabled } of previous)
        body.classList.toggle(name, enabled);
    };
  }, [colorScheme]);

  return (
    <Provider
      colorScheme={colorScheme}
      UNSAFE_className={`spectrum spectrum--${colorScheme}`}
    >
      <PreviewSurfaceProvider colorScheme={colorScheme}>
        <NotificationProvider>
          <ColorPickerDefaultsProvider gamut={colorOutput.authoringGamut}>
            <BrowsingContext />
          </ColorPickerDefaultsProvider>
          {import.meta.env.DEV && <Blueline />}
          {import.meta.env.DEV && <DevToolbar />}
          <ApplicationWork />
        </NotificationProvider>
      </PreviewSurfaceProvider>
    </Provider>
  );
}

export default App;
