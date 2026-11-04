// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Tooltip, TooltipTrigger } from "@react-spectrum/s2";
import Cloud from "@react-spectrum/s2/icons/Cloud";
import CloudStateInProgress from "@react-spectrum/s2/icons/CloudStateInProgress";
import MediaOffline from "@react-spectrum/s2/icons/MediaOffline";
import {
  APP_STATUS_MESSAGES,
  pressAppStatus,
  type AppStatus,
} from "../features/app-status/status";
import { appStatusStore } from "../features/app-status/store";
import { useAppStatus } from "../features/app-status/useAppStatus";

const ICONS: Record<AppStatus, typeof Cloud> = {
  offline: MediaOffline,
  update: CloudStateInProgress,
  online: Cloud,
};

export function AppStatusButton() {
  const status = useAppStatus();
  const Icon = ICONS[status];
  const message = APP_STATUS_MESSAGES[status];

  return (
    <TooltipTrigger>
      <ActionButton
        isQuiet
        aria-label={message}
        data-status={status}
        onPress={() => pressAppStatus(status, appStatusStore.applyUpdate)}
      >
        <Icon />
      </ActionButton>
      <Tooltip>{message}</Tooltip>
    </TooltipTrigger>
  );
}
