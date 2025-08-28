export default {
  files: ["test/**/*.test.js"],
  verbose: true,
  environmentVariables: {
    NODE_ENV: "test",
    ACTIONS_STEP_DEBUG: "false",
  },
  timeout: "30s",
};
