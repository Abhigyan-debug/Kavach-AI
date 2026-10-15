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

---

## 15 October 2026 — Milestone 4: Motion + anime.js foundation

### The rule that makes two libraries workable
**One element, one library.** Motion handles anything tied to React state; anime.js handles SVG
line drawing. If both animated the same element they would fight over its `transform`.

### `app/components/MotionProvider.tsx`

```tsx
<MotionConfig reducedMotion="user">
  <LazyMotion features={domAnimation} strict>{children}</LazyMotion>
</MotionConfig>
```

- **`LazyMotion features={domAnimation}`** — components use the small `m.div` instead of the
  ~34 KB `motion.div`, and only the features we name are loaded: entrances, hover and tap.
- **`strict`** — using the heavy `motion` component inside this tree throws an error, so the size
  budget can't quietly drift.
- **`reducedMotion="user"`** — every Motion animation obeys the OS "reduce motion" setting.
- **Provider pattern / React context** — one wrapper makes a setting available to every component
  inside it without passing it down by hand.

Placed in `app/layout.tsx`. The layout is a **server component** and `MotionProvider` is a
**client component**; the pages passed in as `children` stay server-rendered.

### `app/components/hud/HudFrame.tsx` (Motion)

Four `m.span` corners with `initial={{ opacity: 0, x, y }}` and
`whileInView={{ opacity: 1, x: 0, y: 0 }}`, `viewport={{ once: true }}`.

- **`whileInView`** — animate when the element scrolls into view; **`once: true`** — only the
  first time.
- Only `transform` (x, y) and `opacity` change: the browser moves an already-drawn layer on the
  GPU, without recalculating layout or repainting.

### `app/components/hud/CircuitTrace.tsx` (anime.js)

```ts
const { animate, svg, stagger, utils } = await import("animejs");
const lines = svg.createDrawable(el.querySelectorAll("path"));
utils.set(lines, { draw: "0 0" });   // nothing drawn
el.style.opacity = "1";              // only now reveal the SVG
animate(lines, { draw: "0 1", duration: 1100, delay: stagger(140) });
```

- **`await import("animejs")`** — a *dynamic import*. The bundler puts anime.js in a separate file
  that downloads only when this line runs. A normal top-of-file `import` would put it in the page's
  initial download.
- **`IntersectionObserver`** — the browser reports when the SVG becomes visible, which is when the
  import runs. On phones the SVG is `display:none`, never visible, so anime.js is never downloaded.
- **`svg.createDrawable`** — sets `pathLength="1000"` on each path so every line counts as 1000
  units long, then animates `stroke-dasharray`. `"0 0"` means nothing visible, `"0 1"` the full line.
- **Hide first, then reveal** — without `utils.set(... "0 0")` before showing the SVG, you'd see
  the finished lines flash before they disappear and redraw.
- **`stagger(140)`** — each line starts 140 ms after the previous one.
- **Cleanup** — the effect returns a function that disconnects the observer and calls `revert()`
  on each animation. Leaving the page then leaks nothing.
- **`cancelled` flag** — if you leave while the library is still downloading, the animation is
  never started on a component that no longer exists.

### What went wrong, and what it taught

1. **+47 kB, nearly double the budget.** Cause: `import { m } from "motion/react"`. That entry
   point is a *barrel* (one file re-exporting everything), and the bundler couldn't drop Motion's
   layout engine from it. **Fix:** `import * as m from "motion/react-m"`. Result: 168 → 139 kB.
   `import type { Variants } from "motion/react"` stays: type-only imports are erased at compile
   time and cost nothing.
2. **A false alarm in my own check.** I searched the page's bundle for `createDrawable` to detect
   anime.js, but my component's code contains that word too. Lesson: search for something only the
   library itself contains (its definition, `createDrawable:function`), and sanity-check against
   size: a 6.4 kB chunk cannot hold a 15.6 kB library.
3. **Contaminated measurements.** A 938 ms delay and a line "stuck at 89%" were caused by someone
   clicking in the test browser at the same time. Lesson: run timing tests as one uninterrupted
   step, and record the page URL so interference shows up in the result.

---

## 15 October 2026 — Milestone 5: robotics theme

### Re-theming by changing tokens, not components
Every component uses named colours (`bg-base`, `text-muted`, `border-edge`). Changing their values
once in `tailwind.config.ts` re-themes the whole site. Each new pair was checked against the WCAG
contrast formula before shipping.

### The boot intro (`app/components/hud/BootIntro.tsx`)

**Problem 1 — no flash.** React only runs after the page has loaded, so an intro started from React
would show the page for a moment, then cover it. Fix: a tiny inline script in `layout.tsx` runs
**before first paint** and sets `data-intro="on"` on `<html>`. CSS shows the overlay only when that
attribute exists, so it's there from the very first frame.

**Problem 2 — hydration.** React compares its own HTML with the page. The script changed `<html>`
first, which would trigger a mismatch warning. `suppressHydrationWarning` on `<html>` says "this
one difference is expected"; it does not apply to anything inside.

**Problem 3 — never trap anyone.** If JavaScript fails, the overlay would cover the page forever.
A CSS animation with a 5-second delay sets `visibility: hidden` regardless.

**The sequence** (Motion variants and springs):
1. `m.path` animates `pathLength` from 0 to 1 — the shield outline draws itself.
2. The solid mark scales in with a spring.
3. Letters grow in with `staggerChildren`; a stiff, slightly under-damped spring makes each one
   overshoot and settle, like a servo.
4. After 1.5s the code measures the intro logo and the header logo with `getBoundingClientRect()`,
   then animates `x`, `y` and `scale` so one lands exactly on the other.

**Why it lands within 1px:** the intro logo is built at exactly 2.5x the header logo (90px shield,
60px text, 20px gap vs 36 / 24 / 8). Same proportions means one scale factor fits everything.

### Growing words (`GrowWords.tsx`)
Words become `inline-block` spans (inline elements can't scale) with `transform-origin: bottom`, so
each grows upward from its baseline. Split on spaces only, so Hindi words stay whole. The hero waits
for `useIntroDone()` so the words grow *after* the logo lands.

### Intl.Segmenter
A "grapheme" is one character as a reader sees it. In Hindi a grapheme can be several code points
(a consonant plus a vowel sign plus a virama). `Array.from` splits code points and breaks them;
`new Intl.Segmenter(undefined, { granularity: "grapheme" })` splits graphemes.

### The radar reticle (`Reticle.tsx`)
Three layers rotate at different speeds using CSS `transform: rotate()` only, so they run on the
GPU compositor. The radar sweep is a `conic-gradient` (a pie-slice gradient) rotating inside a
circle. Tick coordinates are rounded to 2 decimals so the server and browser produce identical HTML.

### CSS scroll-driven animation (the progress bar)
`animation-timeline: scroll(root)` links an animation's progress to the scroll position instead of
to time. No JavaScript, no event listeners. Wrapped in `@supports` so unsupported browsers skip it.

### What went wrong, and what it taught
1. **A 2px bar cost 20 kB on every page.** The Motion-based scroll bar lived in the header, so every
   page loaded Motion's runtime. Lesson: anything in a shared layout is paid for by every page.
2. **Reduced motion made things worse.** The existing rule set durations to 0.01ms but left infinite
   animations looping, so they'd spin at hundreds of cycles per second. Lesson: always pair a
   duration override with `animation-iteration-count: 1`.
3. **A build failed in `next/font`.** It downloads Google Fonts during the build; one bad response
   crashed its parser. It passed on retry. Lesson: builds that depend on the network can be flaky.
