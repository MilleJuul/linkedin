"use client";

import { Asset } from "@prisma/client";
import Image from "next/image";
import { Video, Image as ImageIcon, Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteAsset } from "@/actions/assets";
import { useTransition } from "react";

interface AssetGridProps {
  assets: Asset[];
  workspaceSlug: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (assetId: string) => void;
}

export default function AssetGrid({
  assets,
  workspaceSlug,
  selectable = false,
  selectedIds = [],
  onSelect,
}: AssetGridProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(assetId: string) {
    if (!confirm("Er du sikker på, at du vil slette dette asset?")) return;
    startTransition(async () => {
      await deleteAsset(assetId, workspaceSlug);
    });
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <ImageIcon className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Ingen assets i biblioteket
        </h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Upload billeder og videoer for at komme i gang med dit indholdsbibliotek.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {assets.map((asset) => {
        const isSelected = selectedIds.includes(asset.id);

        return (
          <div
            key={asset.id}
            onClick={() => selectable && onSelect?.(asset.id)}
            className={cn(
              "group relative bg-gray-100 rounded-xl overflow-hidden aspect-square",
              selectable && "cursor-pointer",
              isSelected && "ring-2 ring-blue-500 ring-offset-1"
            )}
          >
            {/* Thumbnail – only render <Image> for IMAGE type so a video URL
                stored as thumbnailUrl never breaks the layout. */}
            {asset.type === "IMAGE" && asset.thumbnailUrl ? (
              <Image
                src={asset.thumbnailUrl}
                alt={asset.filename}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {asset.type === "VIDEO" ? (
                  <Video className="w-8 h-8 text-gray-400" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
            )}

            {/* Video indicator */}
            {asset.type === "VIDEO" && (
              <div className="absolute top-2 left-2">
                <div className="bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  Video
                </div>
              </div>
            )}

            {/* Selection checkmark */}
            {selectable && isSelected && (
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
              <p className="text-white text-xs font-medium truncate mb-1">
                {asset.filename}
              </p>
              {asset.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-white/70" />
                  <p className="text-white/70 text-xs truncate">
                    {asset.tags.slice(0, 2).join(", ")}
                  </p>
                </div>
              )}
              {!selectable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(asset.id);
                  }}
                  disabled={isPending}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
