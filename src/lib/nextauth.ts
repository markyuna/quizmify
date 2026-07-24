// src/lib/nextauth.ts
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { IDLE_TIMEOUT_MS } from "@/lib/idleTimeoutConfig";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  secret: process.env.NEXTAUTH_SECRET,

  // CredentialsProvider is incompatible with database sessions in NextAuth
  // v4 (there's no way to revalidate a credentials sign-in on every
  // request), so all providers -- Google included -- use JWT sessions.
  // The adapter is still used to create/link User & Account rows for
  // Google sign-ins; it's just not the session store anymore.
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        // No account with this email, or it was created via Google and
        // never set a password -- reject either way without distinguishing.
        if (!user?.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }

      // Set on sign-in, bumped explicitly by the client's idle-timeout hook
      // (via useSession().update()) on activity, and backfilled once for
      // tokens issued before this claim existed.
      if (user || trigger === "update" || typeof token.lastActivity !== "number") {
        token.lastActivity = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      session.lastActivity =
        typeof token.lastActivity === "number" ? token.lastActivity : Date.now();
      return session;
    },
  },
};

// The single choke point every route/page uses to read the current user.
// Enforces the idle timeout server-side (not just via the client hook) so a
// stale-but-not-yet-expired JWT can't be replayed after 30 minutes of
// inactivity -- covers direct API calls just as much as page navigations.
export async function getAuthSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const lastActivity = session.lastActivity ?? Date.now();
  if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
    return null;
  }

  return session;
}
