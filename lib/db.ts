import { PrismaClient } from "@prisma/client";

// Create a single instance of Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		log: ["query", "info", "warn", "error"],
	});

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

export async function removeSubscriber(subscriberId: string) {
	try {
		await prisma.subscriber.update({
			where: { id: subscriberId },
			data: { active: false },
		});
		return { success: true };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}

// For backwards compatibility - we'll keep this temporarily during migration
export async function removeSubscriberByEmail(email: string) {
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

// Function to get all subscribers including inactive ones (for admin panel)
export async function getAllSubscribers() {
	return prisma.subscriber.findMany({
		orderBy: { createdAt: "desc" },
	});
}
