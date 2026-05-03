"use client";

const READER_ID_KEY = "hn_reader_id";

export function getReaderId() {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(READER_ID_KEY);
  if (existing) return existing;

  const readerId = crypto.randomUUID();
  window.localStorage.setItem(READER_ID_KEY, readerId);
  return readerId;
}
