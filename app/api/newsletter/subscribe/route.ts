import { NextResponse } from "next/server";
import { z } from "zod";
import { addSubscriber } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/email-utils";

const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(100).optional(),
  readerId: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 },
      );
    }

    const { email, name, readerId } = parsed.data;
    const result = await addSubscriber(email, name, readerId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    // Double opt-in: send a confirmation email for new/unconfirmed subscribers.
    if (!result.alreadyConfirmed && result.subscriber.confirmationToken) {
      try {
        await sendConfirmationEmail(
          result.subscriber.email,
          result.subscriber.name,
          result.subscriber.confirmationToken,
        );
      } catch (error) {
        console.error("Failed to send confirmation email:", error);
        return NextResponse.json(
          {
            success: false,
            error:
              "We couldn't send the confirmation email. Please try again later.",
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Check your inbox to confirm your subscription.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "You're already subscribed to the newsletter.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to process subscription" },
      { status: 500 },
    );
  }
}