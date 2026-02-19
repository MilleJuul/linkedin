"use client";

import { useState, useCallback, useTransition } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { createAsset } from "@/actions/assets";
import { UploadCloud, X, ImageIcon, Video, Loader2 } from "lucide-react";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
}

interface FilePreview {
  file: File;
  preview: string;
  type: "IMAGE" | "VIDEO";
  tags: string;
}

export default function UploadModal({
  open,
  onClose,
  workspaceSlug,
}: UploadModalProps) {
  const [isPending, startTransition] = useTransition();
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [success, setSuccess] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const newPreviews: FilePreview[] = arr
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
        type: f.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        tags: "",
      }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
  }

  function removePreview(index: number) {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateTags(index: number, tags: string) {
    setPreviews((prev) =>
      prev.map((p, i) => (i === index ? { ...p, tags } : p))
    );
  }

  async function handleUpload() {
    startTransition(async () => {
      for (const item of previews) {
        // 1. Upload the actual file to Vercel Blob storage
        const uploadForm = new FormData();
        uploadForm.set("file", item.file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          console.error("Upload fejlede:", err);
          continue;
        }

        const { url, thumbnailUrl } = await uploadRes.json();

        // 2. Save asset record with the real URL
        const formData = new FormData();
        formData.set("filename", item.file.name);
        formData.set("url", url);
        formData.set("thumbnailUrl", thumbnailUrl ?? url);
        formData.set("type", item.type);
        formData.set("tags", item.tags);
        await createAsset(workspaceSlug, formData);
      }
      setSuccess(true);
      setTimeout(() => {
        setPreviews([]);
        setSuccess(false);
        onClose();
      }, 1200);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload assets" size="lg">
      <div className="p-6 space-y-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <UploadCloud
            className={`w-10 h-10 mx-auto mb-3 ${
              isDragging ? "text-blue-500" : "text-gray-300"
            }`}
          />
          <p className="text-sm font-medium text-gray-700 mb-1">
            Træk og slip filer her
          </p>
          <p className="text-xs text-gray-400 mb-4">
            PNG, JPG, GIF, MP4, MOV – maks. 50 MB pr. fil
          </p>
          <label className="cursor-pointer">
            <span className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition">
              Vælg filer
            </span>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileInput}
              className="sr-only"
            />
          </label>
        </div>

        {/* Previews */}
        {previews.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">
              {previews.length} fil{previews.length > 1 ? "er" : ""} klar til upload
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {previews.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                    {item.type === "IMAGE" ? (
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate mb-1">
                      {item.file.name}
                    </p>
                    <input
                      value={item.tags}
                      onChange={(e) => updateTags(i, e.target.value)}
                      placeholder="Tags (kommasepareret)..."
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Type badge */}
                  <div className="flex-shrink-0">
                    {item.type === "IMAGE" ? (
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Video className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removePreview(i)}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 text-center font-medium">
            ✅ {previews.length} assets uploadet!
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" size="md" onClick={onClose}>
            Annuller
          </Button>
          <Button
            size="md"
            onClick={handleUpload}
            disabled={previews.length === 0 || isPending || success}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploader...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Upload {previews.length > 0 ? `${previews.length} fil${previews.length > 1 ? "er" : ""}` : "filer"}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
