// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  Content,
  Heading,
  InlineAlert,
  ProgressCircle,
  Skeleton,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useState, type ReactNode } from "react";

const container = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  minHeight: 0,
  minWidth: 0,
});
const overlay = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
});
const backdrop = style({
  position: "absolute",
  inset: 0,
  backgroundColor: "layer-1",
  opacity: 60,
});

export interface DerivedContentBoundaryProps {
  state: "pending" | "ready" | "unavailable";
  label: string;
  children: ReactNode;
  presentation?: "overlay" | "skeleton";
  error?: string;
  onRetry?: () => void;
}

export function DerivedContentBoundary({
  state,
  label,
  children,
  presentation = "overlay",
  error,
  onRetry,
}: DerivedContentBoundaryProps) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (state !== "pending") return;
    const timer = setTimeout(() => setRevealed(true), 100);
    return () => {
      clearTimeout(timer);
      setRevealed(false);
    };
  }, [state]);
  const pending = state === "pending" && revealed;
  return (
    <div
      className={container}
      aria-busy={state === "pending" || undefined}
      data-derived-state={state}
    >
      <Skeleton isLoading={pending && presentation === "skeleton"}>
        {children}
      </Skeleton>
      {pending && presentation === "overlay" && (
        <div className={overlay}>
          <div className={backdrop} />
          <ProgressCircle
            styles={style({ position: "relative" })}
            isIndeterminate
            aria-label={label}
          />
        </div>
      )}
      {state === "unavailable" && (
        <InlineAlert variant="negative">
          <Heading>Output unavailable</Heading>
          <Content>
            {error ?? "The requested output could not be generated."}
          </Content>
          {onRetry && (
            <Button variant="secondary" onPress={onRetry}>
              Retry
            </Button>
          )}
        </InlineAlert>
      )}
    </div>
  );
}
