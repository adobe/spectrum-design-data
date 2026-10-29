// Copyright 2026 Adobe. All rights reserved.
import type { ReactNode } from "react";
import {
  valuePreviewPresentation,
  type PreviewTextOptions,
  type ValuePreviewDescriptor,
} from "../../features/tokens/valuePreview";
import { TextValuePreview } from "./TextValuePreview";
import { IconValuePreview } from "./IconValuePreview";
import "./ValuePreview.css";

export interface ValuePreviewProps extends PreviewTextOptions {
  preview: ValuePreviewDescriptor;
  label?: string;
  large?: boolean;
  icon?: ReactNode;
}

export function ValuePreview({
  preview,
  label,
  large = false,
  icon,
  ...textOptions
}: ValuePreviewProps) {
  const presentation = valuePreviewPresentation(preview, textOptions);
  let error =
    presentation.status === "unavailable" ? presentation.message : undefined;
  if (presentation.status === "ready" && typeof CSS !== "undefined") {
    for (const [property, value] of Object.entries(presentation.styles)) {
      if (
        typeof value === "string" &&
        !CSS.supports(
          property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
          value,
        )
      ) {
        error = `The browser cannot preview this ${property.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)} value.`;
      }
    }
  }
  const kind = preview.kind;
  const styles =
    presentation.status === "ready" ? presentation.styles : undefined;
  const isText = [
    "text-color",
    "font-size",
    "font-weight",
    "font-family",
    "line-height",
  ].includes(kind);
  const isIcon = kind === "icon-color" || kind === "icon-size";
  return (
    <span
      className={`valuePreview${large ? " valuePreviewLarge" : ""}`}
      data-value-preview={kind}
      data-preview-unavailable={error ? true : undefined}
      role={label ? "img" : undefined}
      aria-label={label ? `${label}${error ? `: ${error}` : ""}` : undefined}
      aria-hidden={!label && !error ? true : undefined}
      title={error ?? label}
    >
      {error ? (
        <span
          className="valuePreviewUnavailable"
          role={label ? undefined : "img"}
          aria-label={label ? undefined : error}
        >
          Unavailable
        </span>
      ) : isText ? (
        <TextValuePreview {...textOptions} style={styles} />
      ) : isIcon ? (
        <IconValuePreview icon={icon} style={styles} />
      ) : (
        <span
          aria-hidden="true"
          className={`valuePreviewShape valuePreviewShape-${kind}`}
          style={styles}
        />
      )}
    </span>
  );
}
