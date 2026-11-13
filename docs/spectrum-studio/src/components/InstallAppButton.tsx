// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Tooltip, TooltipTrigger } from "@react-spectrum/s2";
import DeviceDesktop from "@react-spectrum/s2/icons/DeviceDesktop";
import { useAtomValue } from "jotai";
import { installBrowser } from "../features/app-status/install";
import { appStatusStore } from "../features/app-status/store";
import { useAppStatusSnapshot } from "../features/app-status/useAppStatus";
import { appColorSchemeAtom } from "../features/modes/capabilities";
import { InstallAppDialog } from "./InstallAppDialog";

// Hidden inside the installed app. Uses the browser's own install prompt when
// available, otherwise opens a dialog with steps for this browser.
export function InstallAppButton() {
  const { isInstalled, canPromptInstall, installDialogOpen } =
    useAppStatusSnapshot();
  const colorScheme = useAtomValue(appColorSchemeAtom);

  return (
    <>
      {!isInstalled && (
        <TooltipTrigger>
          <ActionButton
            isQuiet
            aria-label="Install app"
            onPress={() => {
              if (!appStatusStore.promptInstall())
                appStatusStore.openInstallDialog();
            }}
          >
            <DeviceDesktop />
          </ActionButton>
          <Tooltip>Install Studio as a desktop app</Tooltip>
        </TooltipTrigger>
      )}
      <InstallAppDialog
        isOpen={installDialogOpen}
        canPromptInstall={canPromptInstall}
        browser={installBrowser(navigator.userAgent)}
        colorScheme={colorScheme}
        onInstall={() => appStatusStore.promptInstall()}
        onClose={() => appStatusStore.closeInstallDialog()}
      />
    </>
  );
}
