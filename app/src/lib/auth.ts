import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeSessionToken } from "@/lib/auth/session-state";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET,
  session: {
    strategy: "jwt",
    // Database freshness below provides immediate revocation; the finite JWT
    // lifetime additionally limits exposure if a cookie is copied and unused.
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (!user?.passwordHash || !user.isActive) return null;

        const validPassword = await compare(parsed.data.password, user.passwordHash);
        if (!validPassword) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          authVersion: user.authVersion,
          isActive: user.isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.name = user.name;
        token.authVersion = user.authVersion;
        return token;
      }

      if (!token.sub) return null;

      const current = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { role: true, authVersion: true, isActive: true, name: true, email: true },
      });
      const decision = authorizeSessionToken(token, current);
      if (!decision.valid) {
        // Auth.js treats the session as invalid. Some server-only auth() calls do
        // not forward cookie-cleanup headers, so monotonic authVersion changes are
        // what guarantee this old cookie can never revive after reactivation.
        return null;
      }

      token.role = decision.role;
      token.authVersion = decision.authVersion;
      token.name = current?.name ?? null;
      token.email = current?.email ?? null;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "APPLICANT";
      }
      return session;
    },
  },
});
