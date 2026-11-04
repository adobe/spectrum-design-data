// Copyright 2026 Adobe. All rights reserved.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initializeAuthoringPersistence } from "./features/edit-session/persistence";
import { initializeAppStatus } from "./features/app-status/serviceWorker";

initializeAuthoringPersistence();
initializeAppStatus();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
