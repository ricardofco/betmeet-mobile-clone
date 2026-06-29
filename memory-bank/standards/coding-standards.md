# Coding Standards

> Applied during the Construction **Implement** stage.

## Skill precedence (read first)

These standards reflect **project decisions** and override any installed skill:

1. When a skill recommends something that **contradicts** these standards (or `tech-stack.md`), the **standards win**. Example: a skill suggesting Metro config — ignore it; we use Re.Pack.
2. When a skill **complements** these standards (e.g. an FPS optimization), follow it.
3. If a skill's advice would break an architectural rule (e.g. federation boundaries, native-module placement), do **not** apply it silently — raise it with the user.

## Performance skills — delimited triggers (avoid overlap)

These skills cover overlapping ground. Use them at **different moments**:

| Skill | When | Role |
|---|---|---|
| `vercel-react-native-skills` | While **writing** RN components | Prescriptive RN ruleset (30+ rules). The default. |
| `react-native-best-practices` | While **debugging** a measured problem | Diagnostic/profiling (jank, leaks, frame drops, TTI). |
| `vercel-react-best-practices` | While writing **React-general** logic | Request waterfalls, re-renders, data-fetching patterns. Complements the RN rules. |
| `vercel-composition-patterns` | While designing **reusable components** | Compound components, render props, avoid boolean-prop-hell. |

Do not invoke the two RN perf skills for the same task: authoring code → Vercel RN rules; chasing a perf bug → best-practices.

## Baseline rules (from the Vercel ruleset, summarized)
- Virtualize lists with **FlashList**; never map large arrays into a ScrollView.
- **Memoize** list items and stable callbacks; avoid inline objects/functions in hot render paths.
- Animate **only `transform` and `opacity`** (drive with Reanimated on the UI thread).
- Prefer **native navigators** over JS-driven navigation.
- Keep the host bundle lean — push heavy/optional features into **federated remote chunks** (Re.Pack).
- Pin shared singletons (react, react-native, nav, state) across federated chunks.

## TypeScript / general
- Strict mode on (`@react-native/typescript-config`). No `any` in domain code.
- Domain logic (Model stage output) lives separate from UI and is unit-tested.

## Project lint/format config (detected)
- ESLint: `@react-native/eslint-config` (`.eslintrc.js`), run via `npm run lint`.
- Prettier: `arrowParens: avoid`, `singleQuote: true`, `trailingComma: all` (`.prettierrc.js`).
- Keep new code consistent with these — do not introduce a competing formatter config.
