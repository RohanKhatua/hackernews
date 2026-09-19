import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";

// These augment NextAuth's own "User"/"Session" vocabulary (the signed-in
// session identity), which is backed by the Admin Prisma model — not the
// newsletter Subscriber model.

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			name?: string | null;
			email?: string | null;
			image?: string | null;
			role: string;
		};
	}

	interface User {
		id: string;
		name?: string | null;
		email?: string | null;
		image?: string | null;
		role: string;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		id: string;
		role: string;
	}
}
