import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import importXPlugin from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import tseslintPlugin from "typescript-eslint";
import globals from "globals";

export default defineConfig([
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  importXPlugin.flatConfigs.typescript,
  // Default settings for import plugin flags imports for styled-components,  React, and lodash.
  // TODO work out how to re-enable defaults here, or whether we should actually want that.
  // importXPlugin.flatConfigs.recommended,
  globalIgnores([
    "public/",
    "es/",
    "type-declarations/",
    "src/aics-image-viewer/shared/utils/webgl-debug.js",
    "postcss.*.js",
    "vite.config.js",
    "node_modules/",
    ".env",
    "coverage/",
    "imageviewer/",
  ]),
  {
    // Flat config only lints .js/.mjs/.cjs by default; listing ts/tsx here opts them in.
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: {
      // In addition to `importXPlugin` above, we deliberately don't take the recommended config
      // for these plugins:
      "@typescript-eslint": tseslintPlugin.plugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      parser: tseslintPlugin.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      "import-x/extensions": [".ts", ".tsx", ".js", ".jsx"],
      "import-x/resolver-next": [
        createTypeScriptImportResolver({ alwaysTryTypes: true }),
      ],
    },
    rules: {
      "comma-style": [1, "last"],
      "curly": [1, "multi-line"],
      "eol-last": 1,
      "eqeqeq": 1,
      "new-cap": 1,
      "no-undef": "off",
      "no-array-constructor": 1,
      "no-mixed-spaces-and-tabs": 1,
      "no-new-object": 1,
      "no-redeclare": 0,
      "no-shadow-restricted-names": 1,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "args": "none", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" },
      ],
      "no-unused-vars": 0, // Rely on typescript-eslint rule above
      "@typescript-eslint/explicit-function-return-type": ["error", { "allowExpressions": true }],
      "@typescript-eslint/typedef": ["error", { "parameter": true }],
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-import-type-side-effects": "warn",
      "radix": 1,
      "react/jsx-uses-vars": 1,
      "react/no-deprecated": 0,
      "react/prop-types": 0,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": ["warn", { "additionalHooks": "useImageEffect" }],
      "semi": 2,
      "space-before-blocks": [1, "always"],
      "import-x/no-restricted-paths": [
        "error",
        {
          "zones": [
            // Do not allow library package to import from the web app
            { "target": "./src", "from": "./website" },
            // TODO: Only allow website to import from public exports of the library
            // { "target": "./website", "from": "./src/aics-image-viewer", "except": ["./src"] },
          ],
        },
      ],
    },
  },
]);
