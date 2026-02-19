"use client";

import { useState, useMemo, useTransition } from "react";
import { Asset, ContentSource } from "@prisma/client";
import AssetGrid from "@/components/AssetGrid";
import UploadModal from "@/components/UploadModal";
import DocumentUploadModal from "@/components/DocumentUploadModal";
import Button from "@/components/ui/Button";
import {
  UploadCloud,
  Search,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteContentSource } from "@/actions/content-sources";
import { useRouter } from "next/navigation";

interface LibraryClientProps {
  assets: Asset[];
  allTags: string[];
  contentSources: ContentSource[];
  workspaceSlug: string;
}

type TypeFilter = "ALL" | "IMAGE" | "VIDEO";
type Tab = "assets" | "documents";

export default function LibraryClient({
  assets,
  allTags,
  contentSources,
  workspaceSlug,
}: LibraryClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("assets");
  const [showUpload, setShowUpload] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

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

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return contentSources;
    const q = search.toLowerCase();
    return contentSources.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.filename.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [contentSources, search]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleDeleteDocument(id: string) {
    startTransition(async () => {
      await deleteContentSource(id, workspaceSlug);
      router.refresh();
    });
  }

  const imageCount = assets.filter((a) => a.type === "IMAGE").length;
  const videoCount = assets.filter((a) => a.type === "VIDEO").length;

  const FILE_TYPE_ICON: Record<string, string> = {
    pdf: "PDF",
    txt: "TXT",
    md: "MD",
    csv: "CSV",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bibliotek</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {assets.length} assets ({imageCount} billeder, {videoCount} videoer) · {contentSources.length} dokumenter
            </p>
          </div>
          {tab === "assets" ? (
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <UploadCloud className="w-4 h-4" />
              Upload billeder/video
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowDocUpload(true)}>
              <UploadCloud className="w-4 h-4" />
              Upload dokument
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          <button
            onClick={() => setTab("assets")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
              tab === "assets"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-500 hover:bg-gray-100"
            )}
          >
            <ImageIcon className="w-4 h-4" />
            Billeder & video
          </button>
          <button
            onClick={() => setTab("documents")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
              tab === "documents"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-500 hover:bg-gray-100"
            )}
          >
            <FileText className="w-4 h-4" />
            Dokumenter / Kilder
            {contentSources.length > 0 && (
              <span className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                {contentSources.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters bar (assets tab only) */}
      {tab === "assets" && (
        <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
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
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "assets" ? (
          filtered.length === 0 && assets.length > 0 ? (
            <div className="text-center py-20">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">
                Ingen assets matcher dit søgefilter
              </p>
            </div>
          ) : (
            <AssetGrid assets={filtered} workspaceSlug={workspaceSlug} />
          )
        ) : (
          /* Documents tab */
          <div>
            {contentSources.length === 0 ? (
              <div className="text-center py-24">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Ingen dokumenter endnu
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  Upload rapporter, artikler eller notater som AI&apos;en kan bruge som kilde
                </p>
                <Button size="sm" onClick={() => setShowDocUpload(true)}>
                  <UploadCloud className="w-4 h-4" />
                  Upload dit første dokument
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocs.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">
                        {FILE_TYPE_ICON[source.fileType] ?? source.fileType}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {source.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{source.filename}</p>
                      {source.tags.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-1.5">
                          {source.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-300 mt-1.5">
                        {source.extractedText.slice(0, 120).replace(/\s+/g, " ")}…
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {new Date(source.createdAt).toLocaleDateString("da-DK")}
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(source.id)}
                      disabled={isPending}
                      className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition"
                      title="Slet dokument"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        workspaceSlug={workspaceSlug}
        onUploaded={() => router.refresh()}
      />

      <DocumentUploadModal
        open={showDocUpload}
        onClose={() => setShowDocUpload(false)}
        workspaceSlug={workspaceSlug}
        onUploaded={() => router.refresh()}
      />
    </div>
  );
}
