# Contributing

## Setup

```bash
npm install
# create .env — see the Environment table in docs/README.md
npm run verify:ai     # confirms your Gemini key and models
npm run db:init       # creates tables, if DATABASE_URL is set
npm run dev           # http://localhost:3000
```

If `npm install` fails with `ERESOLVE` mentioning SvelteKit or Vite, see the `--legacy-peer-deps`
entry in [decisions.md](decisions.md).

If the database times out with `ETIMEDOUT`, your network may block port 5432. Check with
`Test-NetConnection <host> -Port 5432` (Windows) or try another network.

## Working rules

1. **Before a pull request:** `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build`
   must all pass. CI runs the same checks.
2. **Never commit secrets.** `.env` is gitignored. Check `git status` before pushing.
3. **Never import `lib/auth.ts` or `lib/llm.ts` from a client component.** They hold secrets.
   Browser code uses `lib/auth-client.ts`.
4. **Keep `postcss.config.js` as CommonJS.** An ignored PostCSS config produces an unstyled site
   with a passing build.
5. **Keep Check, Fire Drill and Helper usable without signing in.**
6. **Accessibility is not optional:** body text ≥ 18px, tap targets ≥ 56px, no flashing faster
   than 3 times per second, and every animation respects `prefers-reduced-motion`.
7. **Never invent results.** Docs record only what was actually run, with the date.
8. **Update `docs/`** — PROGRESS, decisions, testing and the learning log — with each milestone.
