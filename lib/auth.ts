import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { getPool } from "./db";

/**
 * Server-side auth engine. Never import this from a client component: it holds
 * the database connection and, through env vars, the Google client secret.
 * The browser uses lib/auth-client.ts instead.
 *
 * BETTER_AUTH_SECRET (signs session cookies) and BETTER_AUTH_URL (builds
 * callback URLs and checks request origins) are read from the environment by
 * Better Auth itself, so they are not passed here.
 */
export const auth = betterAuth({
  // Reuse the app's pool so auth inherits the Neon SSL setting in lib/db.ts.
  // shortcut: with no DATABASE_URL an empty Pool keeps `next build` working (a
  // Pool does not connect until its first query), but sign-in will fail at
  // runtime - auth needs Postgres, unlike the rest of the app.
  database: getPool() ?? new Pool(),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
});
