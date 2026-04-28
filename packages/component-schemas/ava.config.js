export default {
  files: ["test/**/*.test.js"],
  environmentVariables: {
    NODE_ENV: "test",
  },
  verbose: true,
  failFast: false,
  failWithoutAssertions: true,
};
