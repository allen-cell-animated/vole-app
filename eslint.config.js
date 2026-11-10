import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import importXPlugin from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import tseslint from "typescript-eslint";
import globals from "globals";
// NOTE: these plugins are half of the plugins included in the `@eslint-react/eslint-plugin`
// bundle; the other half (`react-rsc`, `react-web-api`, `react-naming-convention`) aren't
// historically enforced in this project.
import reactX from "eslint-plugin-react-x";
import reactJsx from "eslint-plugin-react-jsx";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  js.configs.recommended,
  reactX.configs["recommended-typescript"],
  reactJsx.configs.recommended,
  reactDom.configs.recommended,
  importXPlugin.flatConfigs.typescript,
  // Default settings for import plugin flags imports for styled-components,  React, and lodash.
  // TODO work out how to re-enable defaults here, or whether we should actually want that.
  // importXPlugin.flatConfigs.recommended,
  globalIgnores([
    "public/",
    "es/",
    "type-declarations/",
    "packages/app/src/shared/utils/webgl-debug.js",
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
    // In addition to `importXPlugin` above, we deliberately don't take the recommended config
    // for these plugins:
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      // When this plugin was added to the project, it defined just two rules. Since then, the
      // React team has introduced React Compiler, which automatically optimizes components that
      // strictly adhere to React's rules, and added the compiler's static checks for adherence to
      // this plugin. For now, we're sticking to just the two original rules.
      // TODO enable this plugin's default rules, fix the errors, then add React Compiler.
      // see #614 and https://react.dev/learn/react-compiler.
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
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
      "react-hooks/exhaustive-deps": ["warn", { "additionalHooks": "useImageEffect" }],
      "react-hooks/rules-of-hooks": "error",
      // As of v5.30.2, `react-x` includes vendored copies of the two "original" `react-hooks`
      // rules above. `react-hooks` is the official implementation, so we defer to it.
      "react-x/exhaustive-deps": "off",
      "react-x/rules-of-hooks": "off",
      // These rules *reimplement* `react-hooks`'s newer React Compiler rules. Even if we were
      // checking these, we'd want to enable the `react-hooks` versions instead.
      "react-x/error-boundaries": "off",
      "react-x/purity": "off",
      "react-x/set-state-in-effect": "off",
      "react-x/set-state-in-render": "off",
      "react-x/static-components": "off",
      "react-x/unsupported-syntax": "off",
      "react-x/use-memo": "off",
      // These `react-x` rules are unique and turned off on purpose. We currently have a number of
      // violations of these rules that are not critical to fix, though fixing them and enabling
      // these rules would likely be a genuine quality improvement.
      "react-x/no-array-index-key": "off",
      "react-x/use-state": "off",
      "semi": 2,
      "space-before-blocks": [1, "always"],
      "import-x/no-restricted-paths": [
        "error",
        {
          "zones": [
            // Do not allow library package to import from the web app
            { "target": "./packages/app", "from": "./packages/website" },
            // TODO: Only allow website to import from public exports of the library
            // { "target": "./packages/website", "from": "./packages/app/src", "except": ["./packages/app/src"] },
          ],
        },
      ],
    },
  },
]);
