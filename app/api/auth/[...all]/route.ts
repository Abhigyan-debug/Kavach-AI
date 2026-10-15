import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// pg needs Node APIs, so pin the Node runtime like every other route here.
export const runtime = "nodejs";

// One catch-all file answers every auth URL: /api/auth/sign-up/email,
// /api/auth/callback/google, /api/auth/get-session, and the rest.
export const { GET, POST } = toNextJsHandler(auth);
