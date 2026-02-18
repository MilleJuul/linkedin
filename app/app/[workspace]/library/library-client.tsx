"use client";

import { useState, useMemo } from "react";
import { Asset } from "@prisma/client";
import AssetGrid from "@/components/AssetGrid";
import UploadModal from "@/components/UploadModal";
import Button from "@/components/ui/Button";
import { UploadCloud, Search, X, Image as ImageIcon, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface LibraryClientProps {
  assets: Asset[];
  allTags: string[];
  workspaceSlug: string;
}

type TypeFilter = "ALL" | "IMAGE" | "VIDEO";

export default function LibraryClient({
  assets,
  allTags,
  workspaceSlug,
}: LibraryClientProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let result = assets;

    if (typeFilter !== "ALL") {
      result = result.filter((a) => a.type === typeFilter);
    }

    if (selectedTags.length > 0) {
      result = result.filter((a) =>
        selectedTags.every((tag) => a.tags.includes(tag))
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.filename.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [assets, typeFilter, selectedTags, search]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const imageCount = assets.filter((a) => a.type === "IMAGE").length;
  const videoCount = assets.filter((a) => a.type === "VIDEO").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bibliotek</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {assets.length} assets ({imageCount} billeder, {videoCount} videoer)
            </p>
          </div>
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <UploadCloud className="w-4 h-4" />
            Upload assets
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg i filnavn eller tags..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(["ALL", "IMAGE", "VIDEO"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                  typeFilter === t
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t === "IMAGE" && <ImageIcon className="w-3.5 h-3.5" />}
                {t === "VIDEO" && <Video className="w-3.5 h-3.5" />}
                {t === "ALL" ? "Alle" : t === "IMAGE" ? "Billeder" : "Videoer"}
              </button>
            ))}
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {allTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                    selectedTags.includes(tag)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Ryd filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 && assets.length > 0 ? (
          <div className="text-center py-20">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              Ingen assets matcher dit søgefilter
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Prøv at ændre dine filtre eller søgeord
            </p>
          </div>
        ) : (
          <AssetGrid
            assets={filtered}
            workspaceSlug={workspaceSlug}
          />
        )}
      </div>

      {/* Upload modal */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
