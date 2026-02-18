/**
 * AI Service Layer
 *
 * MVP: Alle funktioner returnerer mock data.
 * For at plugge en rigtig LLM ind: erstat implementationerne nedenfor med
 * kald til fx OpenAI, Anthropic eller en anden AI-udbyder.
 *
 * Interface er designet til nem udskiftning – skift kun function bodies,
 * ikke signaturer.
 */

import { BrandKit, Asset } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PostDraft {
  title: string;
  postIdea: string;
  format: "TEXT" | "IMAGE" | "VIDEO" | "CAROUSEL" | "POLL";
  suggestedDay: string; // ISO date string
  hook?: string;
  bodyText?: string;
  cta?: string;
  hashtags?: string[];
}

export interface PostCopy {
  hook: string;
  bodyText: string;
  cta: string;
  hashtags: string[];
}

export interface WeeklyPlanInput {
  brandKit: Partial<BrandKit>;
  pastPostsSummary: string;
  cadence: number; // posts per week
  themes?: string[];
  startDate?: Date;
}

export interface PostCopyInput {
  brandKit: Partial<BrandKit>;
  postIdea: string;
  selectedAssets?: Partial<Asset>[];
}

export interface AssetMatchInput {
  postIdea: string;
  assets: Partial<Asset>[];
}

// ─── Mock Data Helpers ────────────────────────────────────────────────────────

const MOCK_HOOKS = [
  "De fleste virksomheder gør dette forkert – og mister leads dagligt.",
  "Vi testede 100 LinkedIn-posts. Her er hvad der virkede.",
  "Den ene ændring der 3x'ede vores kundes engagement.",
  "Stop med at poste om dit produkt. Gør dette i stedet.",
  "Hemmeligheden bag de bedste B2B-profiler på LinkedIn.",
  "Tal vi ikke snakker om i branchen – men burde.",
  "Hvad sker der når du ignorerer LinkedIn-algoritmen? Det her.",
  "3 minutter. Det er hvad det tager at skrive en viral LinkedIn-post.",
];

const MOCK_FORMATS: PostDraft["format"][] = [
  "TEXT",
  "IMAGE",
  "CAROUSEL",
  "VIDEO",
  "POLL",
];

const MOCK_IDEAS = [
  {
    title: "Bag om scenen: Vores arbejdsproces",
    postIdea:
      "Del et ærligt kig bag kulisserne på hvordan teamet arbejder. Vis de rigtige mennesker, ikke den polerede facade.",
    format: "IMAGE" as const,
  },
  {
    title: "Kundecase: Konkrete resultater",
    postIdea:
      "Præsenter en anonym kundecase med specifikke tal og resultater. Fokuser på transformationen, ikke processen.",
    format: "CAROUSEL" as const,
  },
  {
    title: "Industri-indsigt: Det ingen taler om",
    postIdea:
      "Del en kontroversiel holdning til en aktuel tendens i branchen. Bak den op med data eller personlig erfaring.",
    format: "TEXT" as const,
  },
  {
    title: "Quick tip: Spar tid med dette trick",
    postIdea:
      "Et actionabelt tip din ICP kan bruge med det samme. Gerne noget overraskende simpelt der giver stor effekt.",
    format: "TEXT" as const,
  },
  {
    title: "Fejl vi lavede – og hvad vi lærte",
    postIdea:
      "Vær sårbar og ærlig om en fejl. Folk engagerer sig mere på autentisk fejl-indhold end på successtories.",
    format: "TEXT" as const,
  },
  {
    title: "Webinar/Event: Tilmeld dig",
    postIdea:
      "Annoncér et kommende event eller webinar. Fokuser på den konkrete værdi deltageren får, ikke eventet selv.",
    format: "VIDEO" as const,
  },
  {
    title: "Meningsmåling: Hvad mener din ICP?",
    postIdea:
      "Stil et spørgsmål der er relevant for din ICP og lad dem stemme. Følg op med indsigter i kommentarerne.",
    format: "POLL" as const,
  },
];

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Genererer en ugentlig indholdplan baseret på brand kit og kadence.
 *
 * TODO (production): Erstat med LLM-kald der bruger brandKit + pastPostsSummary
 * til at generere kontekst-bevidste forslag.
 */
export async function generateWeeklyPlan(
  input: WeeklyPlanInput
): Promise<PostDraft[]> {
  // Simuler async AI-kald
  await new Promise((r) => setTimeout(r, 500));

  const startDate = input.startDate ?? new Date();
  const drafts: PostDraft[] = [];

  const themes =
    input.themes && input.themes.length > 0
      ? input.themes
      : ["thought leadership", "case study", "tips & tricks"];

  // Fordel posts jævnt over ugen
  const daysInWeek = 7;
  const spacing = Math.floor(daysInWeek / input.cadence);

  for (let i = 0; i < input.cadence; i++) {
    const dayOffset = i * spacing;
    const suggestedDate = new Date(startDate);
    suggestedDate.setDate(suggestedDate.getDate() + dayOffset);

    // Skip weekender (lørdag = 6, søndag = 0)
    if (suggestedDate.getDay() === 0) suggestedDate.setDate(suggestedDate.getDate() + 1);
    if (suggestedDate.getDay() === 6) suggestedDate.setDate(suggestedDate.getDate() + 2);

    const ideaIndex = i % MOCK_IDEAS.length;
    const idea = MOCK_IDEAS[ideaIndex];
    const theme = themes[i % themes.length];

    drafts.push({
      title: `[${theme}] ${idea.title}`,
      postIdea: idea.postIdea,
      format: idea.format,
      suggestedDay: suggestedDate.toISOString(),
      hook: MOCK_HOOKS[i % MOCK_HOOKS.length],
      hashtags: ["#LinkedIn", "#B2BMarketing", "#ContentMarketing"],
    });
  }

  return drafts;
}

/**
 * Genererer post-tekst (hook, body, CTA, hashtags) baseret på brand kit og idé.
 *
 * TODO (production): Erstat med LLM-prompt der bruger brandKit.toneOfVoice,
 * doWords, dontWords og postIdea til at generere on-brand copy.
 */
export async function generatePostCopy(input: PostCopyInput): Promise<PostCopy> {
  // Simuler async AI-kald
  await new Promise((r) => setTimeout(r, 700));

  const brandKeywords = input.brandKit.doWords ?? ["indsigt", "vækst", "resultater"];
  const tone = input.brandKit.toneOfVoice ?? "professionel og direkte";

  // Mock: Generer simpel struktur baseret på input
  const hook = `${MOCK_HOOKS[Math.floor(Math.random() * MOCK_HOOKS.length)]}`;

  const bodyText = `${input.postIdea}\n\nBaseret på vores erfaring og ${brandKeywords[0]}-tilgang:\n\n✅ Første indsigt relateret til emnet\n✅ Anden ${brandKeywords[1]}-drevet observation\n✅ Tredje konkrete anbefaling\n\n[Uddyb med specifik data og eksempler der passer til '${tone}'-tonen]`;

  const cta =
    input.brandKit.ctaStyle ||
    "Hvad er din erfaring? Del din tanker i kommentarerne 👇";

  const hashtags = ["#LinkedIn", "#B2BMarketing", "#ContentStrategy", "#Vækst"].slice(0, 4);

  return { hook, bodyText, cta, hashtags };
}

/**
 * Matcher assets til en post baseret på tag-overlap med postIdea keywords.
 *
 * TODO (production): Erstat med embedding-baseret semantic search eller
 * LLM-rangering baseret på visuel og tekstuel relevans.
 */
export async function matchAssetsToPost(
  input: AssetMatchInput
): Promise<string[]> {
  // Simuler async AI-kald
  await new Promise((r) => setTimeout(r, 300));

  // Ekstraher keywords fra postIdea
  const keywords = input.postIdea
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  // Score assets baseret på tag-overlap
  const scored = input.assets
    .map((asset) => {
      const tags = (asset.tags ?? []).map((t: string) => t.toLowerCase());
      const score = keywords.filter((kw) =>
        tags.some((tag: string) => tag.includes(kw) || kw.includes(tag))
      ).length;
      return { id: asset.id!, score };
    })
    .sort((a, b) => b.score - a.score || Math.random() - 0.5); // Random tiebreaker

  return scored.slice(0, 6).map((a) => a.id);
}
