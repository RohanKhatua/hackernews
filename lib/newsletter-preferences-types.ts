export type SubscriberPreferenceInteraction = {
  id: string;
  storyId: number;
  type: string;
  storyTitle: string;
  storyBy: string | null;
  storyScore: number | null;
  domain: string | null;
  updatedAt: string;
};

export type SubscriberPreferenceReader = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  interactions: SubscriberPreferenceInteraction[];
};

export type SubscriberPreferenceSummary = {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  confirmedAt: string | null;
  createdAt: string;
  readerCount: number;
  readerIds: string[];
  interactionCount: number;
  distinctStories: number;
  topDomains: Array<{ value: string; count: number }>;
  topAuthors: Array<{ value: string; count: number }>;
  coldStart: boolean;
  recommendationReasons: string[];
  recommendationSample: Array<{
    id: number;
    title: string;
    score: number;
    reasons: string[];
  }>;
  readers: SubscriberPreferenceReader[];
};

export type SubscriberPreferencesResponse = {
  success: boolean;
  preferences: SubscriberPreferenceSummary[];
};
