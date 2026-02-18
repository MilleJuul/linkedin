"use client";

import { useState } from "react";
import { BarChart2, Wand2, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import WeeklyPlanModal from "@/components/WeeklyPlanModal";

interface OverviewClientProps {
  workspaceSlug: string;
}

export default function OverviewClient({ workspaceSlug }: OverviewClientProps) {
  const [analysing, setAnalysing] = useState(false);
  const [analysed, setAnalysed] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

  function handleAnalyse() {
    setAnalysing(true);
    setTimeout(() => {
      setAnalysing(false);
      setAnalysed(true);
    }, 1800);
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            AI-assistance
          </h2>
          <Wand2 className="w-4 h-4 text-purple-400" />
        </div>

        <div className="space-y-3">
          {/* Analyse data */}
          <div className="border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Analysér indholdsdata
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Få indsigt i dine bedste posts og hvad der virker
            </p>

            {!analysed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyse}
                disabled={analysing}
              >
                {analysing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyserer...
                  </>
                ) : (
                  <>
                    <BarChart2 className="w-3.5 h-3.5" />
                    Analysér data
                  </>
                )}
              </Button>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 text-center py-2">
                  📊 Ingen analysedata endnu – publicér posts for at se statistik
                </p>
              </div>
            )}
          </div>

          {/* Generér ugeplan */}
          <div className="border border-purple-100 bg-purple-50 rounded-xl p-4">
            <p className="text-sm font-medium text-purple-900 mb-1">
              Generér ugeplan
            </p>
            <p className="text-xs text-purple-600 mb-3">
              AI opretter et indholdsforslag til næste uge baseret på dit brand kit
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowWeeklyModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Generér ugeplan
            </Button>
          </div>
        </div>
      </div>

      <WeeklyPlanModal
        open={showWeeklyModal}
        onClose={() => setShowWeeklyModal(false)}
        workspaceSlug={workspaceSlug}
      />
    </>
  );
}
