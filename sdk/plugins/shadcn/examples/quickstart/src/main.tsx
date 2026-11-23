// Copyright 2026 Adobe. All rights reserved.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import "./index.css";

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
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
