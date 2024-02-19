type Item = {
    id: number;
    deleted?: boolean; // Optional because it's only present if the item is deleted
    type: 'job' | 'story' | 'comment' | 'poll' | 'pollopt';
    by: string;
    time: number; // Unix Time
    text?: string; // Optional because it may not be present for all item types
    dead?: boolean; // Optional because it's only present if the item is dead
    parent?: number; // Optional because it's only relevant for comments
    poll?: number; // Optional because it's only relevant for pollopt items
    kids?: number[]; // Optional because it may not have comments
    url?: string; // Optional because it may not be present for all item types
    score?: number; // Optional because it may not be relevant for all item types
    title?: string; // Optional because it may not be present for all item types
    parts?: number[]; // Optional because it's only relevant for polls
    descendants?: number; // Optional because it's only relevant for stories or polls
};

type ItemTitle = {
    id: number;
    title: string;
    by: string;
    type: 'job' | 'story' | 'comment' | 'poll' | 'pollopt';
    url?: string
}
