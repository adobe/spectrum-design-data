export default {
  files: ["test/**/*.test.js"],
  verbose: true,
  environmentVariables: {
    NODE_ENV: "test",
  },
  timeout: "30s",
};
