import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [".next/**", "**/.next/**", "node_modules/**", "**/node_modules/**", "dist/**", "**/dist/**", "coverage/**", "**/coverage/**"]
  },
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "AssignmentExpression[left.type='MemberExpression'][left.property.name='innerHTML']",
          message: "Do not assign untrusted HTML into the app DOM; use the sanitizer and sandbox preview path."
        },
        {
          selector: "AssignmentExpression[left.type='MemberExpression'][left.property.value='innerHTML']",
          message: "Do not assign untrusted HTML into the app DOM; use the sanitizer and sandbox preview path."
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: "Do not insert untrusted HTML into the app DOM; use the sanitizer and sandbox preview path."
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Do not use React dangerouslySetInnerHTML for generated/imported artifacts; render them only through the sandbox preview path."
        },
        {
          selector: "Property[key.name='dangerouslySetInnerHTML']",
          message: "Do not use dangerouslySetInnerHTML for generated/imported artifacts; render them only through the sandbox preview path."
        }
      ]
    }
  }
];
