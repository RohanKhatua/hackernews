import { PrismaClient } from "@prisma/client";
import type { Subscriber } from "@prisma/client";
import crypto from "crypto";

export type AddSubscriberResult =
  | { success: true; subscriber: Subscriber; alreadyConfirmed: boolean }
  | { success: false; error: string };

export type ConfirmSubscriberResult =
  | { success: true; subscriber: Subscriber }
  | { success: false; error: string };

// Create a single instance of Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Subscriber management functions
export async function addSubscriber(
  email: string,
  name?: string,
  readerId?: string,
): Promise<AddSubscriberResult> {
  const normalizedEmail = normalizeEmail(email);

  try {
    const existing = await prisma.subscriber.findUnique({
      where: { email: normalizedEmail },
    });

    // Already confirmed subscribers are simply reactivated.
    if (existing?.confirmedAt) {
      const subscriber = await prisma.subscriber.update({
        where: { email: normalizedEmail },
        data: { name: name || existing.name, active: true },
      });

      if (readerId) {
        await linkReaderToSubscriber(readerId, subscriber.id);
      }

      return { success: true, subscriber, alreadyConfirmed: true };
    }

    // New (or still unconfirmed) subscribers start inactive until they confirm.
    const confirmationToken = crypto.randomUUID();
    const subscriber = await prisma.subscriber.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        name: name || undefined,
        active: false,
        confirmationToken,
      },
      update: {
        name: name || undefined,
        active: false,
        confirmationToken,
      },
    });

    if (readerId) {
      await linkReaderToSubscriber(readerId, subscriber.id);
    }

    return { success: true, subscriber, alreadyConfirmed: false };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add subscriber"),
    };
  }
}

export async function confirmSubscriber(
  confirmationToken: string,
): Promise<ConfirmSubscriberResult> {
  try {
    const subscriber = await prisma.subscriber.findUnique({
      where: { confirmationToken },
    });

    if (!subscriber) {
      return { success: false, error: "Invalid confirmation token" };
    }

    if (subscriber.confirmedAt) {
      return { success: true, subscriber };
    }

    const confirmed = await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        active: true,
        confirmedAt: new Date(),
        confirmationToken: null,
      },
    });

    return { success: true, subscriber: confirmed };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to confirm subscriber"),
    };
  }
}

export async function getSubscriberByEmail(email: string) {
  return prisma.subscriber.findUnique({ where: { email: normalizeEmail(email) } });
}

export async function linkReaderToSubscriber(
  readerId: string,
  subscriberId: string,
) {
  return prisma.storyInteraction.updateMany({
    where: { readerId },
    data: { subscriberId },
  });
}

export async function removeSubscriber(subscriberId: string) {
  try {
    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { active: false },
    });
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove subscriber"),
    };
  }
}

export async function getAllActiveSubscribers() {
  return prisma.subscriber.findMany({
    where: { active: true, confirmedAt: { not: null } },
  });
}

/**
 * Deactivates a subscriber by email. Used for hard bounces and spam complaints
 * so we stop emailing an address that cannot receive mail.
 */
export async function deactivateSubscriberByEmail(email: string) {
  try {
    await prisma.subscriber.update({
      where: { email: normalizeEmail(email) },
      data: { active: false },
    });
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to deactivate subscriber"),
    };
  }
}

// Function to get all subscribers including inactive ones (for admin panel)
export async function getAllSubscribers() {
  return prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
  });
}
