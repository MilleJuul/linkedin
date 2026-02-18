"use client";

import { useState, useTransition } from "react";
import { BrandKit } from "@prisma/client";
import { upsertBrandKit } from "@/actions/brand-kit";
import Button from "@/components/ui/Button";
import {
  Save,
  Loader2,
  Sparkles,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SettingsClientProps {
  workspace: { id: string; name: string; slug: string };
  brandKit: BrandKit | null;
  workspaceSlug: string;
}

export default function SettingsClient({
  workspace,
  brandKit,
  workspaceSlug,
}: SettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string>("tone");

  // Form state
  const [toneOfVoice, setToneOfVoice] = useState(brandKit?.toneOfVoice ?? "");
  const [doWords, setDoWords] = useState(
    brandKit?.doWords.join(", ") ?? ""
  );
  const [dontWords, setDontWords] = useState(
    brandKit?.dontWords.join(", ") ?? ""
  );
  const [ctaStyle, setCtaStyle] = useState(brandKit?.ctaStyle ?? "");
  const [hashtagStyle, setHashtagStyle] = useState(
    brandKit?.hashtagStyle ?? ""
  );
  const [emojiPolicy, setEmojiPolicy] = useState(brandKit?.emojiPolicy ?? "");
  const [examples, setExamples] = useState<string[]>(
    brandKit?.examples.length ? brandKit.examples : [""]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    // Manually set examples (multi-value)
    examples.forEach((ex) => {
      if (ex.trim()) formData.append("examples", ex);
    });

    startTransition(async () => {
      const result = await upsertBrandKit(workspaceSlug, formData);
      if (!result.success) {
        setError(result.error ?? "Ukendt fejl");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  function toggleSection(s: string) {
    setOpenSection((prev) => (prev === s ? "" : s));
  }

  const Section = ({
    id,
    title,
    description,
    children,
  }: {
    id: string;
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition text-left"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        {openSection === id ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {openSection === id && (
        <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-white">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Indstillinger</h1>
        <p className="text-gray-500 text-sm">
          Konfigurér brand kit og guidelines for {workspace.name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Brand Kit header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Brand Kit</h2>
            <p className="text-xs text-gray-400">
              Definerer tonen og stilen for alt LinkedIn-indhold i dette workspace
            </p>
          </div>
        </div>

        {/* Tone of voice */}
        <Section
          id="tone"
          title="Tone of voice"
          description="Beskriv din brands kommunikationsstil og personlighed"
        >
          <textarea
            name="toneOfVoice"
            value={toneOfVoice}
            onChange={(e) => setToneOfVoice(e.target.value)}
            rows={4}
            placeholder="Fx: Professionel men tilgængelig. Vi taler direkte til beslutningstager med indsigt og autoritet – aldrig arrogant."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mt-3"
          />
        </Section>

        {/* Do/Don't words */}
        <Section
          id="words"
          title="Ord & vendinger"
          description="Ord der styrker dit brand – og ord der skal undgås"
        >
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-semibold text-green-700 mb-1.5">
                ✅ Foretrukne ord (kommasepareret)
              </label>
              <textarea
                name="doWords"
                value={doWords}
                onChange={(e) => setDoWords(e.target.value)}
                rows={3}
                placeholder="indsigt, vækst, resultat, transformation..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-red-700 mb-1.5">
                ❌ Ord der skal undgås (kommasepareret)
              </label>
              <textarea
                name="dontWords"
                value={dontWords}
                onChange={(e) => setDontWords(e.target.value)}
                rows={3}
                placeholder="billig, hurtig fix, nemt, simpelt..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
          </div>
        </Section>

        {/* CTA Style */}
        <Section
          id="cta"
          title="CTA-stil"
          description="Hvordan skal call-to-action formuleres i dine posts"
        >
          <textarea
            name="ctaStyle"
            value={ctaStyle}
            onChange={(e) => setCtaStyle(e.target.value)}
            rows={3}
            placeholder="Fx: Afslut altid med et spørgsmål der inviterer til dialog. Brug 'Du' ikke 'man'."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mt-3"
          />
        </Section>

        {/* Hashtag style */}
        <Section
          id="hashtags"
          title="Hashtag-stil"
          description="Konventioner for brug af hashtags i LinkedIn-posts"
        >
          <textarea
            name="hashtagStyle"
            value={hashtagStyle}
            onChange={(e) => setHashtagStyle(e.target.value)}
            rows={3}
            placeholder="Fx: 3-5 hashtags. Mix af niche (#B2BMarketing) og brede (#LinkedIn). CamelCase format."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mt-3"
          />
        </Section>

        {/* Emoji policy */}
        <Section
          id="emoji"
          title="Emoji-politik"
          description="Regler for brug af emojis i dit indhold"
        >
          <textarea
            name="emojiPolicy"
            value={emojiPolicy}
            onChange={(e) => setEmojiPolicy(e.target.value)}
            rows={3}
            placeholder="Fx: Brug emojis sparsomt. Maks 2-3 pr. post. Aldrig i starten af et afsnit."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mt-3"
          />
        </Section>

        {/* Examples */}
        <Section
          id="examples"
          title="Eksempler på godt indhold"
          description="Posts der repræsenterer din brands stemme – bruges som AI-reference"
        >
          <div className="space-y-3 mt-3">
            {examples.map((ex, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  value={ex}
                  onChange={(e) => {
                    const updated = [...examples];
                    updated[i] = e.target.value;
                    setExamples(updated);
                  }}
                  rows={4}
                  placeholder={`Eksempel ${i + 1}: Indsæt et godt LinkedIn-opslag der repræsenterer din brand-stemme...`}
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                {examples.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExamples((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="self-start px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                  >
                    Fjern
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setExamples((prev) => [...prev, ""])}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Tilføj eksempel
            </button>
          </div>
        </Section>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center justify-between pt-4">
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Brand kit gemt!
            </div>
          )}
          <div className={saved ? "" : "ml-auto"}>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gemmer...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Gem brand kit
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
