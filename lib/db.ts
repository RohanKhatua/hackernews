import { PrismaClient } from "./generated/prisma";

// Create a single instance of Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Subscriber management functions
export async function addSubscriber(email: string, name?: string) {
	try {
		const subscriber = await prisma.subscriber.create({
			data: {
				email,
				name,
			},
		});
		return { success: true, subscriber };
	} catch (error: any) {
		// Handle unique constraint violation
		if (error.code === "P2002") {
			return { success: false, error: "Email already subscribed" };
		}
		return { success: false, error: error.message };
	}
}

export async function removeSubscriber(email: string) {
	try {
		await prisma.subscriber.update({
			where: { email },
			data: { active: false },
		});
		return { success: true };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}

export async function getAllActiveSubscribers() {
	return prisma.subscriber.findMany({
		where: { active: true },
	});
}
