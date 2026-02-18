"use client";

import { useState, useTransition } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { createPost } from "@/actions/posts";
import { Loader2, FileText } from "lucide-react";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
}

export default function CreatePostModal({
  open,
  onClose,
  workspaceSlug,
}: CreatePostModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createPost(workspaceSlug, formData);
      if (!result.success) {
        setError(result.error ?? "Ukendt fejl");
        return;
      }
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Nyt opslag" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Titel <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            required
            placeholder="Giv dit opslag en arbejdstitel..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Hook (valgfrit)
          </label>
          <textarea
            name="hook"
            rows={2}
            placeholder="Åbningslinje der stopper scrollet..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Status
          </label>
          <select
            name="status"
            defaultValue="DRAFT"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="DRAFT">Kladde</option>
            <option value="REVIEW">Til godkendelse</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" size="md" type="button" onClick={onClose}>
            Annuller
          </Button>
          <Button size="md" type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opretter...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Opret opslag
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
