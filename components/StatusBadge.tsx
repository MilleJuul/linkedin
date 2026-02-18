import { POST_STATUS_LABELS, POST_STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        POST_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"
      )}
    >
      {POST_STATUS_LABELS[status] ?? status}
    </span>
  );
}
