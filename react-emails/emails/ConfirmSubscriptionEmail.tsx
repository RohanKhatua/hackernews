import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

interface ConfirmSubscriptionEmailProps {
  name?: string;
  confirmUrl: string;
  /** Magic link binding this browser's reading history to the subscription. */
  claimUrl?: string | null;
}

export const ConfirmSubscriptionEmail = ({
  name,
  confirmUrl,
  claimUrl,
}: ConfirmSubscriptionEmailProps) => {
  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>Confirm your Hacker News newsletter subscription</Preview>
        <Body className="bg-gray-50 font-sans m-0 p-0">
          <Container className="w-full max-w-none mx-auto my-0 p-8 bg-white rounded-lg shadow-sm">
            <Section className="text-center mb-8">
              <Heading className="text-gray-900 text-3xl font-semibold m-0 mb-1 p-0 leading-tight">
                <span className="bg-orange-500 text-white py-1 px-2 rounded mr-2 font-bold">
                  HN
                </span>{" "}
                Confirm your subscription
              </Heading>
            </Section>

            <Section className="mb-6">
              <Text className="text-gray-800 text-lg">{`Hi ${
                name || "there"
              },`}</Text>
              <Text className="text-gray-700">
                Please confirm that you want to receive the Hacker News
                newsletter. You&apos;ll get the top stories, plus
                recommendations based on your reading history.
              </Text>
            </Section>

            <Section className="text-center my-8">
              <Button
                href={confirmUrl}
                className="bg-orange-500 text-white rounded px-6 py-3 text-base font-medium no-underline"
              >
                Confirm subscription
              </Button>
            </Section>

            {claimUrl && (
              <Section className="text-center mb-8">
                <Text className="text-sm text-gray-600 m-0 mb-2">
                  Reading stories on this or another device? Open the link below
                  on that device to link its history to your recommendations.
                </Text>
                <Link href={claimUrl} className="text-sm text-orange-600 underline">
                  Sync a device's reading history
                </Link>
              </Section>
            )}

            <Section className="mt-8 text-center">
              <Text className="text-xs text-gray-500">
                If you didn&apos;t request this, you can safely ignore this
                email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

export default ConfirmSubscriptionEmail;
