/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleNameMapper: {
    "^@raycast/api$": "<rootDir>/tests/__mocks__/@raycast/api.ts",
  },
  collectCoverageFrom: ["src/lib/**/*.ts"],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};
