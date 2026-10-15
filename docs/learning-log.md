# Learning log

Line-by-line explanations of what was built, in the order it was built.

---

## 15 October 2026 — Milestone 1: auth backbone

### `lib/db.ts` — one word changed

```ts
export function getPool(): Pool | null {
```

Added `export`. Before, `getPool` was private to this file. Now `lib/auth.ts` can reuse the same
Postgres connection pool, including its Neon SSL setting, instead of building a second one.

**Pool:** a set of open database connections kept ready for reuse. Opening a fresh connection for
every request is slow; a pool hands out an existing one.

### `lib/auth.ts` — the auth engine (server only)

```ts
export const auth = betterAuth({
  database: getPool() ?? new Pool(),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
});
```

- **`betterAuth({...})`** builds one object, `auth`, that can sign people up, sign them in, sign
  them out and read sessions.
- **`getPool() ?? new Pool()`** — `??` is the *nullish coalescing* operator: use the left side
  unless it is `null` or `undefined`, otherwise use the right side. `getPool()` returns `null` when
  `DATABASE_URL` is missing (as in CI). An empty `new Pool()` doesn't connect until its first
  query, so the **build still passes**; sign-in would fail at runtime, which is correct — auth
  genuinely needs a database.
- **`emailAndPassword: { enabled: true }`** turns on email accounts. Better Auth **hashes**
  passwords: a one-way scramble, so the real password is never stored.
- **`process.env.GOOGLE_CLIENT_ID ?? ""`** — read the env var, or use an empty string if it isn't
  set. This keeps TypeScript satisfied (the type is a plain `string`) without the `!` assertion,
  which would claim the value exists when it might not.
- **Not passed:** `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. Better Auth reads them from the
  environment itself.

**Why this file must never reach the browser:** it holds the database connection and, through env
vars, the Google client secret.

### `app/api/auth/[...all]/route.ts` — one route, every auth URL

```ts
export const runtime = "nodejs";
export const { GET, POST } = toNextJsHandler(auth);
```

- **`[...all]`** is a *catch-all* route. A folder named this way matches any path below
  `/api/auth/`, so this one file answers `/api/auth/sign-up/email`, `/api/auth/get-session`,
  `/api/auth/callback/google` and the rest.
- **`runtime = "nodejs"`** — `pg` needs Node.js APIs that the lighter Edge runtime lacks. Every
  other route in this project sets it too.
- **`toNextJsHandler(auth)`** is an *adapter*: it converts Better Auth's request handler into the
  `GET` and `POST` functions Next.js expects. The official docs pass `auth` itself; some tutorials
  wrongly pass `auth.handler`.
- **`export const { GET, POST } = ...`** is *destructuring*: pull `GET` and `POST` out of the
  returned object and export each under the same name.

### `lib/auth-client.ts` — the browser side

```ts
"use client";
export const authClient = createAuthClient();
export const { signIn, signUp, signOut, useSession } = authClient;
```

- **`"use client"`** marks the file as browser code in the App Router.
- **`createAuthClient()`** makes helpers that call `/api/auth/*`. No `baseURL` is needed because
  the API is on the same origin as the page.
- **`useSession()`** is a React *hook*: when the login state changes, every component using it
  re-renders. M2 will use it to swap "Sign in" for an avatar.

### What went wrong, and what it taught

1. **`npm install` failed with `ERESOLVE`.** Better Auth lists SvelteKit as an *optional* peer
   dependency; SvelteKit 3 wants Vite 8 while Vitest uses Vite 5. npm still tries to reconcile
   optional peers. `--legacy-peer-deps` skipped that check for one install, then plain
   `npm install` and `npm ci` were both re-run to prove CI is unaffected.
2. **The database timed out.** The error message was empty because it was an `AggregateError`;
   the real cause was nested inside: `ETIMEDOUT` on port 5432. Testing port 443 (worked) against
   5432 (failed), and checking that production still reached Neon, proved **the local network
   blocks the Postgres port** — not the code, not Neon.
3. **The schema CLI needs a live database.** It generates Postgres SQL by diffing against a real
   connection. Hand-writing the tables from memory was rejected: a wrong column would break
   sign-in at runtime in a hard-to-trace way.
