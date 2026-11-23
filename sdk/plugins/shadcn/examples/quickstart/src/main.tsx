// Copyright 2026 Adobe. All rights reserved.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import "./index.css";

const buttonVariants = [
  ["Primary", "swc-Button"],
  ["Secondary", "swc-Button swc-Button--secondary"],
  ["Accent", "swc-Button swc-Button--accent"],
  ["Negative", "swc-Button swc-Button--negative"],
  ["Primary outline", "swc-Button swc-Button--primary swc-Button--outline"],
  ["Secondary outline", "swc-Button swc-Button--secondary swc-Button--outline"],
] as const;

const sizes = [
  ["S", "sizeS"],
  ["M", ""],
  ["L", "sizeL"],
  ["XL", "sizeXl"],
] as const;

function App() {
  const [dark, setDark] = useState(false);
  const toggle = () => {
    document.documentElement.classList.toggle("dark", !dark);
    setDark(!dark);
  };
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Spectrum in shadcn</h1>
        <Button variant="outline" onClick={toggle}>
          {dark ? "Light" : "Dark"} mode
        </Button>
      </header>
      <h2 className="text-sm font-semibold text-muted-foreground">
        shadcn components, Spectrum colors
      </h2>
      <section className="flex flex-wrap items-center gap-3">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button disabled>Disabled</Button>
      </section>
      <section className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
      </section>
      <section className="flex flex-wrap items-center gap-3">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </section>
      <h2 className="text-sm font-semibold text-muted-foreground">
        Spectrum Button and Action button (SWC gen 2 global CSS)
      </h2>
      <section className="flex flex-wrap items-center gap-3">
        {buttonVariants.map(([label, classes]) => (
          <button key={label} type="button" className={classes}>
            <span className="swc-Button-label">{label}</span>
          </button>
        ))}
        <button type="button" className="swc-Button" disabled>
          <span className="swc-Button-label">Disabled</span>
        </button>
      </section>
      <section className="flex flex-wrap items-center gap-3">
        {sizes.map(([size, modifier]) => (
          <button key={size} type="button" className={`swc-Button swc-Button--accent${modifier && ` swc-Button--${modifier}`}`}>
            <span className="swc-Button-label">{size}</span>
          </button>
        ))}
      </section>
      <section className="flex flex-wrap items-center gap-3">
        {sizes.map(([size, modifier]) => (
          <button key={size} type="button" className={`swc-ActionButton${modifier && ` swc-ActionButton--${modifier}`}`}>
            <span className="swc-ActionButton-label">{size}</span>
          </button>
        ))}
        <button type="button" className="swc-ActionButton swc-ActionButton--quiet">
          <span className="swc-ActionButton-label">Quiet</span>
        </button>
        <button type="button" className="swc-ActionButton" disabled>
          <span className="swc-ActionButton-label">Disabled</span>
        </button>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
