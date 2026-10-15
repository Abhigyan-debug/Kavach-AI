# Glossary

Every technical term used in this project, in plain words.

## Auth

| Term | Meaning |
|---|---|
| **Authentication** | Proving *who you are* — logging in |
| **Authorization** | Deciding *what you may see or do* — e.g. only your own family's alerts |
| **OAuth 2.0** | The standard behind "Sign in with Google". Google confirms your identity; the app never sees your Google password |
| **OpenID Connect** | A layer on OAuth that returns *who* the user is (name, email) |
| **Client ID / Client Secret** | The app's identity with Google. The ID is semi-public; the secret must stay on the server |
| **Redirect / callback URI** | Where Google sends the user back after sign-in. Must match exactly or Google refuses |
| **Session** | A server-side record saying "this browser is logged in as X", with an expiry |
| **Cookie** | A small value the browser sends with every request to the same site |
| **httpOnly cookie** | A cookie JavaScript cannot read, so an injected script can't steal the session |
| **Password hashing** | Storing a one-way scramble of a password instead of the password itself |
| **CSRF** | Cross-Site Request Forgery: another site tricking your browser into sending a request here. Blocked by checking the request's origin |
| **Middleware** | Code that runs before a page loads, e.g. to redirect logged-out visitors |
| **Login wall** | A screen demanding sign-in before you can do anything |
| **Lazy registration** | Letting people use the product first and asking for an account only when it helps them |

## Next.js and JavaScript

| Term | Meaning |
|---|---|
| **App Router** | Next.js's folder-based routing: `app/check/page.tsx` becomes `/check` |
| **Route handler** | A `route.ts` file that answers HTTP requests instead of rendering a page |
| **Catch-all route** | A folder named `[...name]` that matches every path below it |
| **Runtime (Node / Edge)** | Where server code runs. Node has full APIs (needed by `pg`); Edge is lighter but more limited |
| **`"use client"`** | Marks a file as code that runs in the browser |
| **React hook** | A `use…` function that lets a component react to changing data |
| **Destructuring** | `const { a, b } = obj` — pull properties out of an object into variables |
| **Nullish coalescing `??`** | `x ?? y` — use `x` unless it is `null`/`undefined`, otherwise `y` |
| **Non-null assertion `!`** | `x!` — tells TypeScript "trust me, this isn't null". Unchecked at runtime |
| **Environment variable** | A setting given to the program from outside the code, e.g. `DATABASE_URL` |

## Database

| Term | Meaning |
|---|---|
| **PostgreSQL** | The relational database Kavach uses |
| **Neon** | The hosted Postgres provider in use |
| **Connection pool** | Open connections kept ready for reuse instead of opening one per request |
| **Port 5432** | The network port Postgres listens on. Some networks block it |
| **Migration** | A change applied to the database structure, e.g. creating tables |
| **Schema** | The structure of the database: tables, columns, types |

## npm and tooling

| Term | Meaning |
|---|---|
| **Dependency** | A package the project needs |
| **Peer dependency** | A package a library expects *you* to install, e.g. React for a React library |
| **Optional peer** | A peer dependency needed only if you use a particular feature or framework |
| **`ERESOLVE`** | npm's error when it can't satisfy every version requirement at once |
| **`--legacy-peer-deps`** | Tells npm to skip peer-dependency resolution for that install |
| **`npm ci`** | Clean install exactly from `package-lock.json`; what CI runs |
| **Pinning** | Requiring one exact version (`1.7.9`) instead of a range (`^1.7.9`) |
| **CI** | Continuous Integration: automated checks on every push |

## Networking

| Term | Meaning |
|---|---|
| **Port** | A numbered door on a server; web uses 443, Postgres uses 5432 |
| **ETIMEDOUT** | The connection attempt got no answer before giving up — typically a firewall |
| **AggregateError** | A JavaScript error wrapping several errors; the useful detail is in `.errors` |

## Animation and performance

| Term | Meaning |
|---|---|
| **Frame budget** | At 60 frames per second the browser has 16.6 ms per frame; going over stutters |
| **Long task** | Main-thread work longer than 50 ms; the browser can't respond during it, so it feels laggy |
| **Layout / reflow** | Recalculating where every element sits. Expensive |
| **Paint** | Redrawing pixels. Also expensive |
| **Compositor** | Moves already-drawn layers on the GPU. Cheap — why `transform` and `opacity` are safe to animate |
| **Bundle** | The JavaScript files a page downloads |
| **First Load JS** | The JavaScript a page needs before it works, as reported by `next build` |
| **Chunk** | One of the files a bundle is split into |
| **Code splitting** | Putting code in separate chunks so each page downloads only what it uses |
| **Dynamic import** | `await import("x")` — load a module only when that line runs, in its own chunk |
| **Tree shaking** | The bundler dropping exported code nothing imports |
| **Barrel file** | One file that re-exports many modules; can defeat tree shaking |
| **`prefers-reduced-motion`** | An OS setting asking for less motion; the site must respect it |
| **IntersectionObserver** | Browser API that reports when an element enters or leaves the screen |
| **Variants (Motion)** | Named animation states, e.g. `hidden` and `shown`, that a parent passes to its children |
| **Stagger** | Starting each item's animation a fixed delay after the previous one |
| **`stroke-dasharray`** | SVG property that draws a line as dashes and gaps; animating it makes a line "draw itself" |
| **`pathLength`** | SVG attribute that declares a line's length in made-up units (here 1000), so every line is drawn on the same scale |
| **Playwright** | A tool that drives a real browser from code, used here to measure behaviour |

## Theme and effects

| Term | Meaning |
|---|---|
| **Design token** | A named value (like `base` = `#0A1018`) used everywhere instead of a raw colour |
| **WCAG contrast ratio** | How distinguishable text is from its background; 4.5:1 is the minimum for normal text (AA) |
| **Hydration** | React attaching itself to HTML the server already rendered |
| **Hydration mismatch** | React finding the page differs from what it expected; it warns |
| **`suppressHydrationWarning`** | Tells React one element's difference is intentional (that element only) |
| **Inline script** | JavaScript written directly in the HTML, so it runs before other files load |
| **`getBoundingClientRect()`** | An element's position and size on screen, in pixels |
| **Spring animation** | Motion that follows physics (stiffness, damping) instead of a fixed curve; can overshoot |
| **`pathLength` (Motion)** | Animating how much of an SVG line is drawn, from 0 (none) to 1 (all) |
| **Grapheme** | One character as a reader sees it; may be several code points in Hindi |
| **`Intl.Segmenter`** | Built-in API that splits text into graphemes, words or sentences correctly |
| **`conic-gradient`** | A gradient that sweeps around a centre point, like a pie chart |
| **Scroll-driven animation** | A CSS animation whose progress follows scrolling, not time |
| **`@supports`** | CSS that applies only if the browser understands a feature |
| **Failsafe** | A fallback that guarantees a safe outcome when something else fails |
| **`<html lang>`** | Declares the page's language; screen readers choose their voice from it |
| **Shirorekha** | The continuous top line that joins Devanagari letters; letter-spacing breaks it |
| **Orphan process** | A child process still running after its parent was stopped |
