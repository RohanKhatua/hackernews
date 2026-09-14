import { Resend } from "resend";

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
};

export interface EmailProvider {
  /** Send a single email. Returns the provider message id. */
  send(message: EmailMessage): Promise<{ id: string }>;
  /** Send up to 100 emails in one request. Returns ids in the same order. */
  sendBatch(messages: EmailMessage[]): Promise<{ id: string }[]>;
}

class ResendProvider implements EmailProvider {
  private readonly client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage) {
    const { data, error } = await this.client.emails.send(message);

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Resend returned no data for the sent email");
    }

    return { id: data.id };
  }

  async sendBatch(messages: EmailMessage[]) {
    if (messages.length === 0) {
      return [];
    }

    const { data, error } = await this.client.batch.send(messages);

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Resend returned no data for the sent batch");
    }

    return data.data.map((email) => ({ id: email.id }));
  }
}

let provider: EmailProvider | null = null;

/**
 * Returns the configured email provider. Defaults to Resend.
 * Swap providers by setting EMAIL_PROVIDER and adding an implementation here.
 */
export function getEmailProvider(): EmailProvider {
  if (provider) {
    return provider;
  }

  const name = process.env.EMAIL_PROVIDER || "resend";

  if (name !== "resend") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${name}`);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  provider = new ResendProvider(apiKey);
  return provider;
}

/** Number of emails a provider accepts per batch request. */
export const EMAIL_BATCH_SIZE = 100;
