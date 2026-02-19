"use server";

/**
 * AI Service Layer – powered by OpenAI (gpt-4o-mini).
 *
 * If OPENAI_API_KEY is not set the functions fall back to quality mock data
 * so the app stays functional without a key.
 *
 * Context fed to the LLM:
 *  • Brand kit  (tone, do/don't words, CTA style, examples)
 *  • Winning patterns (top hook types + engagement stats + example texts)
 *  • Content sources (first 500 chars per doc – keyword retrieved)
 *  • Asset metadata (filename + tags, for asset matching)
 *
 * Web research: not implemented. The model is instructed to avoid
 * unverifiable statistics and rely only on the user's own data.
 */

import { Asset } from "@prisma/client";
import { prisma } from "./db";
import { getWinningPatternSummary, WinningPatternSummary } from "./winning-patterns";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PostDraft {
  title: string;
  postIdea: string;
  format: "TEXT" | "IMAGE" | "VIDEO" | "CAROUSEL" | "POLL";
  suggestedDay: string; // ISO date string
  hook?: string;
  bodyText?: string;
  cta?: string;
  hashtags?: string[];
  /** Why this post should perform well based on performance data. */
  rationale?: string;
  /** Citable one-liner from the post concept. */
  oneLiner?: string;
}

export interface PostSuggestion {
  hook: string;
  bodyText: string;
  cta: string;
  hashtags: string[];
  /** Why this variation should perform well. */
  rationale: string;
  /** Citable one-liner. */
  oneLiner: string;
  /** Top asset recommendations (up to 3). */
  recommendedAssets: { assetId: string; reason: string }[];
  /** Visual concepts if no matching assets are available. */
  visualConcepts: string[];
}

export interface PostCopy {
  hook: string;
  bodyText: string;
  cta: string;
  hashtags: string[];
}

// Serialisable inputs (no Date objects – use ISO strings instead)
export interface WeeklyPlanInput {
  workspaceSlug: string;
  cadence: number;
  themes?: string[];
  startDate?: string; // ISO string
}

export interface PostSuggestionsInput {
  workspaceSlug: string;
  postIdea: string;
}

export interface AssetMatchInput {
  postIdea: string;
  assets: Partial<Asset>[];
}

// Legacy input kept for backward compat
export interface WeeklyPlanLegacyInput {
  brandKit: Partial<Record<string, unknown>>;
  pastPostsSummary: string;
  cadence: number;
  themes?: string[];
  startDate?: Date;
  winningPatterns?: WinningPatternSummary[];
}

export interface PostCopyInput {
  brandKit: Partial<Record<string, unknown>>;
  postIdea: string;
  selectedAssets?: Partial<Asset>[];
  winningPatterns?: WinningPatternSummary[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchWorkspaceContext(workspaceSlug: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { brandKit: true },
  });
  if (!workspace) throw new Error("Workspace ikke fundet");

  const [patterns, contentSources, assets] = await Promise.all([
    getWinningPatternSummary(workspace.id),
    prisma.contentSource.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { title: true, extractedText: true, tags: true },
    }),
    prisma.asset.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, filename: true, type: true, tags: true },
    }),
  ]);

  return { workspace, brandKit: workspace.brandKit, patterns, contentSources, assets };
}

function brandKitBlock(bk: Record<string, unknown> | null): string {
  if (!bk) return "Intet brand kit konfigureret – brug professionel B2B-tone.";
  const lines: string[] = [];
  if (bk.toneOfVoice) lines.push(`Tone: ${bk.toneOfVoice}`);
  if (Array.isArray(bk.doWords) && bk.doWords.length)
    lines.push(`Brug: ${(bk.doWords as string[]).join(", ")}`);
  if (Array.isArray(bk.dontWords) && bk.dontWords.length)
    lines.push(`Undgå: ${(bk.dontWords as string[]).join(", ")}`);
  if (bk.ctaStyle) lines.push(`CTA-stil: ${bk.ctaStyle}`);
  if (bk.hashtagStyle) lines.push(`Hashtag-stil: ${bk.hashtagStyle}`);
  if (bk.emojiPolicy) lines.push(`Emoji-politik: ${bk.emojiPolicy}`);
  if (Array.isArray(bk.examples) && bk.examples.length)
    lines.push(
      `Eksempel-posts:\n${(bk.examples as string[])
        .slice(0, 2)
        .map((e) => `"${e}"`)
        .join("\n")}`
    );
  return lines.join("\n") || "Ingen brand kit detaljer.";
}

function patternsBlock(patterns: WinningPatternSummary[]): string {
  if (!patterns.length)
    return "Ingen performance-data endnu – byg på generelle best practices.";
  return patterns
    .slice(0, 3)
    .map(
      (p) =>
        `• ${p.hookType}: ${p.avgEngRate} avg. engagement (${p.avgImpressions} visn. i snit)` +
        (p.exampleTexts?.[0]
          ? `\n  Eksempel: "${p.exampleTexts[0].slice(0, 180)}…"`
          : "")
    )
    .join("\n\n");
}

function docsBlock(
  sources: { title: string; extractedText: string }[],
  query: string,
  maxChars = 500
): string {
  if (!sources.length) return "Ingen vidensbase uploadet endnu.";
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const scored = sources
    .map((s) => {
      const combined = `${s.title} ${s.extractedText}`.toLowerCase();
      const score = keywords.filter((kw) => combined.includes(kw)).length;
      return { s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return scored
    .map(({ s }) => `[${s.title}]:\n${s.extractedText.slice(0, maxChars)}`)
    .join("\n\n");
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<unknown | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (err) {
    console.error("[AI] OpenAI call failed:", err);
    return null;
  }
}

// ─── generateWeeklyPlan ───────────────────────────────────────────────────────

/**
 * Generates a weekly content plan.
 * Accepts either the new workspaceSlug-based interface or the legacy one.
 */
export async function generateWeeklyPlan(
  input: WeeklyPlanInput | WeeklyPlanLegacyInput
): Promise<PostDraft[]> {
  if ("workspaceSlug" in input) {
    return _generateWeeklyPlanNew(input as WeeklyPlanInput);
  }
  return _generateWeeklyPlanLegacy(input as WeeklyPlanLegacyInput);
}

async function _generateWeeklyPlanNew(input: WeeklyPlanInput): Promise<PostDraft[]> {
  const ctx = await fetchWorkspaceContext(input.workspaceSlug);
  const startDate = new Date(input.startDate ?? Date.now());
  const themes = input.themes?.length
    ? input.themes
    : ["thought leadership", "case study", "tips & tricks"];

  const systemPrompt = `Du er en ekspert LinkedIn content-strateg for B2B-virksomheder.
Svar KUN med valid JSON. Ingen markdown, ingen forklaringstekst.
Brug UDELUKKENDE data fra brugerens egne materialer.
Brug IKKE eksterne statistikker du ikke kan belægge.`;

  const userPrompt = `Generér ${input.cadence} LinkedIn-post-idéer til næste uge (start: ${startDate.toISOString().slice(0, 10)}).

BRAND KIT:
${brandKitBlock(ctx.brandKit as Record<string, unknown> | null)}

TOP-PERFORMENDE MØNSTRE (lær af disse):
${patternsBlock(ctx.patterns)}

TEMAER:
${themes.join(", ")}

VIDENSBASE:
${docsBlock(ctx.contentSources, themes.join(" "), 400)}

Svar med JSON:
{
  "drafts": [
    {
      "title": "string",
      "postIdea": "2-3 sætninger om post-konceptet",
      "format": "TEXT|IMAGE|VIDEO|CAROUSEL|POLL",
      "suggestedDay": "ISO dato-string",
      "hook": "stærk åbningslinje der stopper scrollet",
      "cta": "call to action optimeret til kommentarer",
      "hashtags": ["#tag"],
      "rationale": "Kort forklaring på HVORFOR dette post bør virke baseret på performance-mønstrene",
      "oneLiner": "Citerbar one-liner fra post-konceptet"
    }
  ]
}`;

  const result = await callOpenAI(systemPrompt, userPrompt);

  if (
    result &&
    typeof result === "object" &&
    Array.isArray((result as Record<string, unknown>).drafts)
  ) {
    const drafts = (result as { drafts: PostDraft[] }).drafts;
    return drafts
      .filter((d) => d.title && d.postIdea && d.format && d.suggestedDay)
      .slice(0, input.cadence);
  }

  return _mockWeeklyPlan(input.cadence, themes, startDate, ctx.patterns);
}

async function _generateWeeklyPlanLegacy(
  input: WeeklyPlanLegacyInput
): Promise<PostDraft[]> {
  const startDate = input.startDate ?? new Date();
  const themes = input.themes?.length
    ? input.themes
    : ["thought leadership", "case study", "tips & tricks"];
  return _mockWeeklyPlan(input.cadence, themes, startDate, input.winningPatterns ?? []);
}

// ─── generatePostSuggestions ──────────────────────────────────────────────────

/**
 * Generates 3 post-copy variations for a given concept, with rationale,
 * one-liner and asset recommendations.
 */
export async function generatePostSuggestions(
  input: PostSuggestionsInput
): Promise<PostSuggestion[]> {
  const ctx = await fetchWorkspaceContext(input.workspaceSlug);

  const assetMeta = ctx.assets
    .slice(0, 30)
    .map(
      (a) =>
        `${a.id} | ${a.filename} | type:${a.type} | tags:${a.tags.join(",")}`
    )
    .join("\n");

  const systemPrompt = `Du er en ekspert LinkedIn copywriter for B2B-virksomheder.
Svar KUN med valid JSON.
Brug IKKE unverificerbare statistikker. Basér alt på brugerens egne data.
Skriv på dansk medmindre brand kit angiver andet.`;

  const userPrompt = `Skriv 3 LinkedIn-post-variationer til dette koncept:
"${input.postIdea}"

BRAND KIT:
${brandKitBlock(ctx.brandKit as Record<string, unknown> | null)}

TOP-PERFORMENDE MØNSTRE:
${patternsBlock(ctx.patterns)}

VIDENSBASE:
${docsBlock(ctx.contentSources, input.postIdea, 500)}

TILGÆNGELIGE ASSETS (id | filnavn | type | tags):
${assetMeta || "Ingen assets uploadet endnu."}

Svar med JSON:
{
  "suggestions": [
    {
      "hook": "stærk åbningslinje",
      "bodyText": "fuldt post-indhold med linjeskift",
      "cta": "CTA optimeret til kommentarer",
      "hashtags": ["#tag"],
      "rationale": "HVORFOR dette virker ud fra dine data",
      "oneLiner": "Citerbar one-liner",
      "recommendedAssets": [
        { "assetId": "id fra asset-listen", "reason": "kort begrundelse" }
      ],
      "visualConcepts": ["beskriv visuelt koncept hvis ingen assets passer"]
    }
  ]
}`;

  const result = await callOpenAI(systemPrompt, userPrompt);

  if (
    result &&
    typeof result === "object" &&
    Array.isArray((result as Record<string, unknown>).suggestions)
  ) {
    return (result as { suggestions: PostSuggestion[] }).suggestions.slice(0, 3);
  }

  return _mockPostSuggestions(input.postIdea, ctx.patterns, ctx.assets);
}

// ─── generatePostCopy (legacy) ────────────────────────────────────────────────

export async function generatePostCopy(input: PostCopyInput): Promise<PostCopy> {
  const topPattern = input.winningPatterns?.[0];
  const brandKeywords =
    (input.brandKit.doWords as string[]) ?? ["indsigt", "vækst", "resultater"];
  const tone = (input.brandKit.toneOfVoice as string) ?? "professionel og direkte";
  const hookStyle = topPattern
    ? `(Brug "${topPattern.hookType}"-format – ${topPattern.avgEngRate} eng. rate)`
    : "";
  const exampleNote = topPattern?.exampleTexts?.[0]
    ? `\n\nRef: "${topPattern.exampleTexts[0].slice(0, 150)}…"`
    : "";

  return {
    hook: `${MOCK_HOOKS[Math.floor(Math.random() * MOCK_HOOKS.length)]} ${hookStyle}`.trim(),
    bodyText:
      `${input.postIdea}\n\n${brandKeywords[0]}-tilgang:\n\n` +
      `✅ Første indsigt\n✅ ${brandKeywords[1] ?? "Vækst"}-observation\n✅ Konkret anbefaling\n\n` +
      `[Tilpas til "${tone}"-tone]` +
      exampleNote,
    cta:
      (input.brandKit.ctaStyle as string) ||
      "Hvad er din erfaring? Del i kommentarerne 👇",
    hashtags: ["#LinkedIn", "#B2BMarketing", "#ContentStrategy", "#Vækst"],
  };
}

// ─── matchAssetsToPost ────────────────────────────────────────────────────────

export async function matchAssetsToPost(input: AssetMatchInput): Promise<string[]> {
  const keywords = input.postIdea
    .toLowerCase()
    .split(/[\s,.\-!?]+/)
    .filter((w) => w.length > 3);

  const scored = input.assets
    .map((asset) => {
      const tags = (asset.tags ?? []).map((t: string) => t.toLowerCase());
      const nameParts = (asset.filename ?? "")
        .toLowerCase()
        .replace(/\.[^.]+$/, "")
        .split(/[-_\s]+/);
      const haystack = [...tags, ...nameParts];
      const score = keywords.filter((kw) =>
        haystack.some((h) => h.includes(kw) || kw.includes(h))
      ).length;
      return { id: asset.id!, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map((a) => a.id);
}

// ─── Mock fallbacks ───────────────────────────────────────────────────────────

const MOCK_HOOKS = [
  "De fleste virksomheder gør dette forkert – og mister leads dagligt.",
  "Vi testede 100 LinkedIn-posts. Her er hvad der virkede.",
  "Den ene ændring der 3x'ede vores kundes engagement.",
  "Stop med at poste om dit produkt. Gør dette i stedet.",
  "Hemmeligheden bag de bedste B2B-profiler på LinkedIn.",
  "Tal vi ikke snakker om i branchen – men burde.",
  "Hvad sker der når du ignorerer LinkedIn-algoritmen? Det her.",
  "3 minutter. Det er hvad det tager at skrive en stærk LinkedIn-post.",
];

const MOCK_IDEAS = [
  {
    title: "Bag om scenen: Vores arbejdsproces",
    postIdea:
      "Del et ærligt kig bag kulisserne på teamets arbejde. Vis de rigtige mennesker – ikke den polerede facade.",
    format: "IMAGE" as const,
  },
  {
    title: "Kundecase: Konkrete resultater",
    postIdea:
      "Præsenter en anonym kundecase med specifikke tal. Fokuser på transformationen, ikke processen.",
    format: "CAROUSEL" as const,
  },
  {
    title: "Industri-indsigt: Det ingen taler om",
    postIdea:
      "Del en kontroversiel holdning til en aktuel branchetendens. Bak den op med erfaring.",
    format: "TEXT" as const,
  },
  {
    title: "Quick tip: Spar tid med dette trick",
    postIdea:
      "Et actionabelt tip din ICP kan bruge med det samme. Overraskende simpelt – stor effekt.",
    format: "TEXT" as const,
  },
  {
    title: "Fejl vi lavede – og hvad vi lærte",
    postIdea:
      "Vær sårbar om en fejl. Autentisk fejl-indhold driver mere engagement end successtories.",
    format: "TEXT" as const,
  },
  {
    title: "Webinar/Event: Tilmeld dig",
    postIdea:
      "Annoncér et kommende event. Fokuser på den konkrete værdi deltageren får.",
    format: "VIDEO" as const,
  },
  {
    title: "Meningsmåling: Hvad mener din ICP?",
    postIdea:
      "Stil et relevant spørgsmål og lad dem stemme. Følg op med indsigter i kommentarerne.",
    format: "POLL" as const,
  },
];

function _mockWeeklyPlan(
  cadence: number,
  themes: string[],
  startDate: Date,
  patterns: WinningPatternSummary[]
): PostDraft[] {
  const topHookType = patterns[0]?.hookType ?? "";
  const drafts: PostDraft[] = [];
  const spacing = Math.floor(7 / cadence);

  for (let i = 0; i < cadence; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i * spacing);
    if (date.getDay() === 0) date.setDate(date.getDate() + 1);
    if (date.getDay() === 6) date.setDate(date.getDate() + 2);

    const idea = MOCK_IDEAS[i % MOCK_IDEAS.length];
    const theme = themes[i % themes.length];
    const patternLabel =
      i === 0 && topHookType ? ` [Top format: ${topHookType}]` : "";

    drafts.push({
      title: `[${theme}] ${idea.title}${patternLabel}`,
      postIdea: idea.postIdea,
      format: idea.format,
      suggestedDay: date.toISOString(),
      hook: MOCK_HOOKS[i % MOCK_HOOKS.length],
      cta: "Hvad er din erfaring? Del i kommentarerne 👇",
      hashtags: ["#LinkedIn", "#B2BMarketing", "#ContentMarketing"],
      rationale:
        patterns.length > 0
          ? `Baseret på dine top-performende posts i "${patterns[0].hookType}"-format (${patterns[0].avgEngRate} eng. rate).`
          : "Generelt best-practice LinkedIn-format for B2B.",
      oneLiner: MOCK_HOOKS[i % MOCK_HOOKS.length].split("–")[0].trim(),
    });
  }
  return drafts;
}

function _mockPostSuggestions(
  postIdea: string,
  patterns: WinningPatternSummary[],
  assets: { id: string; filename: string; tags: string[]; type: string }[]
): PostSuggestion[] {
  const topPattern = patterns[0];
  const keywords = postIdea
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const scoredAssets = assets
    .map((a) => ({
      ...a,
      score: a.tags.filter((t) => keywords.some((k) => t.toLowerCase().includes(k))).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const baseRationale = topPattern
    ? `${topPattern.hookType}-format performer med ${topPattern.avgEngRate} eng. rate i din profil.`
    : "Standard B2B best-practice format.";

  return [
    {
      hook: MOCK_HOOKS[0],
      bodyText: `${postIdea}\n\n✅ Første konkrete indsigt\n✅ Anden observation\n✅ Tredje anbefaling`,
      cta: "Hvad er din erfaring? Skriv i kommentarerne 👇",
      hashtags: ["#LinkedIn", "#B2BMarketing", "#ContentStrategy"],
      rationale: baseRationale,
      oneLiner: MOCK_HOOKS[0].split("–")[0].trim(),
      recommendedAssets: scoredAssets.map((a) => ({
        assetId: a.id,
        reason: `Tags matcher post-tema: ${a.tags.slice(0, 2).join(", ")}`,
      })),
      visualConcepts:
        scoredAssets.length === 0
          ? ["Billede af team i arbejde", "Infografik med key takeaway"]
          : [],
    },
    {
      hook: MOCK_HOOKS[2],
      bodyText: `${postIdea}\n\nDet handler om ét simpelt skift:\n\n→ Fokuser på problemet, ikke løsningen\n→ Vis resultater, ikke processer\n→ Stil spørgsmål, giv ikke svar`,
      cta: "Hvad har I forsøgt? Kom med i diskussionen 💬",
      hashtags: ["#LinkedIn", "#Vækst", "#B2BMarketing"],
      rationale: "Spørgsmål-format driver kommentarer bedre end statement-posts.",
      oneLiner: MOCK_HOOKS[2].split("–")[0].trim(),
      recommendedAssets: [],
      visualConcepts: ["Graf der viser before/after", "Simpelt quote-billede"],
    },
    {
      hook: MOCK_HOOKS[4],
      bodyText: `${postIdea}\n\n3 ting du kan gøre i dag:\n1. [Første handling]\n2. [Anden handling]\n3. [Tredje handling]\n\nResultat: mere engagement, mere rækkevidde.`,
      cta: "Gem dette til senere – og del hvad der virker for jer 🔖",
      hashtags: ["#LinkedInTips", "#ContentMarketing", "#Vækst"],
      rationale: "Lister og action-steps har historisk høj save-rate.",
      oneLiner: "3 ting du kan gøre i dag for at forbedre dit LinkedIn-content.",
      recommendedAssets: scoredAssets.slice(0, 2).map((a) => ({
        assetId: a.id,
        reason: `Visuelt relevant: ${a.tags.slice(0, 1).join(", ")}`,
      })),
      visualConcepts: scoredAssets.length < 2 ? ["Numereret liste som billede"] : [],
    },
  ];
}
