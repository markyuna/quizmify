import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? token?.sub;
      }
      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}