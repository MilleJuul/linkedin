/**
 * CSV Parser for Hootsuite Posts Analytics export.
 *
 * Hootsuite's column names can vary between versions and regions.
 * This module implements robust fuzzy column mapping + normalization.
 */

import Papa from "papaparse";

// ─── Column mapping ────────────────────────────────────────────────────────────

export interface ColumnMapping {
  text: string | null;
  publishedAt: string | null;
  impressions: string | null;
  likes: string | null;
  comments: string | null;
  shares: string | null;
  clicks: string | null;
  reach: string | null;
  engagements: string | null;
  externalId: string | null;
}

export interface ParsedRow {
  text: string;
  publishedAt: Date | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  reach: number | null;
  engagements: number | null;
  externalId: string | null;
  isPartial: boolean;
  rawRow: Record<string, string>;
}

export interface ParseResult {
  headers: string[];
  detectedMapping: ColumnMapping;
  preview: Record<string, string>[];
  totalRows: number;
  rawData: Record<string, string>[];
}

// Fuzzy matchers – returns true if column name matches known aliases
const MATCHERS: Record<keyof ColumnMapping, (s: string) => boolean> = {
  text: (s) =>
    /post.?text|message|caption|content|post.?body|tekst|opslag/i.test(s),
  publishedAt: (s) =>
    /publish|date|time|posted|dato|tidspunkt|sent.?at|created.?at/i.test(s),
  impressions: (s) =>
    /impression|view|reach.?total|total.?view|visning/i.test(s) &&
    !/paid|organic|reach$/i.test(s),
  likes: (s) =>
    /^likes?$|reaction|like.?count|antal.?likes?|synes.?godt/i.test(s),
  comments: (s) => /^comments?$|kommentar/i.test(s),
  shares: (s) => /^shares?$|del|repost/i.test(s),
  clicks: (s) => /click|link.?click|klik/i.test(s),
  reach: (s) => /^reach$|rækkevidde|unik.*(visning|reach)/i.test(s),
  engagements: (s) => /total.?engagement|engagement.?total|engagement$/i.test(s),
  externalId: (s) => /^id$|post.?id|external.?id|urn:/i.test(s),
};

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    text: null,
    publishedAt: null,
    impressions: null,
    likes: null,
    comments: null,
    shares: null,
    clicks: null,
    reach: null,
    engagements: null,
    externalId: null,
  };

  const normalised = headers.map((h) => h.trim());

  for (const key of Object.keys(mapping) as (keyof ColumnMapping)[]) {
    const match = normalised.find((h) => MATCHERS[key](h));
    if (match) mapping[key] = match;
  }

  return mapping;
}

// ─── Number parsing ────────────────────────────────────────────────────────────

function parseNumber(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return null;

  // Remove thousands separators and currency symbols
  // Handle both "1,234.56" (US) and "1.234,56" (EU) formats
  let cleaned = raw.trim().replace(/[^\d,.\-]/g, "");

  // Detect EU format: ends with comma-2digits (e.g., "1.234,56")
  if (/,\d{1,2}$/.test(cleaned) && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // US format or simple: remove commas as thousands sep
    cleaned = cleaned.replace(/,/g, "");
  }

  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n);
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

function parseDate(raw: string | undefined): Date | null {
  if (!raw || raw.trim() === "") return null;

  const s = raw.trim();

  // Try ISO first
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso;

  // Try common formats: DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    // Assume DD/MM/YYYY for European sources
    const d = new Date(
      `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`
    );
    if (!isNaN(d.getTime())) return d;
  }

  // Try Month DD YYYY or DD Month YYYY
  const longDate = new Date(s.replace(/\./g, ""));
  if (!isNaN(longDate.getTime())) return longDate;

  return null;
}

// ─── Parse CSV content ────────────────────────────────────────────────────────

export function parseCsvContent(csvText: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const rawData = result.data;
  const detectedMapping = detectColumnMapping(headers);

  return {
    headers,
    detectedMapping,
    preview: rawData.slice(0, 10),
    totalRows: rawData.length,
    rawData,
  };
}

// ─── Normalise rows with mapping ──────────────────────────────────────────────

export function normaliseRows(
  rawData: Record<string, string>[],
  mapping: ColumnMapping
): ParsedRow[] {
  return rawData.map((row): ParsedRow => {
    const text = mapping.text ? (row[mapping.text] ?? "").trim() : "";
    const publishedAt = mapping.publishedAt
      ? parseDate(row[mapping.publishedAt])
      : null;
    const impressions = mapping.impressions
      ? parseNumber(row[mapping.impressions])
      : null;
    const likes = mapping.likes ? parseNumber(row[mapping.likes]) : null;
    const comments = mapping.comments
      ? parseNumber(row[mapping.comments])
      : null;
    const shares = mapping.shares ? parseNumber(row[mapping.shares]) : null;
    const clicks = mapping.clicks ? parseNumber(row[mapping.clicks]) : null;
    const reach = mapping.reach ? parseNumber(row[mapping.reach]) : null;
    const engagements = mapping.engagements
      ? parseNumber(row[mapping.engagements])
      : null;
    const externalId = mapping.externalId
      ? (row[mapping.externalId] ?? "").trim() || null
      : null;

    const isPartial =
      !impressions ||
      likes === null ||
      comments === null ||
      shares === null;

    return {
      text,
      publishedAt,
      impressions,
      likes,
      comments,
      shares,
      clicks,
      reach,
      engagements,
      externalId,
      isPartial,
      rawRow: row,
    };
  });
}

// ─── Content hash for dedup ───────────────────────────────────────────────────

export function contentHash(text: string, publishedAt: Date | null): string {
  const norm = text.trim().toLowerCase().slice(0, 500);
  const dateStr = publishedAt ? publishedAt.toISOString().slice(0, 10) : "nodate";
  // Simple deterministic hash (no crypto needed for dedup)
  let hash = 0;
  const str = `${dateStr}::${norm}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32-bit
  }
  return `h${Math.abs(hash).toString(36)}`;
}
