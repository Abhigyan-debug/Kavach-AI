"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser side of auth. Safe to ship to every visitor: it holds no secrets and
 * only calls /api/auth/* on the same origin, so no baseURL is needed.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
