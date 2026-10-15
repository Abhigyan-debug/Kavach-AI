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
