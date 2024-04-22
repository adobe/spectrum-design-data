import test from "ava";
import { glob } from "glob";
import { readFile } from "fs/promises";
import { validateWorkflow } from "@action-validator/core";

test("validate github workflow config files", async (t) => {
  const fileNames = await glob(".github/workflows/**/*.yml");
  const result = Promise.all(
    fileNames.map(async (fileName) => {
      const workflowSource = await readFile(fileName, "utf8");
      const state = validateWorkflow(workflowSource);
      return state.errors;
    }),
  ).then((results) => {
    return results.reduce((acc, curr) => [...acc, ...curr], []);
  });
  // const fileNames = await glob("src/**/*.json");
  t.deepEqual(await result, []);
  // const workflowSource = readFileSync("workflow.yml", "utf8");
  // const state = validator.validateWorkflow(workflowSource);
  // const isValid = state.errors.length === 0;
  // const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
  // const fileNames = await glob("src/**/*.json");
  // t.deepEqual(manifest, fileNames);
});

// Validate Workflow
