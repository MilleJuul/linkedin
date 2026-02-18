import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "d. MMM yyyy", { locale: da });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "d. MMM yyyy 'kl.' HH:mm", { locale: da });
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: da });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const POST_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Kladde",
  REVIEW: "Til godkendelse",
  APPROVED: "Godkendt",
  SCHEDULED: "Planlagt",
  PUBLISHED: "Publiceret",
  ARCHIVED: "Arkiveret",
};

export const POST_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  PUBLISHED: "bg-purple-100 text-purple-800",
  ARCHIVED: "bg-red-50 text-red-700",
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  IMAGE: "Billede",
  VIDEO: "Video",
};
