import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth configuration shared by the middleware and the main
 * `auth` instance. Providers are defined in `src/auth.ts` only.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard) {
        if (isLoggedIn) {
          return true;
        }
        return false;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
