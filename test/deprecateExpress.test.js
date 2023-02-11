import augmentExpressTokens from "../tasks/lib/augmentExpressTokens.js";

const fixture = {
  foo: {
    express: {
      value: "bar",
    },
  },
  "corner-radius-100": {
    sets: {
      spectrum: {
        sets: {
          desktop: {
            value: "4px",
          },
          mobile: {
            value: "5px",
          },
        },
      },
      express: {
        sets: {
          desktop: {
            value: "6px",
          },
          mobile: {
            value: "8px",
          },
        },
      },
    },
  },
};

test("Deprecate Express should add deprecation metadata to Express tokens", () => {
  expect(augmentExpressTokens(fixture)).toMatchSnapshot();
});
