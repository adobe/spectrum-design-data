// Copyright 2026 Adobe. All rights reserved.
import { Button, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import {
  INSTALL_BENEFITS,
  INSTALL_STEPS,
  type InstallBrowser,
} from "../features/app-status/install";
import type { AppColorScheme } from "../features/modes/capabilities";
import { spectrumChromeClassName } from "../utils/spectrumChrome";

export interface InstallAppDialogProps {
  isOpen: boolean;
  canPromptInstall: boolean;
  browser: InstallBrowser;
  colorScheme: AppColorScheme;
  onInstall: () => void;
  onClose: () => void;
}

export function InstallAppDialog({
  isOpen,
  canPromptInstall,
  browser,
  colorScheme,
  onInstall,
  onClose,
}: InstallAppDialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      isDismissable
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal>
        <Dialog
          aria-labelledby="install-app-title"
          className={`${spectrumChromeClassName(colorScheme)} ${style({ display: "flex", flexDirection: "column", gap: 16, padding: 16, width: 360 })}`}
        >
          <Heading id="install-app-title" slot="title">
            Install Spectrum Studio
          </Heading>
          <Text>Use Studio as a desktop app:</Text>
          <ul>
            {INSTALL_BENEFITS.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
          {!canPromptInstall && (
            <Text data-install-steps={browser}>{INSTALL_STEPS[browser]}</Text>
          )}
          <div
            className={style({
              display: "flex",
              gap: 8,
              justifyContent: "end",
            })}
          >
            <Button variant="secondary" onPress={onClose}>
              {canPromptInstall ? "Maybe later" : "Close"}
            </Button>
            {canPromptInstall && (
              <Button variant="accent" onPress={onInstall}>
                Install app
              </Button>
            )}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
