"use client";

import { useState, useTransition } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { generateWeeklyPlan } from "@/lib/ai";
import { createPostsFromWeeklyPlan } from "@/actions/posts";
import { formatDate } from "@/lib/utils";
import { Loader2, Wand2, Plus, Calendar } from "lucide-react";

interface WeeklyPlanModalProps {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
}

export default function WeeklyPlanModal({
  open,
  onClose,
  workspaceSlug,
}: WeeklyPlanModalProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [cadence, setCadence] = useState(3);
  const [themes, setThemes] = useState("");
  const [drafts, setDrafts] = useState<
    {
      title: string;
      postIdea: string;
      format: string;
      suggestedDay: string;
      hook?: string;
      hashtags?: string[];
    }[]
  >([]);
  const [success, setSuccess] = useState(false);

  async function handleGenerate() {
    const themeList = themes
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await generateWeeklyPlan({
        brandKit: {},
        pastPostsSummary: "",
        cadence,
        themes: themeList,
        startDate: new Date(),
      });
      setDrafts(result);
      setStep("preview");
    });
  }

  async function handleCreate() {
    startTransition(async () => {
      await createPostsFromWeeklyPlan(workspaceSlug, drafts);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setStep("form");
        setSuccess(false);
        setDrafts([]);
      }, 1500);
    });
  }

  const FORMAT_LABELS: Record<string, string> = {
    TEXT: "Tekst",
    IMAGE: "Billede",
    VIDEO: "Video",
    CAROUSEL: "Karrusel",
    POLL: "Afstemning",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generér ugeplan"
      size="lg"
    >
      <div className="p-6">
        {step === "form" && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <div className="flex gap-3">
                <Wand2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-purple-900 mb-1">
                    AI-drevet ugeplan
                  </p>
                  <p className="text-sm text-purple-700">
                    Fortæl AI om din kadence og temaer, og få forslag til
                    næste uges posts som kladder i dit workflow.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Antal posts pr. uge
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCadence(n)}
                    className={`w-12 h-12 rounded-xl border-2 text-sm font-semibold transition-colors ${
                      cadence === n
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Anbefalet: 3 posts/uge for optimal rækkevidde
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temaer (valgfrit, kommasepareret)
              </label>
              <input
                value={themes}
                onChange={(e) => setThemes(e.target.value)}
                placeholder="fx thought leadership, case study, branchtips"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Lad feltet stå tomt for en blanding af formater
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="md" onClick={onClose}>
                Annuller
              </Button>
              <Button
                size="md"
                onClick={handleGenerate}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Genererer...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generér forslag
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              AI har foreslået {drafts.length} posts til næste uge. Gennemgå
              forslagene og opret dem som kladder.
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {drafts.map((draft, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl p-4 hover:border-blue-200 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {draft.title}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">
                        {FORMAT_LABELS[draft.format] ?? draft.format}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                    {draft.postIdea}
                  </p>
                  {draft.hook && (
                    <p className="text-xs text-blue-600 italic mb-2">
                      &ldquo;{draft.hook}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>Foreslår: {formatDate(draft.suggestedDay)}</span>
                  </div>
                </div>
              ))}
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 font-medium text-center">
                ✅ {drafts.length} kladder oprettet!
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setStep("form")}
              >
                ← Generer igen
              </Button>
              <Button
                size="md"
                onClick={handleCreate}
                disabled={isPending || success}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opretter...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Opret {drafts.length} kladder
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
