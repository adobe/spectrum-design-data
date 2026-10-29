// Copyright 2026 Adobe. All rights reserved.
import { useEffect } from "react";
import "./blueline.min.js";

declare global {
  interface Window {
    blueline?: {
      init: (config?: object) => {
        destroy: () => void;
        refresh: () => void;
        toggle: () => void;
        show: () => void;
        hide: () => void;
      };
    };
  }
}

export function Blueline() {
  useEffect(() => {
    const instance = window.blueline?.init();
    instance?.hide();
    return () => instance?.destroy();
  }, []);

  return null;
}
