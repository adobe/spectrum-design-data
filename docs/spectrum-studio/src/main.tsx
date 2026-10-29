// Copyright 2026 Adobe. All rights reserved.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initializeAuthoringPersistence } from "./features/edit-session/persistence";

initializeAuthoringPersistence();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
