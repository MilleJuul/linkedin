"use client";

import { useTransition, useState } from "react";
import { createWorkspace } from "@/actions/workspace";
import { slugify } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Building2, Loader2 } from "lucide-react";

export default function OnboardingClient() {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugEdited) {
      setSlug(slugify(val));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createWorkspace(formData);
      if (result && !result.success) {
        setError(result.error ?? "Ukendt fejl");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Workspace-navn <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          placeholder="Fx: Acme A/S eller Mit Brand"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          URL-slug <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
          <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-300">
            /app/
          </span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            required
            pattern="[a-z0-9-]+"
            placeholder="mit-brand"
            className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Kun små bogstaver, tal og bindestreger
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending || !name || !slug}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Opretter workspace...
          </>
        ) : (
          <>
            <Building2 className="w-4 h-4" />
            Opret workspace
          </>
        )}
      </Button>
    </form>
  );
}
