"use client";

import { useState, useCallback, useTransition } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { UploadCloud, X, FileText, Loader2 } from "lucide-react";

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
  onUploaded: () => void;
}

interface FileItem {
  file: File;
  title: string;
  tags: string;
}

const ACCEPTED = ".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv";

export default function DocumentUploadModal({
  open,
  onClose,
  workspaceSlug,
  onUploaded,
}: DocumentUploadModalProps) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(
      (f) =>
        f.type === "application/pdf" ||
        f.type === "text/plain" ||
        f.type === "text/markdown" ||
        f.type === "text/csv" ||
        f.name.endsWith(".md") ||
        f.name.endsWith(".txt") ||
        f.name.endsWith(".pdf") ||
        f.name.endsWith(".csv")
    );
    setItems((prev) => [
      ...prev,
      ...arr.map((f) => ({ file: f, title: f.name.replace(/\.[^.]+$/, ""), tags: "" })),
    ]);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: "title" | "tags", value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleUpload() {
    setError(null);
    startTransition(async () => {
      for (const item of items) {
        const formData = new FormData();
        formData.set("file", item.file);
        formData.set("title", item.title);
        formData.set("tags", item.tags);
        formData.set("workspaceSlug", workspaceSlug);

        const res = await fetch("/api/upload/document", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error ?? "Upload fejlede");
          return;
        }
      }
      setSuccess(true);
      setTimeout(() => {
        setItems([]);
        setSuccess(false);
        onUploaded();
        onClose();
      }, 1200);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload dokumenter" size="lg">
      <div className="p-6 space-y-5">
        <p className="text-sm text-gray-500">
          Upload rapporter, artikler, notater eller anden tekst som AI&apos;en kan bruge som grundlag for at skrive LinkedIn-opslag.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <FileText
            className={`w-10 h-10 mx-auto mb-3 ${isDragging ? "text-blue-500" : "text-gray-300"}`}
          />
          <p className="text-sm font-medium text-gray-700 mb-1">Træk og slip dokumenter her</p>
          <p className="text-xs text-gray-400 mb-4">PDF, TXT, MD, CSV – maks. 20 MB pr. fil</p>
          <label className="cursor-pointer">
            <span className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition">
              Vælg filer
            </span>
            <input
              type="file"
              multiple
              accept={ACCEPTED}
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
              className="sr-only"
            />
          </label>
        </div>

        {/* File list */}
        {items.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">
              {items.length} dokument{items.length > 1 ? "er" : ""} klar til upload
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <FileText className="w-8 h-8 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-xs text-gray-400">{item.file.name}</p>
                    <input
                      value={item.title}
                      onChange={(e) => updateItem(i, "title", e.target.value)}
                      placeholder="Titel..."
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      value={item.tags}
                      onChange={(e) => updateItem(i, "tags", e.target.value)}
                      placeholder="Tags (kommasepareret)..."
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 text-center font-medium">
            ✅ {items.length} dokument{items.length > 1 ? "er" : ""} uploadet!
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" size="md" onClick={onClose}>Annuller</Button>
          <Button
            size="md"
            onClick={handleUpload}
            disabled={items.length === 0 || isPending || success}
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Uploader...</>
            ) : (
              <><UploadCloud className="w-4 h-4" />Upload {items.length > 0 ? `${items.length} dokument${items.length > 1 ? "er" : ""}` : "dokumenter"}</>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
