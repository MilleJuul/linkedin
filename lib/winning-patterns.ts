/**
 * Winning Patterns Aggregator
 *
 * After each CSV import, this module analyses top-performing posts
 * and extracts heuristic patterns that can inform the AI generator.
 */

import { prisma } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PostFeatures {
  hookType: HookType;
  lengthChars: number;
  lengthWords: number;
  bulletCount: number;
  emojiCount: number;
  hasQuestion: boolean;
  hasCta: boolean;
  ctaType: CtaType;
  lineBreaks: number;
}

export type HookType =
  | "number_list"      // "3 grunde til…", "5 tips…"
  | "question"         // "Hvad sker der når…?"
  | "most_people"      // "De fleste virksomheder…"
  | "we_tested"        // "Vi testede X…"
  | "bold_statement"   // "Stop med at…", "Glem alt om…"
  | "result_first"     // "Vi 3x'ede…", "400% mere…"
  | "mistake"          // "Fejl vi lavede…"
  | "other";

export type CtaType =
  | "question"    // ends with ?
  | "comment"     // "kommentér", "skriv"
  | "dm"          // "send DM", "skriv til os"
  | "link"        // "klik her", "læs mere"
  | "save"        // "gem dette"
  | "none";

// ─── Feature extraction ───────────────────────────────────────────────────────

export function extractFeatures(text: string): PostFeatures {
  if (!text) {
    return {
      hookType: "other",
      lengthChars: 0,
      lengthWords: 0,
      bulletCount: 0,
      emojiCount: 0,
      hasQuestion: false,
      hasCta: false,
      ctaType: "none",
      lineBreaks: 0,
    };
  }

  const lines = text.split(/\n/);
  const firstLine = (lines[0] ?? "").trim();

  // Hook type detection on first line
  let hookType: HookType = "other";
  if (/^\d+[\s\.:)]/.test(firstLine) || /\b\d+\s+(grunde?|tips?|måder?|ting|fejl|pointer)/i.test(firstLine)) {
    hookType = "number_list";
  } else if (firstLine.endsWith("?") || firstLine.startsWith("Hvad") || firstLine.startsWith("Hvorfor") || firstLine.startsWith("Har du")) {
    hookType = "question";
  } else if (/de fleste|mange virksomheder|de fleste brands/i.test(firstLine)) {
    hookType = "most_people";
  } else if (/vi testede|vi analyserede|vi kiggede på|vi gennemgik/i.test(firstLine)) {
    hookType = "we_tested";
  } else if (/^stop|^glem|^drop|^aldrig|^lad være/i.test(firstLine)) {
    hookType = "bold_statement";
  } else if (/\d+[x×%]|tredoblet|fordoblet|3x|10x/i.test(firstLine) || /\d+\s*%\s+mere/i.test(firstLine)) {
    hookType = "result_first";
  } else if (/fejl|mistake|tabte|gik galt/i.test(firstLine)) {
    hookType = "mistake";
  }

  // Bullet count (various bullet styles)
  const bulletCount = (text.match(/^[\s]*[•\-\*✅❌✓→►▸🔹🔸]\s/gm) ?? []).length +
    (text.match(/^\s*\d+[.)\]]\s/gm) ?? []).length;

  // Emoji count (rough)
  const emojiCount = (text.match(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) ?? []).length;

  // CTA detection on last non-empty line
  const lastLine = [...lines].reverse().find((l) => l.trim().length > 0) ?? "";
  let ctaType: CtaType = "none";
  if (lastLine.includes("?")) ctaType = "question";
  else if (/kommentér|skriv i kommentar|hvad synes|fortæl mig/i.test(lastLine)) ctaType = "comment";
  else if (/send.*dm|dm mig|skriv til os|kontakt/i.test(lastLine)) ctaType = "dm";
  else if (/klik her|læs mere|link i|se mere|full link/i.test(lastLine)) ctaType = "link";
  else if (/gem dette|bookmark|save this/i.test(lastLine)) ctaType = "save";

  const hasQuestion = text.includes("?");
  const hasCta = ctaType !== "none";

  return {
    hookType,
    lengthChars: text.length,
    lengthWords: text.split(/\s+/).filter(Boolean).length,
    bulletCount,
    emojiCount,
    hasQuestion,
    hasCta,
    ctaType,
    lineBreaks: (text.match(/\n/g) ?? []).length,
  };
}

// ─── Weighted engagement score ────────────────────────────────────────────────

export function computeScore(metrics: {
  engagementRate: number | null;
  impressions: number | null;
  comments: number | null;
}): number {
  const eng = metrics.engagementRate ?? 0;
  const impr = metrics.impressions ?? 0;
  const comments = metrics.comments ?? 0;

  // Weighted: 50% eng rate, 30% normalised impressions, 20% comment rate
  const normImpr = Math.min(impr / 10000, 1);
  const commentRate = impr > 0 ? comments / impr : 0;

  return eng * 0.5 + normImpr * 0.3 + commentRate * 0.2;
}

// ─── Main aggregator ──────────────────────────────────────────────────────────

export async function recomputeWinningPatterns(workspaceId: string) {
  // Fetch all posts with their latest snapshot
  const posts = await prisma.importedPost.findMany({
    where: { workspaceId },
    include: {
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (posts.length === 0) return;

  // Score all posts
  const scored = posts
    .map((p) => {
      const snap = p.snapshots[0];
      if (!snap) return null;
      const score = computeScore({
        engagementRate: snap.engagementRate,
        impressions: snap.impressions,
        comments: snap.comments,
      });
      return { post: p, snap, score };
    })
    .filter(Boolean) as {
      post: (typeof posts)[number];
      snap: (typeof posts)[number]["snapshots"][number];
      score: number;
    }[];

  if (scored.length === 0) return;

  // Top 20% threshold
  scored.sort((a, b) => b.score - a.score);
  const topCount = Math.max(1, Math.ceil(scored.length * 0.2));
  const topPosts = scored.slice(0, topCount);

  // Group by hook type
  const byHookType = new Map<HookType, typeof topPosts>();
  for (const item of topPosts) {
    const features = extractFeatures(item.post.text);
    const existing = byHookType.get(features.hookType) ?? [];
    existing.push(item);
    byHookType.set(features.hookType, existing);
  }

  // Upsert each pattern
  for (const [hookType, items] of byHookType.entries()) {
    const avgEngRate =
      items.reduce((sum: number, i) => sum + (i.snap.engagementRate ?? 0), 0) /
      items.length;
    const avgImpressions =
      items.reduce((sum: number, i) => sum + (i.snap.impressions ?? 0), 0) /
      items.length;

    // Pick up to 5 example texts (truncated to 300 chars)
    const exampleTexts = items
      .slice(0, 5)
      .map((i) => i.post.text.slice(0, 300))
      .filter((t) => t.length > 20);

    // Aggregate features
    const featuresList = items.map((i) => extractFeatures(i.post.text));
    const features = {
      avgLengthChars: Math.round(
        featuresList.reduce((s: number, f) => s + f.lengthChars, 0) / featuresList.length
      ),
      avgLengthWords: Math.round(
        featuresList.reduce((s: number, f) => s + f.lengthWords, 0) / featuresList.length
      ),
      avgBullets: +(
        featuresList.reduce((s: number, f) => s + f.bulletCount, 0) / featuresList.length
      ).toFixed(1),
      avgEmojis: +(
        featuresList.reduce((s: number, f) => s + f.emojiCount, 0) / featuresList.length
      ).toFixed(1),
      avgLineBreaks: +(
        featuresList.reduce((s: number, f) => s + f.lineBreaks, 0) / featuresList.length
      ).toFixed(1),
      topCtaTypes: getTopValues(featuresList.map((f) => f.ctaType)) as string[],
      hasQuestionPct: +(
        (featuresList.filter((f) => f.hasQuestion).length / featuresList.length) * 100
      ).toFixed(0),
    };

    await prisma.winningPattern.upsert({
      where: { workspaceId_hookType: { workspaceId, hookType } },
      create: {
        workspaceId,
        hookType,
        avgEngRate,
        avgImpressions,
        exampleTexts,
        features,
        postCount: items.length,
      },
      update: {
        avgEngRate,
        avgImpressions,
        exampleTexts,
        features,
        postCount: items.length,
      },
    });
  }
}

function getTopValues<T>(arr: T[]): T[] {
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([v]) => v);
}

// ─── Format patterns for AI prompt ───────────────────────────────────────────

export interface WinningPatternSummary {
  hookType: string;
  avgEngRate: string;
  avgImpressions: string;
  features: Record<string, unknown>;
  exampleTexts: string[];
}

export async function getWinningPatternSummary(
  workspaceId: string
): Promise<WinningPatternSummary[]> {
  const patterns = await prisma.winningPattern.findMany({
    where: { workspaceId },
    orderBy: { avgEngRate: "desc" },
    take: 5,
  });

  const HOOK_LABELS: Record<string, string> = {
    number_list: "Nummereret liste (fx '3 grunde til…')",
    question: "Spørgsmål som åbningslinje",
    most_people: "'De fleste virksomheder…'-format",
    we_tested: "'Vi testede X'-format",
    bold_statement: "Bold/kontroversiell åbning",
    result_first: "Resultat først (tal/procent)",
    mistake: "Fejlhistorie/lærdom",
    other: "Andet format",
  };

  return patterns.map((p) => ({
    hookType: HOOK_LABELS[p.hookType] ?? p.hookType,
    avgEngRate: `${(p.avgEngRate * 100).toFixed(2)}%`,
    avgImpressions: Math.round(p.avgImpressions).toLocaleString("da-DK"),
    features: p.features as Record<string, unknown>,
    exampleTexts: p.exampleTexts,
  }));
}
