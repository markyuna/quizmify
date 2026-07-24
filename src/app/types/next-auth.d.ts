// src/app/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
    /** Epoch ms of the last activity that reset the idle timer. */
    lastActivity?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    /** Epoch ms of the last activity that reset the idle timer. */
    lastActivity?: number;
  }
}