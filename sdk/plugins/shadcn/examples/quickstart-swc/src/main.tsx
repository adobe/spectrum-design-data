// Copyright 2026 Adobe. All rights reserved.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const buttonVariants = [
  ["Default", "swc-Button"],
  ["Secondary", "swc-Button swc-Button--secondary"],
  ["Accent", "swc-Button swc-Button--accent"],
  ["Negative", "swc-Button swc-Button--negative"],
  ["Primary outline", "swc-Button swc-Button--primary swc-Button--outline"],
  ["Secondary outline", "swc-Button swc-Button--secondary swc-Button--outline"],
] as const;

function App() {
  const [dark, setDark] = useState(false);
  const toggle = () => {
    document.documentElement.classList.toggle("dark", !dark);
    document.documentElement.style.colorScheme = dark ? "light" : "dark";
    setDark(!dark);
  };
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 32,
        display: "grid",
        gap: 24,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 20 }}>Spectrum in shadcn: SWC global CSS</h1>
        <button
          type="button"
          className="swc-Button swc-Button--secondary"
          onClick={toggle}
        >
          <span className="swc-Button-label">
            {dark ? "Light" : "Dark"} mode
          </span>
        </button>
      </header>
      <section
        data-demo="button-variants"
        style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
      >
        {buttonVariants.map(([label, cls]) => (
          <button key={label} type="button" className={cls}>
            <span className="swc-Button-label">{label}</span>
          </button>
        ))}
        <button type="button" className="swc-Button" disabled>
          <span className="swc-Button-label">Disabled</span>
        </button>
        <a href="#" className="swc-Button swc-Button--accent">
          <span className="swc-Button-label">As link</span>
        </a>
      </section>
      <section
        data-demo="button-sizes"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        {["S", "", "L", "Xl"].map((s) => (
          <button
            key={s}
            type="button"
            className={`swc-Button swc-Button--accent${s ? ` swc-Button--size${s}` : ""}`}
          >
            <span className="swc-Button-label">{s || "M"}</span>
          </button>
        ))}
      </section>
      <section
        data-demo="action-buttons"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        {["Xs", "S", "", "L", "Xl"].map((s) => (
          <button
            key={s}
            type="button"
            className={`swc-ActionButton${s ? ` swc-ActionButton--size${s}` : ""}`}
          >
            <span className="swc-ActionButton-label">{s || "M"}</span>
          </button>
        ))}
        <button
          type="button"
          className="swc-ActionButton swc-ActionButton--quiet"
        >
          <span className="swc-ActionButton-label">Quiet</span>
        </button>
        <button type="button" className="swc-ActionButton" disabled>
          <span className="swc-ActionButton-label">Disabled</span>
        </button>
      </section>
      <p>
        A plain <a href="#">link</a> picks up the global link style.
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
