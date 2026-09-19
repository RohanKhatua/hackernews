import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Font,
  Tailwind,
} from "@react-email/components";

/**
 * A story prepared for the newsletter. `href`/`commentsHref` are prebuilt by
 * email-utils (tracked redirects for subscribers, plain links otherwise) so
 * the template stays link-agnostic.
 */
export interface NewsletterStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  descendants: number;
  recommendationReasons?: string[];
  excerpt?: string;
  href?: string;
  commentsHref?: string;
}

interface NewsletterEmailProps {
  stories: NewsletterStory[];
  date: string;
  appUrl?: string;
  title?: string;
  intro?: string;
  preview?: string;
}

function storyUrl(story: NewsletterStory, appUrl?: string) {
  return story.href
    ? story.href
    : story.url
      ? story.url
      : `${appUrl ?? ""}/item/${story.id}`;
}

function commentsUrl(story: NewsletterStory, appUrl?: string) {
  return story.commentsHref ?? `${appUrl ?? ""}/item/${story.id}`;
}

function storyMeta(story: NewsletterStory, appUrl?: string) {
  return (
    <Text className="text-sm text-gray-500 mt-1">
      <span className="text-green-600 font-medium">{story.score} points</span>{" "}
      by {story.by} •{" "}
      <Link
        href={commentsUrl(story, appUrl)}
        className="text-gray-500 hover:text-gray-700 no-underline"
      >
        {story.descendants || 0} comments
      </Link>
    </Text>
  );
}

export const NewsletterEmail = ({
  stories,
  date,
  appUrl,
  title = "Daily Top 5",
  intro = "Here are today's top stories from Hacker News:",
  preview,
}: NewsletterEmailProps) => {
  const [hero, ...rest] = stories;

  return (
    <Tailwind>
      <Html>
        <Head>
          <Font
            fontFamily="Inter"
            fallbackFontFamily="Arial"
            webFont={{
              url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
        </Head>
        <Preview>{preview ?? `Hacker News ${title} • ${date}`}</Preview>
        <Body className="bg-gray-50 font-sans m-0 p-0">
          <Container className="w-full max-w-none mx-auto my-0 p-8 bg-white rounded-lg shadow-sm">
            <Section className="text-center mb-8">
              <Heading className="text-gray-900 text-3xl font-semibold m-0 mb-1 p-0 leading-tight">
                <span className="bg-orange-500 text-white py-1 px-2 rounded mr-2 font-bold">
                  HN
                </span>{" "}
                {title}
              </Heading>
              <Text className="text-gray-500 text-base mt-2 mb-0">{date}</Text>
            </Section>

            <Section className="mb-6">
              <Text className="text-gray-800 text-lg">{`Hello {{name}},`}</Text>
              <Text className="text-gray-700">{intro}</Text>
            </Section>

            {hero && (
              <Section className="mb-10">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-orange-600 m-0 mb-2">
                    ★ Top story of the day
                  </Text>
                  <Text className="m-0 mb-3">
                    <Link
                      href={storyUrl(hero, appUrl)}
                      className="text-2xl font-semibold text-gray-900 no-underline leading-snug"
                    >
                      {hero.title}
                    </Link>
                  </Text>
                  {hero.excerpt && (
                    <Text className="text-base text-gray-600 m-0 mb-3 leading-relaxed">
                      {hero.excerpt}
                    </Text>
                  )}
                  {storyMeta(hero, appUrl)}
                </div>
              </Section>
            )}

            {rest.map((story, index) => (
              <Section key={story.id} className="py-4">
                <div className="flex">
                  <div className="flex-shrink-0 mr-3">
                    <span className="inline-block bg-gray-100 text-gray-600 font-semibold text-sm w-8 h-8 leading-8 text-center rounded-full">
                      {index + 2}
                    </span>
                  </div>
                  <div className="flex-grow">
                    <Text className="m-0 mb-2 leading-relaxed">
                      <Link
                        href={storyUrl(story, appUrl)}
                        className="text-lg font-medium text-gray-900 no-underline hover:underline"
                      >
                        {story.title}
                      </Link>
                    </Text>
                    {story.excerpt && (
                      <Text className="text-sm text-gray-600 mt-1 mb-2 leading-relaxed">
                        {story.excerpt}
                      </Text>
                    )}
                    {storyMeta(story, appUrl)}
                    {story.recommendationReasons &&
                      story.recommendationReasons.length > 0 && (
                        <Text className="text-xs text-gray-500 mt-1">
                          Recommended because{" "}
                          {story.recommendationReasons.join(" and ")}.
                        </Text>
                      )}
                  </div>
                </div>
                {index < rest.length - 1 && (
                  <Hr className="border-t border-gray-200 mt-4 mb-0 p-0" />
                )}
              </Section>
            ))}

            <Section className="mt-8 text-center">
              <Hr className="border-t border-gray-200 m-0 mb-5 p-0" />
              <Text className="text-xs text-gray-500">
                You're receiving this email because you subscribed to the Hacker
                News newsletter.
              </Text>
              <Text className="text-xs text-gray-500 mt-2">
                <Link
                  href="{{unsubscribe_link}}"
                  className="text-gray-500 hover:text-gray-700 underline"
                >
                  Unsubscribe
                </Link>{" "}
                from these emails.
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

export default NewsletterEmail;
