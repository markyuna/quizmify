// src/lib/nextauth.ts
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { IDLE_TIMEOUT_MS } from "@/lib/idleTimeoutConfig";
import { resolveGoogleImage } from "@/lib/profilePhoto";

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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      // The profile photo is copied into the token at sign-in, so a change
      // made from /account (ProfilePhotoCard) wouldn't show in the header
      // until the next login. That card calls update({ refreshProfile: true })
      // after saving; only then is the image re-read -- always from the DB,
      // never from the client payload. The idle hook's frequent payload-less
      // update() calls skip this query.
      if (trigger === "update" && session?.refreshProfile === true && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { image: true },
        });
        token.picture = fresh?.image ?? null;
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

  events: {
    // Keeps User.googleImage (the "restore my Google photo" option) in step
    // with the account's current Google picture. If the user is showing their
    // Google photo, `image` follows along; an upload or mascot is left alone.
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !user.id) return;

      const picture = (profile as { picture?: unknown } | undefined)?.picture;
      if (typeof picture !== "string" || !picture) return;

      try {
        const current = await prisma.user.findUnique({
          where: { id: user.id },
          select: { image: true, googleImage: true },
        });
        if (!current) return;

        const usingGooglePhoto = current.image !== null && current.image === resolveGoogleImage(current);
        if (current.googleImage === picture && (!usingGooglePhoto || current.image === picture)) return;

        await prisma.user.update({
          where: { id: user.id },
          data: { googleImage: picture, ...(usingGooglePhoto ? { image: picture } : {}) },
        });
      } catch (error) {
        // Never block a sign-in over a profile-photo refresh.
        console.error("[nextauth] googleImage refresh failed", error);
      }
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
