module.exports = {
  preset: "ts-jest",
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
    // target es2020+ so BigInt literals (used by zarrita) transform correctly;
    // esbuild-jest otherwise defaults to es2018, which predates them.
    "^.+\\.(js|jsx)$": ["esbuild-jest", { target: "es2020" }],
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
    // zarrita, @zarrita/storage and numcodecs are ESM-only packages that expose
    // only an "import" export condition, which Jest's resolver doesn't pick up.
    // Map them (and the subpaths they use) directly to their entry files so
    // Jest can resolve and transform them. See the OmeZarrLoader in @aics/vole-core.
    "^zarrita$": "<rootDir>/node_modules/zarrita/dist/src/index.js",
    "^@zarrita/storage$": "<rootDir>/node_modules/@zarrita/storage/dist/src/index.js",
    "^@zarrita/storage/(.*)$": "<rootDir>/node_modules/@zarrita/storage/dist/src/$1.js",
    "^numcodecs$": "<rootDir>/node_modules/numcodecs/dist/index.js",
    "^numcodecs/(.*)$": "<rootDir>/node_modules/numcodecs/dist/$1.js",
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/three/examples/(?!jsm/)"],
};
