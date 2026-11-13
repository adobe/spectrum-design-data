// Copyright 2026 Adobe. All rights reserved.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initializeAuthoringPersistence } from "./features/edit-session/persistence";
import { initializeAppStatus } from "./features/app-status/serviceWorker";
import { initializeWindowSize } from "./features/app-status/windowSize";

if (import.meta.env.DEV) performance.mark("studio:startup-data");
initializeAuthoringPersistence();
initializeAppStatus();
initializeWindowSize();
if (import.meta.env.DEV)
  performance.measure("studio:startup-data", "studio:startup-data");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
