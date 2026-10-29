// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { showAnalysisDetails } from "./analysisNavigation";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { join } from "node:path";
import { appRoot } from "../../scripts/design-data-loader";

// Run after pnpm build: the production client must not fabricate a local assessment.
test("Hosted Analysis exposes unavailable state without filesystem requests or runtime errors", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  const referenceRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/__design-data/"))
      referenceRequests.push(request.url());
  });
  const reservation = createServer();
  reservation.listen(0, "localhost");
  await once(reservation, "listening");
  const address = reservation.address();
  if (!address || typeof address === "string")
    throw new Error("Cannot reserve preview port.");
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve())),
  );
  const server = spawn(
    process.execPath,
    [
      join(appRoot, "node_modules/vite/bin/vite.js"),
      "preview",
      "--host",
      "localhost",
      "--port",
      String(port),
      "--strictPort",
    ],
    { cwd: appRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
  let logs = "";
  server.stdout.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });
  server.stderr.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });
  try {
    await expect
      .poll(
        async () => {
          if (server.exitCode !== null) throw new Error(logs);
          try {
            return (
              await page.request.get(`https://localhost:${port}`)
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 15_000 },
      )
      .toBe(200);
    await page.goto(`https://localhost:${port}`);
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Analysis", exact: true })
      .click();
    await showAnalysisDetails(page);
    await expect(page.getByRole("status")).toContainText(
      "unavailable in this hosted build",
    );
    await page.getByRole("button", { name: /Assessment plane/ }).click();
    await page
      .getByRole("option", { name: "Current-state audit", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "JSON", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Markdown", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("grid", { name: "Analysis findings" }),
    ).toHaveCount(0);
    expect(referenceRequests).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    const exit = server.exitCode === null ? once(server, "exit") : undefined;
    server.kill("SIGTERM");
    if (exit) await exit;
  }
});
