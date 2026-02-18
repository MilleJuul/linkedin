"use client";

import { useState, useCallback, useRef } from "react";
import {
  UploadCloud,
  X,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import type { ColumnMapping } from "@/lib/csv-parser";

type Step = "upload" | "preview" | "mapping" | "importing" | "done" | "error";

interface ParseResult {
  headers: string[];
  detectedMapping: ColumnMapping;
  preview: Record<string, string>[];
  totalRows: number;
  filename: string;
  csvContent: string; // base64
}

interface ImportResult {
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

// Human-readable labels for each mapping field
const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  text: "Post-tekst *",
  publishedAt: "Publiceringstidspunkt *",
  impressions: "Visninger (impressions)",
  likes: "Likes / Reaktioner",
  comments: "Kommentarer",
  shares: "Delinger",
  clicks: "Klik (link clicks)",
  reach: "Rækkevidde (reach)",
  engagements: "Total engagements",
  externalId: "Post ID (valgfrit)",
};

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ["text", "publishedAt"];

export default function ImportClient({ workspaceSlug }: { workspaceSlug: string }) {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: Upload & Parse ──────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Kun .csv filer accepteres");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("phase", "parse");

      const res = await fetch("/api/import/hootsuite", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Parsefejl");

      setParseResult(data as ParseResult);
      setMapping(data.detectedMapping);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // ── Step 2: Confirm mapping & import ────────────────────────────────────────
  async function handleImport() {
    if (!parseResult || !mapping) return;
    setLoading(true);
    setStep("importing");

    try {
      const csvBuffer = Buffer.from(parseResult.csvContent, "base64");
      const csvBlob = new Blob([csvBuffer], { type: "text/csv" });
      const csvFile = new File([csvBlob], parseResult.filename, { type: "text/csv" });

      const formData = new FormData();
      formData.set("file", csvFile);
      formData.set("phase", "import");
      formData.set("workspaceSlug", workspaceSlug);
      formData.set("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/import/hootsuite", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Importfejl");

      setImportResult(data as ImportResult);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukendt fejl");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("upload");
    setParseResult(null);
    setMapping(null);
    setImportResult(null);
    setError(null);
  }

  const missingRequired =
    mapping ? REQUIRED_FIELDS.filter((f) => !mapping[f]) : [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {step === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">Læser CSV-fil…</p>
            </div>
          ) : (
            <>
              <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-blue-500" : "text-gray-300"}`} />
              <p className="text-base font-semibold text-gray-700 mb-1">
                Træk og slip din Hootsuite CSV her
              </p>
              <p className="text-sm text-gray-400 mb-5">
                Kun .csv filer – eksporter fra Hootsuite Analytics → Posts report
              </p>
              <label className="cursor-pointer">
                <span className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition inline-block">
                  Vælg fil
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="sr-only"
                />
              </label>

              {/* Format hint */}
              <div className="mt-8 text-left bg-gray-50 rounded-xl p-4 max-w-lg mx-auto">
                <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Forventede kolonner (systemet auto-detecter)
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {["Post Text / Message", "Date / Published", "Impressions / Views", "Likes / Reactions", "Comments", "Shares", "Link Clicks", "Reach (valgfrit)"].map((col) => (
                    <p key={col} className="text-xs text-gray-500">• {col}</p>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview + Mapping */}
      {(step === "preview" || step === "mapping") && parseResult && mapping && (
        <div className="space-y-6">
          {/* File info */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UploadCloud className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">{parseResult.filename}</p>
                <p className="text-xs text-blue-600">{parseResult.totalRows} rækker fundet</p>
              </div>
            </div>
            <button onClick={reset} className="text-blue-400 hover:text-blue-600 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Column mapping */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Kolonnemapping
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Systemet har auto-detecteret kolonnerne nedenfor. Justér hvis nødvendigt.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    {FIELD_LABELS[field]}
                  </label>
                  <div className="relative">
                    <select
                      value={mapping[field] ?? ""}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev!,
                          [field]: e.target.value || null,
                        }))
                      }
                      className="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                    >
                      <option value="">— Ikke i brug —</option>
                      {parseResult.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>

            {missingRequired.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Påkrævede kolonner mangler mapping:{" "}
                  {missingRequired.map((f) => FIELD_LABELS[f]).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Data preview */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Preview (første 10 rækker)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {parseResult.headers.slice(0, 8).map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parseResult.preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {parseResult.headers.slice(0, 8).map((h) => (
                        <td
                          key={h}
                          className="px-3 py-2 text-gray-600 max-w-[180px] truncate"
                          title={row[h]}
                        >
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="ghost" size="md" onClick={reset}>
              ← Annuller
            </Button>
            <Button
              size="md"
              onClick={handleImport}
              disabled={missingRequired.length > 0 || loading}
            >
              <UploadCloud className="w-4 h-4" />
              Importer {parseResult.totalRows} posts
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === "importing" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-base font-semibold text-gray-700 mb-1">
            Importerer posts…
          </p>
          <p className="text-sm text-gray-400">
            Parser og gemmer performance-data. Dette tager et øjeblik.
          </p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && importResult && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Import fuldført!
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Dine LinkedIn-posts og performance-data er nu tilgængelige i Indsigter.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xl font-bold text-green-700">{importResult.importedCount}</p>
              <p className="text-xs text-green-600 mt-0.5">Posts importeret</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xl font-bold text-gray-600">{importResult.skippedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Sprunget over</p>
            </div>
            <div className={`rounded-xl p-3 ${importResult.errorCount > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
              <p className={`text-xl font-bold ${importResult.errorCount > 0 ? "text-orange-600" : "text-gray-600"}`}>
                {importResult.errorCount}
              </p>
              <p className={`text-xs mt-0.5 ${importResult.errorCount > 0 ? "text-orange-500" : "text-gray-500"}`}>
                Fejl
              </p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="text-left bg-orange-50 rounded-xl p-3 mb-6 max-w-sm mx-auto">
              <p className="text-xs font-semibold text-orange-700 mb-1">Fejldetaljer:</p>
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-orange-600">{e}</p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="md" onClick={reset}>
              <RefreshCw className="w-4 h-4" />
              Upload ny CSV
            </Button>
            <Button
              size="md"
              onClick={() => window.location.href = window.location.href.replace("/import", "/insights")}
            >
              Se Indsigter →
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {step === "error" && (
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Noget gik galt</h3>
          <p className="text-sm text-red-500 mb-6">{error}</p>
          <Button variant="outline" size="md" onClick={reset}>
            Prøv igen
          </Button>
        </div>
      )}
    </div>
  );
}
