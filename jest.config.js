module.exports = {
  preset: "ts-jest",
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
    "^.+\\.(js|jsx)$": "esbuild-jest",
  },
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    storageQuota: 5000,
  },
  testPathIgnorePatterns: ["<rootDir>/es/"],

  // From https://jestjs.io/docs/webpack#mocking-css-modules
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/scripts/jestAssetTransformer.js",
    "\\.(css|less)$": "identity-obj-proxy",
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/three/examples/(?!jsm/)"],
};
